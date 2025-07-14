// supabase/functions/fetch-woocommerce-data/index.ts
// VERSIÓN 3: A PRUEBA DE FALLOS - OBTENIENDO PEDIDOS DIRECTAMENTE

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log("--- Iniciando fetch-woocommerce-data (Modo Directo) ---");

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: clients, error: clientsError } = await supabaseAdmin
      .from('clientes')
      .select('id, empresa, api_credentials!inner(access_token, refresh_token, extra_data)')
      .eq('api_credentials.platform', 'woocommerce');

    if (clientsError) throw clientsError;
    if (!clients || clients.length === 0) {
      console.log("No se encontraron clientes con credenciales de 'woocommerce'.");
      return new Response(JSON.stringify({ message: 'No clients to process.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    console.log(`Clientes encontrados para procesar: ${clients.length}`);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 45); // Rango de 45 días

    for (const client of clients) {
      console.log(`Procesando cliente: ${client.empresa}`);

      const wcCreds = client.api_credentials[0];
      const siteUrl = wcCreds.extra_data?.url;
      const consumerKey = wcCreds.access_token;
      const consumerSecret = wcCreds.refresh_token;

      if (!siteUrl || !consumerKey || !consumerSecret) {
        console.warn(`Credenciales incompletas para ${client.empresa}. Saltando.`);
        continue;
      }
      
      let allOrders = [];
      let page = 1;
      let hasMorePages = true;

      // 1. OBTENER TODOS LOS PEDIDOS COMPLETADOS (CON PAGINACIÓN)
      while (hasMorePages) {
        const ordersUrl = `${siteUrl}/wp-json/wc/v3/orders?status=completed&after=${startDate.toISOString()}&per_page=100&page=${page}`;
        
        const response = await fetch(ordersUrl, {
          headers: { 'Authorization': `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}` }
        });

        if (!response.ok) {
          console.error(`Error al obtener pedidos para ${client.empresa} en página ${page}: ${await response.text()}`);
          hasMorePages = false; // Detener si hay un error
          continue;
        }

        const ordersBatch = await response.json();
        
        if (ordersBatch.length > 0) {
          allOrders.push(...ordersBatch);
          page++;
        } else {
          hasMorePages = false; // No hay más pedidos, detener el bucle
        }
      }
      
      console.log(`Se encontraron ${allOrders.length} pedidos completados para ${client.empresa}.`);

      if (allOrders.length === 0) {
        console.log(`No hay pedidos nuevos para procesar para ${client.empresa}.`);
        continue;
      }

      // 2. AGRUPAR Y SUMAR LOS PEDIDOS POR DÍA
      const dailyTotals = allOrders.reduce((acc, order) => {
        const orderDate = order.date_created.split('T')[0]; // Obtiene 'YYYY-MM-DD'
        
        if (!acc[orderDate]) {
          acc[orderDate] = { total_sales: 0, net_sales: 0, total_orders: 0 };
        }
        
        acc[orderDate].total_sales += parseFloat(order.total);
        acc[orderDate].net_sales += (parseFloat(order.total) - parseFloat(order.total_tax) - parseFloat(order.shipping_total));
        acc[orderDate].total_orders += 1;
        
        return acc;
      }, {});

      // 3. PREPARAR LOS DATOS PARA GUARDAR EN SUPABASE
      const salesToUpsert = Object.keys(dailyTotals).map(dateString => ({
          cliente_id: client.id,
          date: dateString,
          total_sales: dailyTotals[dateString].total_sales,
          net_sales: dailyTotals[dateString].net_sales,
          total_orders: dailyTotals[dateString].total_orders
      }));
      
      console.log(`Se procesaron ${salesToUpsert.length} días con ventas para ${client.empresa}.`);

      // 4. GUARDAR EN LA BASE DE DATOS
      const { error: salesUpsertError } = await supabaseAdmin
        .from('wc_sales_cache')
        .upsert(salesToUpsert, { onConflict: 'cliente_id, date' });

      if (salesUpsertError) {
        console.error(`Error al guardar ventas para ${client.empresa}: ${salesUpsertError.message}`);
      } else {
        console.log(`Ventas de ${client.empresa} guardadas correctamente.`);
      }
    }

    return new Response(JSON.stringify({ status: 'ok', message: 'Proceso completado.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error fatal en la función:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});