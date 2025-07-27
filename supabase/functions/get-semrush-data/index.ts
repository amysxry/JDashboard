// /functions/get-semrush-data/index.ts - VERSIÓN SIMPLIFICADA (TOP KEYWORDS)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { domain, database } = await req.json();
    if (!domain || !database) {
      throw new Error('El dominio y la base de datos son requeridos.');
    }

    const apiKey = Deno.env.get('SEMRUSH_API_KEY');
    if (!apiKey) {
      throw new Error('No se encontró la SEMRUSH_API_KEY en los secrets.');
    }

    // Endpoint de Semrush para "Investigación Orgánica" (Top 10 Keywords)
    // Pedimos Keyword, Posición, Volumen de Búsqueda y la URL que posiciona
    const endpoint = `https://api.semrush.com/?type=domain_organic&key=${apiKey}&display_limit=10&export_columns=Ph,Po,Nq,Ur&domain=${domain}&database=${database}`;

    const apiResponse = await fetch(endpoint);

    if (!apiResponse.ok) {
      throw new Error(`Error de la API de Semrush: ${apiResponse.statusText}`);
    }

    const textData = await apiResponse.text();

    // Procesamos la respuesta de Semrush
    const lines = textData.trim().split('\n');
    if (lines.length < 2) { // Si no hay datos, solo vendrá el encabezado
        return new Response(JSON.stringify({ keywords: [] }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const headers = lines[0].split(';');
    const keywords = lines.slice(1).map(line => {
      const values = line.split(';');
      const keywordData: { [key: string]: string | number } = {};
      headers.forEach((header, index) => {
        const cleanHeader = header.replace(/"/g, '');
        keywordData[cleanHeader] = isNaN(Number(values[index])) ? values[index] : Number(values[index]);
      });
      return keywordData;
    });

    return new Response(JSON.stringify({ keywords }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});