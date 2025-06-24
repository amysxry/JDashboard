// supabase/functions/fetch-google-analytics-data/index.ts
// Este archivo contiene la Edge Function para obtener y almacenar datos de Google Analytics.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0';

// Importa GoogleAuth para la autenticación con la cuenta de servicio de Google
import { GoogleAuth } from 'npm:google-auth-library';

// --- Código para el manejo de cifrado/descifrado de secretos en la base de datos ---
// Este código es para la ENCRYPTION_KEY utilizada con tu tabla api_credentials (si la usaras para otros fines).
// No está directamente relacionado con la autenticación de Google Analytics con cuenta de servicio.
import { decode, encode } from 'https://deno.land/std@0.177.0/encoding/base64.ts';

const ENCRYPTION_KEY_HEX = Deno.env.get('ENCRYPTION_KEY');
if (!ENCRYPTION_KEY_HEX) {
  // Asegúrate de que esta variable de entorno esté configurada en Supabase > Secrets
  throw new Error('ENCRYPTION_KEY not set in environment variables');
}

const ENCRYPTION_KEY = await crypto.subtle.importKey('raw', decode(ENCRYPTION_KEY_HEX), {
  name: 'AES-GCM'
}, false, [
  'encrypt',
  'decrypt'
]);

async function encrypt(text: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const cipher = await crypto.subtle.encrypt({
    name: 'AES-GCM',
    iv: iv
  }, ENCRYPTION_KEY, encoded);
  const encryptedBytes = new Uint8Array(cipher);
  const combined = new Uint8Array(iv.length + encryptedBytes.length);
  combined.set(iv, 0);
  combined.set(encryptedBytes, iv.length);
  return encode(combined);
}

async function decrypt(encryptedBase64: string): Promise<string> {
  const combined = decode(encryptedBase64);
  const iv = combined.slice(0, 12);
  const encryptedBytes = combined.slice(12);
  const decipher = await crypto.subtle.decrypt({
    name: 'AES-GCM',
    iv: iv
  }, ENCRYPTION_KEY, encryptedBytes);
  return new TextDecoder().decode(decipher);
}
// --- Fin del código de cifrado ---


// --- Función para obtener el cliente de autenticación de Google con la cuenta de servicio ---
async function getAuthClient() {
    const serviceAccountKey = {
        client_email: Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL'),
        // Reemplaza los literales '\n' por saltos de línea reales en la clave privada
        // (La variable de entorno en Supabase a veces los guarda como texto)
        private_key: Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
    };

    // Validar que las variables de entorno de la cuenta de servicio no estén vacías
    if (!serviceAccountKey.client_email || !serviceAccountKey.private_key) {
        throw new Error('Variables de entorno de la cuenta de servicio de Google incompletas o no válidas.');
    }

    const auth = new GoogleAuth({
        credentials: {
            client_email: serviceAccountKey.client_email,
            private_key: serviceAccountKey.private_key,
        },
        scopes: ['https://www.googleapis.com/auth/analytics.readonly'], // Permiso para leer datos de Google Analytics
    });
    return auth.getClient();
}
// --- Fin de la función getAuthClient ---


// --- Función principal de la Edge Function (se ejecuta al ser invocada) ---
serve(async (req)=>{
  // Variables de entorno de Supabase
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  // --- Verificación inicial de todas las variables de entorno necesarias ---
  // Se ha eliminado la verificación de FUNCTION_INVOKE_SECRET aquí.
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL') || !Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')) {
    return new Response('Configuración incompleta: Variables de entorno de Supabase o cuenta de servicio faltan.', {
      status: 500
    });
  }

  // --- Lógica de SEGURIDAD: Se ha ELIMINADO la verificación del header 'x-invoke-secret'. ---
  // La función ya no requerirá este secreto para ser invocada.
  
  // --- Inicializa el cliente Supabase con el Service Role Key (permisos de administrador) ---
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false // No persistir la sesión, es una función sin estado
    }
  });
  
  try {
    // --- Autenticación con Google Analytics Data API usando la cuenta de servicio ---
    const authClient = await getAuthClient();
    const googleAccessToken = (await authClient.getAccessToken()).token;

    // console.log('Access Token (Service Account):', googleAccessToken); // Útil para depuración, pero QUITAR en producción

    const headers = {
        'Authorization': `Bearer ${googleAccessToken}`, // Token de acceso para Google API
        'Content-Type': 'application/json',
    };
    // --- Fin de la autenticación ---


    // --- FASE 2: Obtener clientes desde la base de datos de Supabase ---
    // Selecciona todos los clientes que tienen un 'ga_property_id' configurado
    const { data: clients, error: clientsError } = await supabaseAdmin
      .from('clientes')
      .select('id, ga_property_id')
      .not('ga_property_id', 'is', null); // Filtra los que NO tienen el ID de propiedad nulo

    if (clientsError) throw clientsError;

    if (!clients || clients.length === 0) {
      console.log('No se encontraron clientes con GA Property ID configurado para procesar.');
      return new Response(JSON.stringify({
        message: 'Procesado Google Analytics para 0 clientes (no se encontraron clientes con GA Property ID).',
        processedClients: []
      }), {
        headers: {
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }

    const processedClients = []; // Para llevar un registro de los clientes procesados

    // --- FASE 3: Procesar datos de GA para cada cliente ---
    for (const client of clients) {
      try {
        const propertyId = `properties/${client.ga_property_id}`; // Formato requerido por Google Analytics Data API
        
        // --- Definición del cuerpo de la solicitud a Google Analytics Data API ---
        const analyticsRequestBody = {
          metrics: [
            { name: 'sessions' },
            { name: 'activeUsers' },
            { name: 'conversions' },
            { name: 'bounceRate' },
            { name: 'averageSessionDuration' },
            { name: 'screenPageViews' }
          ],
          dimensions: [
            { name: 'date' } // Queremos los datos desglosados por fecha
          ],
          dateRanges: [
            { startDate: '30daysAgo', endDate: 'today' } // Rango de fechas: últimos 30 días hasta hoy
          ]
        };

        // console.log('Solicitud a Google Analytics:', JSON.stringify(analyticsRequestBody, null, 2)); // Útil para depuración

        // Realiza la solicitud a la API de Google Analytics Data
        const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`, {
          method: 'POST',
          headers: headers, // Usa los headers con el token de autenticación
          body: JSON.stringify(analyticsRequestBody) // Envía el cuerpo de la solicitud en formato JSON
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Error al obtener datos de GA para cliente ${client.id} (Propiedad: ${client.ga_property_id}):`, errorData);
          // Manejo de errores específicos de Google Analytics, por ejemplo, permisos
          if (errorData.error.code === 401 || errorData.error.status === 'UNAUTHENTICATED') {
            console.error(`Token inválido o expirado al acceder a propiedad ${client.ga_property_id}. Asegúrate de que la cuenta de servicio tenga los permisos correctos en Google Analytics.`);
          }
          continue; // Pasa al siguiente cliente si hay un error con este
        }

        const gaData = await response.json();
        const rows = gaData.rows || [];

        // Mapea los datos recibidos de GA al formato de tu tabla 'ga_metrics_cache'
        const recordsToUpsert = rows.map((row)=>({
          cliente_id: client.id,
          date: `${row.dimensionValues[0].value.substring(0, 4)}-${row.dimensionValues[0].value.substring(4, 6)}-${row.dimensionValues[0].value.substring(6, 8)}`, // Formato 'YYYY-MM-DD'
          sessions: parseInt(row.metricValues[0].value),
          users: parseInt(row.metricValues[1].value),
          conversions: parseInt(row.metricValues[2].value),
          bounce_rate: parseFloat(row.metricValues[3].value),
          avg_session_duration: parseFloat(row.metricValues[4].value),
          page_views: parseInt(row.metricValues[5].value),
          updated_at: new Date().toISOString() // Marca de tiempo de la última actualización
        }));

        // Si hay registros para insertar/actualizar
        if (recordsToUpsert.length > 0) {
          // Realiza un UPSERT (INSERT O UPDATE) en la tabla 'ga_metrics_cache'
          // 'onConflict: 'cliente_id,date'' significa que si ya existe una fila con el mismo cliente_id y fecha, se actualizará
          const { error: upsertError } = await supabaseAdmin
            .from('ga_metrics_cache')
            .upsert(recordsToUpsert, { onConflict: 'cliente_id,date' });

          if (upsertError) {
            console.error(`Error al guardar datos de GA en caché para cliente ${client.id}:`, upsertError);
            continue; // Pasa al siguiente cliente si hay un error al guardar
          }
          console.log(`Datos de GA actualizados para cliente ${client.id} (Propiedad: ${client.ga_property_id}).`);
          processedClients.push(client.id); // Añade el cliente a la lista de procesados
        } else {
          console.log(`No se encontraron datos de GA para actualizar para cliente ${client.id} (Propiedad: ${client.ga_property_id}).`);
        }
      } catch (clientProcessError: any) { // Captura errores específicos por cliente
        console.error(`Error al procesar datos para cliente ${client.id}:`, clientProcessError.message);
      }
    }

    // --- Respuesta final de la Edge Function ---
    return new Response(JSON.stringify({
      message: `Procesado Google Analytics para ${processedClients.length} clientes.`,
      processedClients: processedClients
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200 // Estado OK
    });

  } catch (error: any) { // Captura errores generales de la función
    console.error('Error general en fetch-google-analytics-data:', error.message);
    return new Response(JSON.stringify({
      error: 'Error interno del servidor al procesar datos de Google Analytics.',
      details: error.message
    }), {
      status: 500, // Estado de error interno del servidor
      headers: { 'Content-Type': 'application/json' }
    });
  }
});