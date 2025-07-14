// supabase/functions/fetch-google-analytics-data/index.ts
// VERSIÓN CORREGIDA - CON TODAS LAS TAREAS DE CACHÉ

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
                const dateRange30Days = { startDate: '30daysAgo', endDate: 'today' };

                // --- TAREA 1: OBTENER MÉTRICAS DIARIAS GENERALES ---
                console.log(`[Cliente ${client.id}] Obteniendo métricas diarias generales...`);
                const analyticsRequestBody = {
                    metrics: [
                        { name: 'sessions' }, { name: 'activeUsers' }, { name: 'conversions' },
                        { name: 'bounceRate' }, { name: 'averageSessionDuration' }, { name: 'screenPageViews' }
                    ],
                    dimensions: [{ name: 'date' }],
                    dateRanges: [dateRange30Days]
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
                        console.log(`[Cliente ${client.id}] TAREA 1 COMPLETADA: Métricas diarias guardadas.`);
                    }
                }

                // --- TAREA 2: OBTENER DESGLOSE DE CONVERSIONES POR NOMBRE ---
                console.log(`[Cliente ${client.id}] Obteniendo desglose de conversiones...`);
                const conversionsRequestBody = {
                    metrics: [{ name: 'conversions' }],
                    dimensions: [{ name: 'date' }, { name: 'eventName' }],
                    dateRanges: [dateRange30Days],
                    dimensionFilter: {
                        filter: {
                            fieldName: 'isConversionEvent',
                            stringFilter: { matchType: 'EXACT', value: 'true' }
                        }
                    }
                };

                const responseConversions = await fetch(`https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`, {
                    method: 'POST', headers, body: JSON.stringify(conversionsRequestBody)
                });

                if (!responseConversions.ok) {
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
                        console.log(`[Cliente ${client.id}] TAREA 2 COMPLETADA: Desglose de conversiones guardado.`);
                    }
                }

                // --- INICIA TAREA 3: OBTENER USUARIOS POR DISPOSITIVO ---
                console.log(`[Cliente ${client.id}] Obteniendo usuarios por dispositivo...`);
                const deviceRequestBody = {
                    metrics: [{ name: 'activeUsers' }],
                    dimensions: [{ name: 'date' }, { name: 'deviceCategory' }],
                    dateRanges: [dateRange30Days],
                };
                const responseDevice = await fetch(`https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`, {
                    method: 'POST', headers, body: JSON.stringify(deviceRequestBody)
                });
                if (!responseDevice.ok) {
                    console.error(`[Cliente ${client.id}] Error en usuarios por dispositivo:`, await responseDevice.json());
                } else {
                    const gaDeviceData = await responseDevice.json();
                    const deviceRows = gaDeviceData.rows || [];
                    const deviceRecordsToUpsert = deviceRows.map((row) => ({
                        cliente_id: client.id,
                        date: `${row.dimensionValues[0].value.substring(0, 4)}-${row.dimensionValues[0].value.substring(4, 6)}-${row.dimensionValues[0].value.substring(6, 8)}`,
                        device: row.dimensionValues[1].value, // 'Desktop', 'Mobile', 'Tablet'
                        users: parseInt(row.metricValues[0].value, 10),
                    }));
                    if (deviceRecordsToUpsert.length > 0) {
                        const { error: upsertError } = await supabaseAdmin
                            .from('ga_device_cache')
                            .upsert(deviceRecordsToUpsert, { onConflict: 'cliente_id,date,device' });
                        if (upsertError) throw upsertError;
                        console.log(`[Cliente ${client.id}] TAREA 3 COMPLETADA: Datos de dispositivos guardados.`);
                    }
                }
                // --- FIN TAREA 3 ---

                // --- INICIA TAREA 4: OBTENER USUARIOS POR CANAL ---
                console.log(`[Cliente ${client.id}] Obteniendo usuarios por canal...`);
                const channelRequestBody = {
                    metrics: [{ name: 'activeUsers' }],
                    dimensions: [{ name: 'date' }, { name: 'sessionDefaultChannelGroup' }],
                    dateRanges: [dateRange30Days],
                };
                const responseChannel = await fetch(`https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`, {
                    method: 'POST', headers, body: JSON.stringify(channelRequestBody)
                });
                if (!responseChannel.ok) {
                    console.error(`[Cliente ${client.id}] Error en usuarios por canal:`, await responseChannel.json());
                } else {
                    const gaChannelData = await responseChannel.json();
                    const channelRows = gaChannelData.rows || [];
                    const channelRecordsToUpsert = channelRows.map((row) => ({
                        cliente_id: client.id,
                        date: `${row.dimensionValues[0].value.substring(0, 4)}-${row.dimensionValues[0].value.substring(4, 6)}-${row.dimensionValues[0].value.substring(6, 8)}`,
                        channel: row.dimensionValues[1].value,
                        users: parseInt(row.metricValues[0].value, 10),
                    }));
                    if (channelRecordsToUpsert.length > 0) {
                        const { error: upsertError } = await supabaseAdmin
                            .from('ga_channel_cache')
                            .upsert(channelRecordsToUpsert, { onConflict: 'cliente_id,date,channel' });
                        if (upsertError) throw upsertError;
                        console.log(`[Cliente ${client.id}] TAREA 4 COMPLETADA: Datos de canales guardados.`);
                    }
                }
                // --- FIN TAREA 4 ---

                // --- INICIA TAREA 5: OBTENER DATOS DE PÁGINAS ---
                console.log(`[Cliente ${client.id}] Obteniendo datos de páginas...`);
                const pagesRequestBody = {
                    metrics: [{ name: 'screenPageViews' }, { name: 'averageSessionDuration' }],
                    dimensions: [{ name: 'date' }, { name: 'pagePath' }],
                    dateRanges: [dateRange30Days],
                };
                const responsePages = await fetch(`https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`, {
                    method: 'POST', headers, body: JSON.stringify(pagesRequestBody)
                });
                if (!responsePages.ok) {
                    console.error(`[Cliente ${client.id}] Error en datos de páginas:`, await responsePages.json());
                } else {
                    const gaPagesData = await responsePages.json();
                    const pagesRows = gaPagesData.rows || [];
                    const pagesRecordsToUpsert = pagesRows.map((row) => ({
                        cliente_id: client.id,
                        date: `${row.dimensionValues[0].value.substring(0, 4)}-${row.dimensionValues[0].value.substring(4, 6)}-${row.dimensionValues[0].value.substring(6, 8)}`,
                        page_path: row.dimensionValues[1].value,
                        page_views: parseInt(row.metricValues[0].value, 10),
                        avg_time_on_page: parseFloat(row.metricValues[1].value),
                    }));
                    if (pagesRecordsToUpsert.length > 0) {
                        const { error: upsertError } = await supabaseAdmin
                            .from('ga_pages_cache')
                            .upsert(pagesRecordsToUpsert, { onConflict: 'cliente_id,date,page_path' });
                        if (upsertError) throw upsertError;
                        console.log(`[Cliente ${client.id}] TAREA 5 COMPLETADA: Datos de páginas guardados.`);
                    }
                }
                // --- FIN TAREA 5 ---

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