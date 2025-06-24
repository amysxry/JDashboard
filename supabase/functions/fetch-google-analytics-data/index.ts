// supabase/functions/fetch-google-analytics-data/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0';

import { GoogleAuth } from 'npm:google-auth-library';

import { decode, encode } from 'https://deno.land/std@0.177.0/encoding/base64.ts';

const ENCRYPTION_KEY_HEX = Deno.env.get('ENCRYPTION_KEY');
if (!ENCRYPTION_KEY_HEX) {
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

async function getAuthClient() {
    const serviceAccountKey = {
        client_email: Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL'),
        private_key: Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
    };

    if (!serviceAccountKey.client_email || !serviceAccountKey.private_key) {
        throw new Error('Variables de entorno de la cuenta de servicio de Google incompletas o no válidas.');
    }

    const auth = new GoogleAuth({
        credentials: {
            client_email: serviceAccountKey.client_email,
            private_key: serviceAccountKey.private_key,
        },
        scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    });
    return auth.getClient();
}

serve(async (req)=>{
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  // --- NUEVO: Variable de entorno para el secreto de invocación ---
  const FUNCTION_INVOKE_SECRET = Deno.env.get('FUNCTION_INVOKE_SECRET');
  // --- FIN NUEVO ---

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL') || !Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY') || !FUNCTION_INVOKE_SECRET) { // --- NUEVO: Añadir verificación de FUNCTION_INVOKE_SECRET ---
    return new Response('Configuración incompleta: Variables de entorno de Supabase, cuenta de servicio o secreto de invocación faltan.', { // --- NUEVO: Mensaje de error actualizado ---
      status: 500
    });
  }

  // --- NUEVO: Lógica de seguridad para el secreto de invocación ---
  const requestHeaders = Object.fromEntries(req.headers.entries());
  if (requestHeaders['x-invoke-secret'] !== FUNCTION_INVOKE_SECRET) {
      console.error('Intento de invocación no autorizado a fetch-google-analytics-data. Header x-invoke-secret incorrecto o ausente.');
      return new Response('No autorizado.', { status: 401 });
  }
  // --- FIN NUEVO ---

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false
    }
  });
  
  try {
    const authClient = await getAuthClient();
    const googleAccessToken = (await authClient.getAccessToken()).token;

    console.log('Access Token (Service Account):', googleAccessToken); // Puedes quitar esto en producción

    const headers = {
        'Authorization': `Bearer ${googleAccessToken}`,
        'Content-Type': 'application/json',
    };

    const { data: clients, error: clientsError } = await supabaseAdmin
      .from('clientes')
      .select('id, ga_property_id')
      .not('ga_property_id', 'is', null);

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

    const processedClients = [];

    for (const client of clients) {
      try {
        const propertyId = `properties/${client.ga_property_id}`;
        
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
            { name: 'date' }
          ],
          dateRanges: [
            { startDate: '30daysAgo', endDate: 'today' } // --- YA TENÍAS ESTE CAMBIO, LO MANTENEMOS ---
          ]
        };

        console.log('Solicitud a Google Analytics:', JSON.stringify(analyticsRequestBody, null, 2));

        const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(analyticsRequestBody)
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Error al obtener datos de GA para cliente ${client.id} (Propiedad: ${client.ga_property_id}):`, errorData);
          if (errorData.error.code === 401 || errorData.error.status === 'UNAUTHENTICATED') {
            console.error(`Token inválido o expirado al acceder a propiedad ${client.ga_property_id}. Asegúrate de que la cuenta de servicio tenga permisos.`);
          }
          continue;
        }

        const gaData = await response.json();
        const rows = gaData.rows || [];

        const recordsToUpsert = rows.map((row)=>({
          cliente_id: client.id,
          date: `${row.dimensionValues[0].value.substring(0, 4)}-${row.dimensionValues[0].value.substring(4, 6)}-${row.dimensionValues[0].value.substring(6, 8)}`,
          sessions: parseInt(row.metricValues[0].value),
          users: parseInt(row.metricValues[1].value),
          conversions: parseInt(row.metricValues[2].value),
          bounce_rate: parseFloat(row.metricValues[3].value),
          avg_session_duration: parseFloat(row.metricValues[4].value),
          page_views: parseInt(row.metricValues[5].value),
          updated_at: new Date().toISOString()
        }));

        if (recordsToUpsert.length > 0) {
          const { error: upsertError } = await supabaseAdmin
            .from('ga_metrics_cache')
            .upsert(recordsToUpsert, { onConflict: 'cliente_id,date' });

          if (upsertError) {
            console.error(`Error al guardar datos de GA en caché para cliente ${client.id}:`, upsertError);
            continue;
          }
          console.log(`Datos de GA actualizados para cliente ${client.id} (Propiedad: ${client.ga_property_id}).`);
          processedClients.push(client.id);
        } else {
          console.log(`No se encontraron datos de GA para actualizar para cliente ${client.id} (Propiedad: ${client.ga_property_id}).`);
        }
      } catch (clientProcessError) {
        console.error(`Error al procesar datos para cliente ${client.id}:`, clientProcessError.message);
      }
    }

    return new Response(JSON.stringify({
      message: `Procesado Google Analytics para ${processedClients.length} clientes.`,
      processedClients: processedClients
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error('Error general en fetch-google-analytics-data:', error.message);
    return new Response(JSON.stringify({
      error: 'Error interno del servidor al procesar datos de Google Analytics.',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});