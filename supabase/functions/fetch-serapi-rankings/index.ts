// supabase/functions/fetch-serapi-rankings/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// Asegúrate de que este archivo exista y contenga los encabezados CORS
import { corsHeaders } from '../_shared/cors.ts'; 

// La clave 'serapi' en api_credentials debe tener cliente_id=NULL
// La tabla seo_rankings debe tener una PK en (cliente_id, keyword, domain)

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    console.log("--- Iniciando fetch-serapi-rankings ---");

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '', 
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 1. Obtener la clave de la API de SerAPI
        // Buscamos la credencial global donde cliente_id es NULL
        const { data: serApiCreds, error: credsError } = await supabaseAdmin
            .from('api_credentials')
            .select('access_token')
            .eq('platform', 'serapi')
            .is('cliente_id', null) // Filtrar por credenciales globales
            .single();

        if (credsError || !serApiCreds) {
            console.error('❌ Error al obtener clave de SerAPI:', credsError?.message);
            throw new Error(`Error al obtener clave de SerAPI: ${credsError?.message || 'No se encontró la clave. ¿Está insertada y con cliente_id=NULL?'}`);
        }
        const apiKey = serApiCreds.access_token;
        
        // 2. Obtener TODAS las palabras clave y dominios a monitorear
        const { data: allKeywords, error: keywordsError } = await supabaseAdmin
            .from('seo_rankings')
            .select('cliente_id, keyword, domain, position'); 

        if (keywordsError) throw keywordsError;
        
        if (!allKeywords || allKeywords.length === 0) {
            return new Response(JSON.stringify({ message: 'No hay palabras clave para monitorear.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        
        console.log(`Palabras clave encontradas para procesar: ${allKeywords.length}`);

        let keywordsToUpsert = [];
        let totalSearches = 0;
        
        // 3. Agrupar por CLIENTE y DOMINIO
        const clientsToProcess = allKeywords.reduce((acc, kw) => {
            // Usamos domain como parte de la clave para la agrupación de búsqueda
            const key = `${kw.cliente_id}_${kw.domain}`; 
            if (!acc[key]) {
                acc[key] = {
                    cliente_id: kw.cliente_id,
                    domain: kw.domain,
                    keywords: [],
                    old_positions: {}
                };
            }
            acc[key].keywords.push(kw.keyword);
            acc[key].old_positions[kw.keyword] = kw.position;
            return acc;
        }, {} as Record<string, { cliente_id: string, domain: string, keywords: string[], old_positions: Record<string, number> }>);


        // 4. Iterar y llamar a SerAPI
        for (const key in clientsToProcess) {
            const clientData = clientsToProcess[key];
            
            // SerAPI no soporta buscar múltiples KW directamente con el parámetro 'q'.
            // Para mantener el código simple y dentro del límite de 250, iteraremos por cada keyword.
            
            for (const kw of clientData.keywords) {
                const query = encodeURIComponent(kw);

                // IMPORTANTE: Definimos la ubicación y el dominio de Google
                const serapiUrl = `https://serpapi.com/search.json?engine=google&q=${query}&api_key=${apiKey}&location=Mexico&google_domain=google.com.mx`;
                
                console.log(`🔎 Buscando KW: "${kw}" para ${clientData.domain}...`);
                totalSearches += 1;

                const response = await fetch(serapiUrl);
                const data = await response.json();

                if (data.error) {
                    console.error(`Error de SerAPI para KW "${kw}": ${data.error}`);
                    continue;
                }

                // 5. Procesar el resultado
                const organicResults = data.organic_results || [];

                // Buscar el ranking del dominio específico
                let newPosition = 101; // Posición por defecto si no se encuentra
                
                const foundResult = organicResults.find(r => {
                    // Normalizar y buscar el dominio
                    const urlDomain = new URL(r.link).hostname.replace(/^www\./, '');
                    const targetDomain = clientData.domain.replace(/^www\./, '');
                    return urlDomain === targetDomain;
                });
                
                if (foundResult) {
                    newPosition = foundResult.position;
                }
                
                keywordsToUpsert.push({
                    cliente_id: clientData.cliente_id,
                    keyword: kw,
                    domain: clientData.domain, 
                    position: newPosition,
                    previous_position: clientData.old_positions[kw] // Posición anterior
                });
            }
        }
        
        console.log(`Total de búsquedas realizadas: ${totalSearches}. Resultados procesados: ${keywordsToUpsert.length}`);

        // 6. Guardar los datos en la base de datos (UPSERT)
        if (keywordsToUpsert.length > 0) {
            // Usamos la clave primaria compuesta que definimos: cliente_id, keyword, domain
            const { error: upsertError } = await supabaseAdmin
                .from('seo_rankings')
                .upsert(keywordsToUpsert, { 
                    onConflict: 'cliente_id, keyword, domain', 
                    ignoreDuplicates: false 
                });

            if (upsertError) {
                console.error('❌ Error al guardar rankings:', upsertError.message);
                throw upsertError;
            }
            console.log(`✅ ${keywordsToUpsert.length} rankings actualizados correctamente.`);
        }

        return new Response(JSON.stringify({ status: 'ok', message: `Proceso completado. Total de búsquedas: ${totalSearches}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Error fatal en la función:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        });
    }
});