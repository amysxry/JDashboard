// supabase/functions/fetch-google-ads-data/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { GoogleAuth } from 'npm:google-auth-library';

// Función para obtener el cliente de autenticación de Google
async function getAuthClient() {
  const serviceAccountKey = {
    client_email: Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL'),
    private_key: Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
  };
  if (!serviceAccountKey.client_email || !serviceAccountKey.private_key) {
    throw new Error('Google service account credentials not found in environment variables.');
  }
  const auth = new GoogleAuth({
    credentials: serviceAccountKey,
    scopes: ['https://www.googleapis.com/auth/adwords'],
  });
  return auth.getClient();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("--- Iniciando fetch-google-ads-data ---");

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SERVICE_ROLE_KEY') ?? '');
    const authClient = await getAuthClient();
    const googleAccessToken = (await authClient.getAccessToken()).token;

    // Obtener el ID de desarrollador de las variables de entorno
    const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
    if (!developerToken) {
      throw new Error('GOOGLE_ADS_DEVELOPER_TOKEN is not set.');
    }

    // Obtener el ID de la cuenta de administrador (MCC)
    const { data: managerCreds } = await supabaseAdmin
      .from('api_credentials')
      .select('extra_data')
      .eq('platform', 'google_ads_manager')
      .single();

    const loginCustomerId = managerCreds?.extra_data?.login_customer_id;
    if (!loginCustomerId) {
      throw new Error('login_customer_id for the manager account not found in api_credentials.');
    }

    const { data: clients, error: clientsError } = await supabaseAdmin
      .from('clientes')
      .select('id, ads_customer_id')
      .not('ads_customer_id', 'is', null);

    if (clientsError) throw clientsError;
    console.log(`Encontrados ${clients.length} clientes con ID de Google Ads.`);

    for (const client of clients) {
      const customerId = client.ads_customer_id.replace(/-/g, ''); // Remover guiones
      console.log(`Procesando cliente ID: ${customerId}`);

      const query = `
        SELECT 
          segments.date, 
          metrics.impressions, 
          metrics.clicks, 
          metrics.cost_micros, 
          metrics.conversions,
          metrics.ctr,
          metrics.average_cpc
        FROM customer 
        WHERE segments.date DURING LAST_30_DAYS`;
      
      const requestBody = { query };

      const response = await fetch(`https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:searchStream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${googleAccessToken}`,
          'developer-token': developerToken,
          'login-customer-id': loginCustomerId,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error al obtener datos para el cliente ${customerId}:`, errorText);
        continue;
      }

      const responseData = await response.json();
      if (!responseData || !responseData[0]?.results) {
        console.log(`No se encontraron resultados para el cliente ${customerId}.`);
        continue;
      }

      const recordsToUpsert = responseData[0].results.map((row: any) => ({
        cliente_id: client.id,
        date: row.segments.date,
        impressions: row.metrics.impressions,
        clicks: row.metrics.clicks,
        cost_micros: row.metrics.costMicros,
        conversions: row.metrics.conversions,
        ctr: row.metrics.ctr,
        cpc_micros: row.metrics.averageCpc,
      }));

      if (recordsToUpsert.length > 0) {
        const { error: upsertError } = await supabaseAdmin
          .from('ads_performance_cache')
          .upsert(recordsToUpsert, { onConflict: 'cliente_id, date' });

        if (upsertError) {
          console.error(`Error al guardar datos para ${customerId}:`, upsertError);
        } else {
          console.log(`Datos de ${recordsToUpsert.length} días guardados para el cliente ${customerId}.`);
        }
      }
    }

    return new Response(JSON.stringify({ status: 'ok', message: 'Proceso de Google Ads completado.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error fatal en la función fetch-google-ads-data:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});