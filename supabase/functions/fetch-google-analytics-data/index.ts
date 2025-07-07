// supabase/functions/fetch-google-analytics-data/index.ts
// VERSIÓN FINAL v2 - CON CORRECCIÓN EN EL FILTRO DE CONVERSIONES

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0';
import { GoogleAuth } from 'npm:google-auth-library';

async function getAuthClient() {
    const serviceAccountKey = {
        client_email: Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL'),
        private_key: Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
    };
    if (!serviceAccountKey.client_email || !serviceAccountKey.private_key) {
        throw new Error('Variables de entorno de la cuenta de servicio de Google incompletas.');
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

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL') || !Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')) {
        return new Response('Configuración incompleta: Variables de entorno faltan.', { status: 500 });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false }
    });

    try {
        const authClient = await getAuthClient();
        const googleAccessToken = (await authClient.getAccessToken()).token;

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
            return new Response(JSON.stringify({ message: 'No se encontraron clientes con GA Property ID.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        const processedClients = [];

        for (const client of clients) {
            try {
                const propertyId = `properties/${client.ga_property_id}`;

                // --- TAREA 1: OBTENER MÉTRICAS DIARIAS GENERALES ---
                console.log(`[Cliente ${client.id}] Obteniendo métricas diarias generales...`);
                const analyticsRequestBody = {
                    metrics: [
                        { name: 'sessions' }, { name: 'activeUsers' }, { name: 'conversions' },
                        { name: 'bounceRate' }, { name: 'averageSessionDuration' }, { name: 'screenPageViews' }
                    ],
                    dimensions: [{ name: 'date' }],
                    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }]
                };

                const responseMetrics = await fetch(`https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`, {
                    method: 'POST', headers, body: JSON.stringify(analyticsRequestBody)
                });

                if (!responseMetrics.ok) {
                    console.error(`[Cliente ${client.id}] Error en métricas diarias:`, await responseMetrics.json());
                } else {
                    const gaData = await responseMetrics.json();
                    const rows = gaData.rows || [];
                    const recordsToUpsert = rows.map((row) => ({
                        cliente_id: client.id,
                        date: `${row.dimensionValues[0].value.substring(0, 4)}-${row.dimensionValues[0].value.substring(4, 6)}-${row.dimensionValues[0].value.substring(6, 8)}`,
                        sessions: parseInt(row.metricValues[0].value, 10),
                        users: parseInt(row.metricValues[1].value, 10),
                        conversions: parseInt(row.metricValues[2].value, 10),
                        bounce_rate: parseFloat(row.metricValues[3].value),
                        avg_session_duration: parseFloat(row.metricValues[4].value),
                        page_views: parseInt(row.metricValues[5].value),
                    }));

                    if (recordsToUpsert.length > 0) {
                        const { error: upsertError } = await supabaseAdmin
                            .from('ga_metrics_cache')
                            .upsert(recordsToUpsert, { onConflict: 'cliente_id,date' });
                        if (upsertError) throw upsertError;
                        console.log(`[Cliente ${client.id}] TAREA 1 COMPLETADA: Métricas diarias guardadas en 'ga_metrics_cache'.`);
                    }
                }

                // --- TAREA 2: OBTENER DESGLOSE DE CONVERSIONES POR NOMBRE ---
                console.log(`[Cliente ${client.id}] Obteniendo desglose de conversiones...`);
                const conversionsRequestBody = {
                    metrics: [{ name: 'conversions' }],
                    dimensions: [{ name: 'date' }, { name: 'eventName' }],
                    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
                    // --- INICIO DE LA CORRECCIÓN ---
                    dimensionFilter: {
                        filter: {
                            fieldName: 'isConversionEvent',
                            stringFilter: {
                                matchType: 'EXACT',
                                value: 'true'
                            }
                        }
                    }
                    // --- FIN DE LA CORRECCIÓN ---
                };

                const responseConversions = await fetch(`https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`, {
                    method: 'POST', headers, body: JSON.stringify(conversionsRequestBody)
                });

                if (!responseConversions.ok) {
                    // Este error ya no debería aparecer con el filtro corregido
                    console.error(`[Cliente ${client.id}] Error en desglose de conversiones:`, await responseConversions.json());
                } else {
                    const gaConversionsData = await responseConversions.json();
                    const conversionRows = gaConversionsData.rows || [];
                    const conversionsToUpsert = conversionRows.map((row) => ({
                        cliente_id: client.id,
                        date: `${row.dimensionValues[0].value.substring(0, 4)}-${row.dimensionValues[0].value.substring(4, 6)}-${row.dimensionValues[0].value.substring(6, 8)}`,
                        conversion_name: row.dimensionValues[1].value,
                        conversion_count: parseInt(row.metricValues[0].value, 10),
                    }));

                    if (conversionsToUpsert.length > 0) {
                        const { error: upsertError } = await supabaseAdmin
                            .from('ga_conversions_cache')
                            .upsert(conversionsToUpsert, { onConflict: 'cliente_id,date,conversion_name' });
                        if (upsertError) throw upsertError;
                        console.log(`[Cliente ${client.id}] TAREA 2 COMPLETADA: Desglose de conversiones guardado en 'ga_conversions_cache'.`);
                    } else {
                        console.log(`[Cliente ${client.id}] TAREA 2: No se encontraron conversiones desglosadas para guardar.`);
                    }
                }

                processedClients.push(client.id);

            } catch (clientProcessError: any) {
                console.error(`Error procesando cliente ${client.id}:`, clientProcessError.message);
            }
        }

        return new Response(JSON.stringify({ message: `Procesado Google Analytics para ${processedClients.length} clientes.`, processedClients }), {
            headers: { 'Content-Type': 'application/json' }, status: 200
        });

    } catch (error: any) {
        console.error('Error general en la Edge Function:', error.message);
        return new Response(JSON.stringify({ error: 'Error interno del servidor.', details: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' }
        });
    }
});