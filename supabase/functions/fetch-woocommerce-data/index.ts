// supabase/functions/fetch-woocommerce-data/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    );

    const { data: clients, error: clientsError } = await supabaseAdmin
      .from('clientes')
      .select('id, empresa, api_credentials(access_token, refresh_token, extra_data)')
      .eq('api_credentials.platform', 'woocommerce');

    if (clientsError) throw clientsError;

    const logs = [];

    for (const client of clients) {
      if (!client.api_credentials || client.api_credentials.length === 0) {
        logs.push(`Cliente ${client.empresa} no tiene credenciales de WooCommerce. Saltando.`);
        continue;
      }

      const wcCreds = client.api_credentials[0];
      const siteUrl = wcCreds.extra_data?.url;
      const consumerKey = wcCreds.access_token;
      const consumerSecret = wcCreds.refresh_token;

      if (!siteUrl || !consumerKey || !consumerSecret) {
        logs.push(`Credenciales incompletas para el cliente ${client.empresa}. Saltando.`);
        continue;
      }

      const salesReportUrl = `${siteUrl}/wp-json/wc/v3/reports/sales?period=month`;
      const salesResponse = await fetch(salesReportUrl, {
        headers: { 'Authorization': `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}` }
      });

      if (!salesResponse.ok) {
         logs.push(`Error al obtener ventas para ${client.empresa}: ${await salesResponse.text()}`);
         continue;
      }

      const salesData = await salesResponse.json();

      // --- LÓGICA DE PROCESAMIENTO CORREGIDA ---
      // Verificamos si la respuesta tiene el formato esperado
      if (!salesData || salesData.length === 0 || !salesData[0].totals) {
        logs.push(`Respuesta de WooCommerce para ${client.empresa} no tiene el formato esperado o no contiene datos.`);
        continue;
      }

      // Extraemos el objeto `totals` que contiene los datos por día
      const dailyTotals = salesData[0].totals;

      // Convertimos el objeto de totales en un array que nuestra base de datos pueda entender
      const salesToUpsert = Object.keys(dailyTotals).map(dateString => {
        const dailyReport = dailyTotals[dateString];
        return {
          cliente_id: client.id,
          date: dateString, // La llave del objeto es la fecha
          total_sales: dailyReport.sales,
          net_sales: dailyReport.sales, // La API no desglosa net_sales por día, usamos el total como aproximación
          total_orders: dailyReport.orders
        };
      });

      if (salesToUpsert.length === 0) {
        logs.push(`No se encontraron datos diarios para procesar para ${client.empresa}.`);
        continue;
      }
        
      const { error: salesUpsertError } = await supabaseAdmin
        .from('wc_sales_cache')
        .upsert(salesToUpsert, { onConflict: 'cliente_id, date' });

      if (salesUpsertError) {
        logs.push(`Error al guardar ventas para ${client.empresa}: ${salesUpsertError.message}`);
      } else {
        logs.push(`Ventas de ${client.empresa} para ${salesToUpsert.length} días guardadas correctamente.`);
      }
    }

    return new Response(JSON.stringify({ status: 'ok', logs }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});