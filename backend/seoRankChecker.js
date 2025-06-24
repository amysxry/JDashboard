// backend/seoRankChecker.js

// Carga las variables de entorno del archivo .env
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const { getJson } = require("serpapi"); // Importa la función getJson de serpapi

// Inicializa Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Error: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están configuradas en .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY;

if (!SERPAPI_API_KEY) {
    console.error("Error: SERPAPI_API_KEY no está configurada en .env");
    process.exit(1);
}

/**
 * Obtiene los rankings de SEO para todas las palabras clave monitoreadas
 * y las guarda en la base de datos de Supabase.
 */
async function main() {
    console.log("Iniciando la verificación de rankings SEO...");

    try {
        // 1. Obtener todas las palabras clave a monitorear de Supabase
        // Unir con la tabla `clientes` para asegurar que solo obtenemos palabras clave de clientes activos
        const { data: monitoredKeywords, error: keywordsError } = await supabase
            .from('monitored_keywords')
            .select(`
                id,
                keyword,
                target_url,
                search_engine,
                location,
                device,
                cliente_id
            `);

        if (keywordsError) {
            console.error('Error al obtener palabras clave monitoreadas:', keywordsError);
            return;
        }

        if (monitoredKeywords.length === 0) {
            console.log("No se encontraron palabras clave para monitorear.");
            return;
        }

        console.log(`Encontradas ${monitoredKeywords.length} palabras clave para procesar.`);

        for (const keywordData of monitoredKeywords) {
            const { id: keywordId, keyword, target_url, search_engine, location, device, cliente_id } = keywordData;

            try {
                console.log(`Procesando palabra clave: "${keyword}" para cliente ${cliente_id}`);

                // 2. Consultar SerpAPI para el ranking actual
                const params = {
                    engine: search_engine || "google", // Por defecto Google
                    q: keyword,
                    location: location || "Tijuana, Baja California, Mexico", // Ubicación por defecto si no se especifica
                    device: device || "desktop", // Dispositivo por defecto
                    api_key: SERPAPI_API_KEY,
                };

                const json = await getJson("google", params); // O el engine dinámico de params.engine

                let currentPosition = null;
                // Buscar la URL del cliente en los resultados orgánicos
                if (json["organic_results"]) {
                    for (let i = 0; i < json["organic_results"].length; i++) {
                        const result = json["organic_results"][i];
                        // Un simple "includes" es suficiente para verificar si la URL del cliente está en el dominio del resultado
                        if (result.link && result.link.includes(target_url)) {
                            currentPosition = i + 1; // La posición es el índice + 1
                            break;
                        }
                    }
                }

                if (currentPosition === null) {
                    console.log(`  -> URL '<span class="math-inline">\{target\_url\}' no encontrada para "</span>{keyword}". Posición: N/A`);
                } else {
                    console.log(`  -> Posición actual de "<span class="math-inline">\{keyword\}" para '</span>{target_url}': ${currentPosition}`);
                }

                // 3. Obtener la posición anterior para esta palabra clave
                const { data: previousRanking, error: prevRankingError } = await supabase
                    .from('seo_rankings')
                    .select('position')
                    .eq('keyword_id', keywordId)
                    .eq('cliente_id', cliente_id)
                    .order('created_at', { ascending: false }) // Ordenar para obtener el más reciente
                    .limit(1)
                    .single(); // Obtener un solo resultado

                let previousPosition = null;
                if (prevRankingError && prevRankingError.code !== 'PGRST116') { // PGRST116 es "No rows found"
                    console.error(`Error al obtener posición anterior para ${keyword}:`, prevRankingError);
                    // No retornamos, para que intente insertar el ranking actual de todas formas
                } else if (previousRanking) {
                    previousPosition = previousRanking.position;
                    console.log(`  -> Posición anterior: ${previousPosition}`);
                } else {
                    console.log("  -> No se encontró posición anterior.");
                }

                // 4. Insertar el nuevo ranking en la tabla seo_rankings
                const { error: insertError } = await supabase
                    .from('seo_rankings')
                    .insert([
                        {
                            keyword_id: keywordId,
                            cliente_id: cliente_id,
                            position: currentPosition,
                            previous_position: previousPosition,
                            search_engine: search_engine || "google",
                            location: location || "Tijuana, Baja California, Mexico",
                            device: device || "desktop",
                            // created_at se establece automáticamente por el valor por defecto de Supabase
                        }
                    ]);

                if (insertError) {
                    console.error(`Error al insertar el ranking para "${keyword}":`, insertError);
                } else {
                    console.log(`  -> Ranking insertado correctamente para "${keyword}".`);
                }

            } catch (serpApiError) {
                console.error(`Error al consultar SerpAPI para "${keyword}":`, serpApiError.message);
            }
        }
        console.log("Verificación de rankings SEO finalizada.");

    } catch (globalError) {
        console.error("Error inesperado en el proceso principal:", globalError);
    }
}

// Exporta la función main para que pueda ser llamada desde otro script (ej. runAllFetchers.js)
module.exports = { main };

// Para pruebas directas: Si este script se ejecuta directamente, llama a main()
// Esto es útil para probar este script de forma aislada.
if (require.main === module) {
    main();
}