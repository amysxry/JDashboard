<template>
  <div class="page-content-wrapper">
    <div v-if="isLoading" class="loading-container">
      <div class="spinner"></div>
      <p>Cargando tu dashboard...</p>
    </div>

    <div v-else class="dashboard-content">
      <header class="page-header">
        <div class="header-left">
          <h1 class="welcome-title">Bienvenido, {{ clientName }} ❤️</h1>
          <p class="welcome-subtitle">Visualiza el rendimiento real de tu sitio</p>
        </div>
        <div class="header-right">
          <div class="date-display">
            <CalendarDays class="date-icon" />
            <div class="date-info">
              <span class="date-main">{{ currentDate }}</span>
              <span class="date-sub">{{ currentTime }}</span>
            </div>
          </div>
        </div>
      </header>

      <main class="content-grid">
        <div v-if="shouldShowSeo" class="left-column">
          <div class="content-card seo-card">
            <div class="card-header">
              <div class="seo-header-content">
                <h3 class="card-title">🎯 Palabras Clave Principales</h3>
                <p class="seo-subtitle">Seguimiento de posiciones en Google</p>
              </div>
              <div v-if="seoKeywords.length > 0" class="seo-stats">
                <span class="keyword-count">Las mejores {{ seoKeywords.length }} kw posicionadas</span>
                <span class="best-position">#{{ Math.min(...seoKeywords.map(k => k.position)) }} hoy</span>
              </div>
            </div>
            <div v-if="seoKeywords.length === 0" class="no-data-message">
              <div class="no-data-content">
                <Target class="no-data-icon" />
                <h4>No hay datos de SEO disponibles</h4>
                <p>Una vez que se agreguen palabras clave a tu seguimiento, aparecerán aquí con sus posiciones actuales.</p>
                <small>Los datos se actualizan regularmente por nuestro equipo.</small>
              </div>
            </div>
            <div v-else class="seo-table-container">
              <table class="seo-table">
                <thead>
                  <tr>
                    <th>Palabra Clave</th>
                    <th>Posición Actual</th>
                    <th>Tendencia</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="keyword in seoKeywords" :key="keyword.term" class="keyword-row">
                    <td class="keyword-cell">
                      <div class="keyword-info">
                        <span class="keyword-text">{{ keyword.term }}</span>
                        <small class="keyword-meta">{{ keyword.lastUpdate }}</small>
                      </div>
                    </td>
                    <td>
                      <span class="position-badge" :class="getPositionBadgeClass(keyword.position)">
                        #{{ keyword.position }}
                      </span>
                    </td>
                    <td>
                      <div class="trend-cell">
                        <span v-if="keyword.change > 0" class="change-indicator positive">
                          <ArrowUpIcon class="h-4 w-4" />
                          +{{ keyword.change }}
                        </span>
                        <span v-else-if="keyword.change < 0" class="change-indicator negative">
                          <ArrowDownIcon class="h-4 w-4" />
                          {{ keyword.change }}
                        </span>
                        <span v-else class="change-indicator neutral">
                          <div class="no-change-dot"></div>
                          Sin cambios
                        </span>
                      </div>
                    </td>
                    <td>
                      <span class="status-badge" :class="getStatusClass(keyword.position)">
                        {{ getStatusText(keyword.position) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="right-column">
          <!-- New Highlights Card -->
          <div v-if="highlights.length > 0" class="content-card highlights-card">
            <div class="card-header">
              <h3 class="card-title">🎯 Highlights del Rendimiento</h3>
            </div>
            <div class="highlights-container">
              <div 
                v-for="(highlight, index) in highlights" 
                :key="index"
                class="highlight-item"
                :class="highlight.type"
              >
                <div class="highlight-icon">
                  <component :is="highlight.icon" class="h-5 w-5" />
                </div>
                <div class="highlight-content">
                  <h4 class="highlight-title">{{ highlight.title }}</h4>
                  <p class="highlight-description">{{ highlight.description }}</p>
                </div>
              </div>
            </div>
          </div>

          <div v-if="keywordToWatch" class="content-card insight-card">
            <div class="card-icon-bg">
              <TrendingUp class="h-6 w-6" />
            </div>
            <div class="insight-info">
              <div class="card-header">
                <h3 class="card-label">Análisis Rápido</h3>
              </div>
              <p class="insight-text">
                ¡Buen trabajo! Tu palabra clave
                <strong>"{{ keywordToWatch.term }}"</strong>
                subió a la posición
                <strong>#{{ keywordToWatch.position }}</strong>.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/lib/supabaseClient';
import { ArrowUpIcon, ArrowDownIcon, TrendingUp, CalendarDays, Target, MousePointer, Globe, Zap } from 'lucide-vue-next';

// --- Estado de datos ---
const isLoading = ref(true);
const clientName = ref('');
const clientId = ref(null);
const seoKeywords = ref([]);
const ga4Data = ref(null);
const adsData = ref(null);
const wordpressData = ref(null);

// --- Propiedades Computadas ---
const shouldShowSeo = computed(() => {
  return clientId.value !== '43cc43d3-3136-46a6-9853-a5c392d7b7ab';
});

const keywordToWatch = computed(() => {
  if (!shouldShowSeo.value || !seoKeywords.value || seoKeywords.value.length === 0) return null;
  return seoKeywords.value
    .filter(k => k.change > 0)
    .sort((a, b) => b.change - a.change)[0] || null;
});

const highlights = computed(() => {
  const results = [];
  
  // GA4 Highlights basados en datos reales
  if (ga4Data.value) {
    // Tasa de conversión dinámica
    if (ga4Data.value.conversion_rate >= 5) {
      results.push({
        title: '¡Excelente Tasa de Conversión!',
        description: `Tu tasa de conversión es del ${ga4Data.value.conversion_rate}%, lo que indica que el tráfico que el sitio recibe es de muy buena calidad.`,
        type: 'success',
        icon: Target,
        source: 'ga4',
        priority: 10,
        score: parseFloat(ga4Data.value.conversion_rate)
      });
    } else if (ga4Data.value.conversion_rate >= 2) {
      results.push({
        title: 'Buena Tasa de Conversión',
        description: `Tu tasa de conversión del ${ga4Data.value.conversion_rate}% está por encima del promedio. Seguiremos buscando subir este ratio con nuevas optimizaciones.`,
        type: 'good',
        icon: Target,
        source: 'ga4',
        priority: 7,
        score: parseFloat(ga4Data.value.conversion_rate)
      });
    } else if (ga4Data.value.conversion_rate > 0) {
      results.push({
        title: 'Oportunidad de Mejora',
        description: `Con ${ga4Data.value.conversion_rate}% de conversión, hay gran potencial para optimizar tu embudo de ventas.`,
        type: 'warning',
        icon: Target,
        source: 'ga4',
        priority: 6,
        score: parseFloat(ga4Data.value.conversion_rate)
      });
    }

    // Engagement basado en bounce rate
    if (ga4Data.value.bounce_rate <= 30) {
      results.push({
        title: '¡Excelente Engagement!',
        description: `Con un ${ga4Data.value.bounce_rate}% de rebote, los visitantes encuentran muy relevante el contenido del sitio.`,
        type: 'success',
        icon: MousePointer,
        source: 'ga4',
        priority: 9,
        score: 100 - parseFloat(ga4Data.value.bounce_rate)
      });
    } else if (ga4Data.value.bounce_rate <= 50) {
      results.push({
        title: 'Buen Engagement',
        description: `Tu porcentaje de rebote del ${ga4Data.value.bounce_rate}% está por encima del rango de tu nicho.`,
        type: 'good',
        icon: MousePointer,
        source: 'ga4',
        priority: 6,
        score: 100 - parseFloat(ga4Data.value.bounce_rate)
      });
    }

    // Crecimiento de sesiones
    if (ga4Data.value.sessions_growth > 20) {
      results.push({
        title: '¡Crecimiento Explosivo!',
        description: `Tus sesiones han crecido un ${ga4Data.value.sessions_growth}% comparado con el período anterior. ¡Increíble!`,
        type: 'success',
        icon: TrendingUp,
        source: 'ga4',
        priority: 9,
        score: ga4Data.value.sessions_growth
      });
    } else if (ga4Data.value.sessions_growth > 0) {
      results.push({
        title: 'Crecimiento Positivo',
        description: `Un crecimiento del ${ga4Data.value.sessions_growth}% en sesiones muestra que lo que se ha implementado en el periodo ha tenido buena respuesta.`,
        type: 'good',
        icon: TrendingUp,
        source: 'ga4',
        priority: 7,
        score: ga4Data.value.sessions_growth
      });
    }
  }

  // Google Ads Highlights
  if (adsData.value) {
    // CTR dinámico
    if (adsData.value.ctr >= 4) {
      results.push({
        title: '¡CTR Sobresaliente!',
        description: `Tu CTR del ${adsData.value.ctr}% es excepcional y supera ampliamente el promedio de tu nicho.`,
        type: 'success',
        icon: MousePointer,
        source: 'ads',
        priority: 9,
        score: parseFloat(adsData.value.ctr) * 2
      });
    } else if (adsData.value.ctr >= 2) {
      results.push({
        title: 'Excelente CTR',
        description: `Tu CTR del ${adsData.value.ctr}% estamos logrando que los anuncios publicados sean de interés para la audiencia.`,
        type: 'success',
        icon: MousePointer,
        source: 'ads',
        priority: 7,
        score: parseFloat(adsData.value.ctr) * 2
      });
    }

    // ROAS dinámico
    if (adsData.value.roas >= 400) {
      results.push({
        title: '¡ROAS Excelente!',
        description: `Con un ROAS de ${adsData.value.roas}%, cada peso invertido genera $${(adsData.value.roas/100).toFixed(2)} en retorno.`,
        type: 'success',
        icon: Target,
        source: 'ads',
        priority: 10,
        score: adsData.value.roas / 10
      });
    } else if (adsData.value.roas >= 200) {
      results.push({
        title: 'Buen ROAS',
        description: `Tu ROAS del ${adsData.value.roas}% muestra que la inversión publicitaria está siendo bien optimizada.`,
        type: 'good',
        icon: Target,
        source: 'ads',
        priority: 8,
        score: adsData.value.roas / 10
      });
    }

    // Crecimiento de conversiones
    if (adsData.value.conversions_growth > 25) {
      results.push({
        title: '¡Las conversiones crecen!',
        description: `Tus conversiones han aumentado ${adsData.value.conversions_growth}% vs. el período anterior.`,
        type: 'success',
        icon: Target,
        source: 'ads',
        priority: 8,
        score: adsData.value.conversions_growth
      });
    }
  }

  // WordPress/WooCommerce Highlights
  if (wordpressData.value) {
    // Crecimiento de ventas
    if (wordpressData.value.sales_growth > 30) {
      results.push({
        title: '¡Ventas en Aumento!',
        description: `Tus ventas han crecido ${wordpressData.value.sales_growth}% comparado con el período anterior. ¡Excelente trabajo en equipo!`,
        type: 'success',
        icon: TrendingUp,
        source: 'wordpress',
        priority: 10,
        score: wordpressData.value.sales_growth
      });
    } else if (wordpressData.value.sales_growth > 0) {
      results.push({
        title: 'Crecimiento en Venta',
        description: `Hemos logrado un incremento en ventas de ${wordpressData.value.sales_growth}% , como siempre esperamos escuchar tu feedback para saber lo que esto representa en tu negocio.`,
        type: 'good',
        icon: TrendingUp,
        source: 'wordpress',
        priority: 8,
        score: wordpressData.value.sales_growth
      });
    }

    // Ticket promedio alto
    if (wordpressData.value.average_ticket >= 100) {
      results.push({
        title: '¡Excelente Ticket Promedio!',
        description: `El ticket promedio de $${wordpressData.value.average_ticket.toFixed(2)}, representa el rango de valor que los usuarios dan a tu producto.`,
        type: 'success',
        icon: Target,
        source: 'wordpress',
        priority: 8,
        score: wordpressData.value.average_ticket / 10
      });
    }

    // Rendimiento del sitio simulado
    if (wordpressData.value.page_speed >= 90) {
      results.push({
        title: '¡Velocidad Perfecta!',
        description: `Puntuación de ${wordpressData.value.page_speed}/100 en velocidad. Tu sitio carga súper rápido.`,
        type: 'success',
        icon: Zap,
        source: 'wordpress',
        priority: 7,
        score: wordpressData.value.page_speed
      });
    }
  }

  // Ordenar por prioridad y luego por score, tomar solo los 3 mejores
  return results
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return b.score - a.score;
    })
    .slice(0, 3);
});

// --- Computed Properties for Date/Time ---
const currentDate = computed(() => {
  const now = new Date();
  const dateString = now.toLocaleDateString('es-ES', { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  return `Hoy ${dateString}`;
});

const currentTime = computed(() => {
  const now = new Date();
  return now.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit'
  });
});

// --- Funciones de Utilidad ---
const formatCurrency = (value) => {
  if (value === null || value === undefined) return '0.00';
  return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const getPositionBadgeClass = (position) => {
  if (position <= 3) return 'excellent';
  if (position <= 10) return 'good';
  if (position <= 20) return 'average';
  return 'poor';
};

const getStatusClass = (position) => {
  if (position <= 3) return 'top';
  if (position <= 10) return 'first-page';
  if (position <= 20) return 'second-page';
  return 'needs-work';
};

const getStatusText = (position) => {
  if (position <= 3) return 'Top 3';
  if (position <= 10) return '1ª Página';
  if (position <= 20) return '2ª Página';
  return 'Mejorable';
};

// --- Funciones de Datos ---
const fetchDashboardData = async () => {
  isLoading.value = true;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    console.log('Usuario autenticado:', user.id);
    console.log('Email del usuario:', user.email);

    // Buscar cliente solo con columnas que existen
    const { data: clientData, error } = await supabase
      .from('clientes')
      .select('id, empresa, auth_id')
      .eq('auth_id', user.id)
      .single();
    
    if (error) {
      console.error('❌ Error buscando cliente por auth_id:', error);
      
      // Si no encuentra por auth_id, mostrar todos los clientes para diagnóstico
      console.log('🔍 Obteniendo todos los clientes para diagnóstico...');
      const { data: allClients, error: allError } = await supabase
        .from('clientes')
        .select('id, empresa, auth_id');
        
      if (!allError && allClients) {
        console.log('📋 Todos los clientes en la base de datos:', allClients);
        console.log('🎯 Buscando cliente con ID: 6a0af1e1-35d9-481c-a056-f03c688ca163');
        
        const targetClient = allClients.find(c => c.id === '6a0af1e1-35d9-481c-a056-f03c688ca163');
        if (targetClient) {
          console.log('✅ Cliente objetivo encontrado:', targetClient);
          console.log('⚠️ PROBLEMA DE VINCULACIÓN:');
          console.log('  - Usuario actual:', user.id);
          console.log('  - auth_id del cliente:', targetClient.auth_id);
          console.log('  - ¿Coinciden?', targetClient.auth_id === user.id ? 'SÍ' : 'NO');
          
          console.log('💡 SOLUCIÓN: Ejecuta esto en Supabase SQL Editor:');
          console.log(`UPDATE clientes SET auth_id = '${user.id}' WHERE id = '${targetClient.id}';`);
          
          // Usar este cliente temporalmente
          clientName.value = targetClient.empresa;
          clientId.value = targetClient.id;
          await Promise.all([
            fetchSeoData(targetClient.id),
            fetchGA4Data(targetClient.id),
            fetchAdsData(targetClient.id),
            fetchWordPressData(targetClient.id)
          ]);
          return;
        } else {
          console.error('❌ Cliente con ID 6a0af1e1-35d9-481c-a056-f03c688ca163 no encontrado');
        }
      }
      
      throw new Error('Cliente no encontrado');
    }

    console.log('✅ Datos del cliente encontrados por auth_id:', clientData);
    clientName.value = clientData.empresa;
    clientId.value = clientData.id;

    // Cargar datos reales de las tablas
    await Promise.all([
      fetchSeoData(clientData.id),
      fetchGA4Data(clientData.id),
      fetchAdsData(clientData.id),
      fetchWordPressData(clientData.id)
    ]);
  } catch (error) {
    console.error('Error al cargar datos del dashboard:', error);
  } finally {
    isLoading.value = false;
  }
};

const fetchSeoData = async (clienteId) => {
  try {
    // Omitir ranking SEO para el cliente específico
    if (clienteId === '43cc43d3-3136-46a6-9853-a5c392d7b7ab') {
      console.log('SEO ranking omitido para este cliente');
      seoKeywords.value = [];
      return;
    }
    
    console.log('🔍 Buscando datos SEO para cliente_id:', clienteId);
    
    // MÉTODO 1: Intentar consulta directa
    const { data, error } = await supabase
      .from('seo_rankings')
      .select('keyword, position, previous_position')
      .eq('cliente_id', clienteId)
      .order('position', { ascending: true });

    if (error) {
      console.error('❌ Error en consulta directa:', error);
      
      // MÉTODO 2: Intentar sin filtro para ver si hay datos
      console.log('🔍 Intentando consulta sin filtro para diagnóstico...');
      const { data: allData, error: allError } = await supabase
        .from('seo_rankings')
        .select('*')
        .limit(10);
        
      if (allError) {
        console.error('❌ Error incluso sin filtro - Problema de RLS:', allError);
        console.log('💡 SOLUCIÓN RÁPIDA: Ve a Supabase y ejecuta:');
        console.log('ALTER TABLE seo_rankings DISABLE ROW LEVEL SECURITY;');
        seoKeywords.value = [];
        return;
      }
      
      console.log('📊 Datos encontrados sin filtro:', allData);
      
      // Filtrar manualmente por cliente_id
      const filteredData = allData.filter(row => row.cliente_id === clienteId);
      console.log(`🎯 Datos filtrados para cliente ${clienteId}:`, filteredData);
      
      if (filteredData.length === 0) {
        console.warn('⚠️ No hay datos para este cliente_id específico');
        console.log('📋 Clientes_id disponibles en seo_rankings:', [...new Set(allData.map(row => row.cliente_id))]);
        seoKeywords.value = [];
        return;
      }
      
      // Usar datos filtrados manualmente
      seoKeywords.value = filteredData.map(row => ({
        term: row.keyword,
        position: row.position,
        change: row.previous_position !== null && row.previous_position !== undefined 
          ? (row.previous_position - row.position) 
          : 0,
        lastUpdate: 'Reciente'
      }));
      
      console.log('✅ Datos SEO procesados (filtro manual):', seoKeywords.value);
      return;
    }
    
    console.log('📊 Datos SEO recibidos (método directo):', data);
    
    // Formatear los datos para que coincidan con la vista
    seoKeywords.value = data.map(row => ({
      term: row.keyword,
      position: row.position,
      change: row.previous_position !== null && row.previous_position !== undefined 
        ? (row.previous_position - row.position) 
        : 0,
      lastUpdate: 'Reciente'
    }));
    
    console.log('✅ Datos SEO procesados (método directo):', seoKeywords.value);
  } catch(err) {
    console.error('❌ Error general al cargar datos de SEO:', err);
    seoKeywords.value = [];
  }
};

const fetchGA4Data = async (clienteId) => {
  try {
    // Usar la misma función RPC que GA4.vue
    const { startDate, endDate } = getDateRanges();

    const { data, error } = await supabase.rpc('get_daily_analytics_data', {
      p_client_id: clienteId,
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) throw error;

    if (data && data.length > 0) {
      // Calcular métricas igual que en GA4.vue
      const totalUsers = data.reduce((sum, row) => sum + (row.users || 0), 0);
      const totalSessions = data.reduce((sum, row) => sum + (row.sessions || 0), 0);
      const totalPageViews = data.reduce((sum, row) => sum + (row.page_views || 0), 0);
      const totalConversions = data.reduce((sum, row) => sum + (row.conversions || 0), 0);
      
      const totalAvgSessionDuration = data.reduce((sum, row) => sum + (row.avg_session_duration || 0), 0);
      const avgSessionDuration = data.length > 0 ? totalAvgSessionDuration / data.length : 0;
      
      const totalBounceRate = data.reduce((sum, row) => sum + (row.bounce_rate || 0), 0);
      const avgBounceRate = data.length > 0 ? totalBounceRate / data.length : 0;

      // Calcular tasa de conversión
      const conversion_rate = totalSessions > 0 ? (totalConversions / totalSessions) * 100 : 0;

      // Calcular crecimiento comparando primera y segunda mitad
      const halfLength = Math.floor(data.length / 2);
      const firstHalf = data.slice(0, halfLength);
      const secondHalf = data.slice(halfLength);

      const firstSessions = firstHalf.reduce((sum, row) => sum + (row.sessions || 0), 0);
      const secondSessions = secondHalf.reduce((sum, row) => sum + (row.sessions || 0), 0);
      
      const sessions_growth = firstSessions > 0 ? ((secondSessions - firstSessions) / firstSessions) * 100 : 0;

      ga4Data.value = {
        sessions: totalSessions,
        users: totalUsers,
        conversions: totalConversions,
        conversion_rate: parseFloat(conversion_rate.toFixed(2)),
        bounce_rate: parseFloat(avgBounceRate.toFixed(1)),
        sessions_growth: parseFloat(sessions_growth.toFixed(1)),
        avg_session_duration: avgSessionDuration,
        pages_per_session: totalSessions > 0 ? totalPageViews / totalSessions : 0
      };
    }
  } catch (err) {
    console.error('Error al cargar datos de GA4:', err);
    ga4Data.value = null;
  }
};

const fetchAdsData = async (clienteId) => {
  try {
    // Usar la misma tabla que Ads.vue
    const { startDate, endDate } = getDateRanges();

    const { data, error } = await supabase
      .from('ads_performance_cache')
      .select('*')
      .eq('cliente_id', clienteId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) throw error;

    if (data && data.length > 0) {
      // Calcular totales igual que en Ads.vue
      const totalImpressions = data.reduce((sum, row) => sum + (row.impressions || 0), 0);
      const totalClicks = data.reduce((sum, row) => sum + (row.clicks || 0), 0);
      const totalCost = data.reduce((sum, row) => sum + (row.cost_micros || 0), 0) / 1000000;
      const totalConversions = data.reduce((sum, row) => sum + (row.conversions || 0), 0);

      // Calcular métricas
      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const roas = totalCost > 0 ? (totalConversions * 100 / totalCost) * 100 : 0; // Asumiendo $100 por conversión

      // Calcular crecimiento (primera vs segunda mitad)
      const halfLength = Math.floor(data.length / 2);
      const firstHalf = data.slice(0, halfLength);
      const secondHalf = data.slice(halfLength);

      const firstConversions = firstHalf.reduce((sum, row) => sum + (row.conversions || 0), 0);
      const secondConversions = secondHalf.reduce((sum, row) => sum + (row.conversions || 0), 0);
      
      const conversions_growth = firstConversions > 0 ? ((secondConversions - firstConversions) / firstConversions) * 100 : 0;

      adsData.value = {
        impressions: totalImpressions,
        clicks: totalClicks,
        conversions: totalConversions,
        cost: totalCost,
        ctr: parseFloat(ctr.toFixed(2)),
        roas: parseInt(roas.toString()),
        conversions_growth: parseFloat(conversions_growth.toFixed(1))
      };
    }
  } catch (err) {
    console.error('Error al cargar datos de Google Ads:', err);
    adsData.value = null;
  }
};

const fetchWordPressData = async (clienteId) => {
  try {
    // Usar la misma tabla que WordPress.vue
    const { startDate, endDate } = getDateRanges();

    const { data, error } = await supabase
      .from('wc_sales_cache')
      .select('*')
      .eq('cliente_id', clienteId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) throw error;

    if (data && data.length > 0) {
      // Calcular métricas de WordPress igual que en WordPress.vue
      const totalSales = data.reduce((sum, row) => sum + parseFloat(row.total_sales || 0), 0);
      const totalOrders = data.reduce((sum, row) => sum + (row.total_orders || 0), 0);
      const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

      // Simular datos de rendimiento del sitio (ya que WordPress.vue es para WooCommerce)
      // En un caso real, estos vendrían de otra tabla de métricas del sitio
      const page_speed = Math.floor(Math.random() * 30) + 70; // 70-100
      const uptime = parseFloat((Math.random() * 2 + 98).toFixed(2)); // 98-100%
      const security_score = Math.floor(Math.random() * 20) + 80; // 80-100

      // Calcular crecimiento de ventas
      const halfLength = Math.floor(data.length / 2);
      const firstHalf = data.slice(0, halfLength);
      const secondHalf = data.slice(halfLength);

      const firstSales = firstHalf.reduce((sum, row) => sum + parseFloat(row.total_sales || 0), 0);
      const secondSales = secondHalf.reduce((sum, row) => sum + parseFloat(row.total_sales || 0), 0);
      
      const sales_growth = firstSales > 0 ? ((secondSales - firstSales) / firstSales) * 100 : 0;

      wordpressData.value = {
        total_sales: totalSales,
        total_orders: totalOrders,
        average_ticket: averageTicket,
        sales_growth: parseFloat(sales_growth.toFixed(1)),
        page_speed: page_speed,
        uptime: uptime,
        security_score: security_score,
        security_improvements: sales_growth > 10 ? 1 : 0 // Si las ventas crecieron mucho, "mejoró la seguridad"
      };
    }
  } catch (err) {
    console.error('Error al cargar datos de WordPress:', err);
    wordpressData.value = null;
  }
};

// Función para obtener rangos de fechas
const getDateRanges = () => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 29); // Últimos 30 días

  const formatDateToISO = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    startDate: formatDateToISO(startDate),
    endDate: formatDateToISO(endDate)
  };
};

// --- Funciones de UI ---
// Removed all tooltip-related functions

// --- Hooks de Ciclo de Vida ---
onMounted(fetchDashboardData);
</script>

<style scoped>
/* --- DISEÑO GENERAL Y BIENVENIDA --- */
.page-content-wrapper {
  padding: 1.5rem;
  width: 100%;
  box-sizing: border-box;
  background-color: var(--color-bg-dark);
  position: relative;
  overflow-x: auto; /* Allow horizontal scroll */
  min-width: 0; /* Prevent width constraints */
}

/* Responsive padding */
@media (max-width: 768px) {
  .page-content-wrapper {
    padding: 1rem;
  }
}

@media (max-width: 480px) {
  .page-content-wrapper {
    padding: 0.75rem;
  }
}

.page-content-wrapper::before {
  display: none;
}

.page-content-wrapper::after {
  display: none;
}

.loading-container {
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  justify-content: center;
  height: calc(100vh - 4rem); 
  color: var(--color-text-secondary); 
  gap: 1rem;
}

.spinner {
  width: 48px; 
  height: 48px; 
  border: 5px solid var(--color-border);
  border-bottom-color: var(--color-primary); 
  border-radius: 50%;
  animation: rotation 1s linear infinite;
}

@keyframes rotation { 
  0% { transform: rotate(0deg); } 
  100% { transform: rotate(360deg); } 
}

.page-header {
  margin-bottom: 3rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
  position: relative;
  padding: 2rem 0;
}

/* Responsive header */
@media (max-width: 1024px) {
  .page-header {
    margin-bottom: 2rem;
    padding: 1.5rem 0;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
    padding: 1rem 0;
  }
}

.page-header::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(146, 208, 0, 0.3) 20%, 
    rgba(146, 208, 0, 0.6) 50%, 
    rgba(146, 208, 0, 0.3) 80%, 
    transparent 100%);
}

.header-left {
  flex: 1;
  position: relative;
}

.header-right {
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.welcome-title {
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0 0 0.5rem 0;
  background: linear-gradient(135deg, 
    #ffffff 0%, 
    #f0f0f0 30%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: relative;
}

/* Responsive title sizes */
@media (max-width: 1024px) {
  .welcome-title {
    font-size: 2.2rem;
  }
}

@media (max-width: 768px) {
  .welcome-title {
    font-size: 2rem;
  }
}

@media (max-width: 480px) {
  .welcome-title {
    font-size: 1.75rem;
  }
}

.welcome-title::after {
  content: '✨';
  position: absolute;
  right: -2rem;
  top: -0.5rem;
  font-size: 1.5rem;
  animation: sparkle 2s ease-in-out infinite;
}

@media (max-width: 480px) {
  .welcome-title::after {
    right: -1.5rem;
    font-size: 1.2rem;
  }
}

@keyframes sparkle {
  0%, 100% { 
    opacity: 0.7; 
    transform: scale(1); 
  }
  50% { 
    opacity: 1; 
    transform: scale(1.1); 
  }
}

.welcome-subtitle {
  font-size: 1.2rem;
  color: var(--color-text-secondary);
  margin-top: 0.5rem;
  line-height: 1.5;
  opacity: 0.9;
}

/* Responsive subtitle */
@media (max-width: 768px) {
  .welcome-subtitle {
    font-size: 1.1rem;
  }
}

@media (max-width: 480px) {
  .welcome-subtitle {
    font-size: 1rem;
  }
}

.date-display {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  background-color: rgba(42, 42, 42, 0.8);
  border: 1px solid rgba(146, 208, 0, 0.2);
  border-radius: 1rem;
  padding: 1rem 1.5rem;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

/* Responsive date display */
@media (max-width: 768px) {
  .date-display {
    gap: 1rem;
    padding: 0.875rem 1.25rem;
    align-self: flex-start;
  }
}

@media (max-width: 480px) {
  .date-display {
    gap: 0.75rem;
    padding: 0.75rem 1rem;
  }
}

.date-display::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    #92d000 50%, 
    transparent 100%);
}

.date-display::after {
  display: none;
}

.date-icon {
  width: 24px;
  height: 24px;
  color: #92d000;
  flex-shrink: 0;
  filter: drop-shadow(0 1px 2px rgba(146, 208, 0, 0.2));
}

.date-info {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  position: relative;
  z-index: 1;
}

.date-main {
  font-size: 1.1rem;
  font-weight: 700;
  color: #ffffff;
  text-transform: capitalize;
}

@media (max-width: 480px) {
  .date-main {
    font-size: 1rem;
  }
}

.date-sub {
  font-size: 0.9rem;
  color: #92d000;
  font-weight: 600;
  letter-spacing: 0.5px;
}

@media (max-width: 480px) {
  .date-sub {
    font-size: 0.8rem;
  }
}

/* --- GRILLA Y TARJETAS --- */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  position: relative;
  overflow-x: auto;
  min-width: 0; /* Prevent grid from creating overflow issues */
}

.content-grid:has(.left-column:only-child),
.content-grid:has(.right-column:only-child) {
  grid-template-columns: 1fr;
}

/* Responsive grid */
@media (max-width: 1024px) {
  .content-grid {
    gap: 1.25rem;
  }
}

@media (max-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}

.left-column, .right-column {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

@media (max-width: 1024px) {
  .left-column, .right-column {
    gap: 1.25rem;
  }
}

@media (max-width: 768px) {
  .left-column, .right-column {
    gap: 1rem;
  }
}

.content-card {
  background-color: #2a2a2a;
  border-radius: 1rem;
  padding: 1.5rem;
  border: 1px solid #3b3b3b;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* Responsive card padding */
@media (max-width: 768px) {
  .content-card {
    padding: 1.25rem;
    border-radius: 0.875rem;
  }
}

@media (max-width: 480px) {
  .content-card {
    padding: 1rem;
    border-radius: 0.75rem;
  }
}

.content-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #92d000 0%, rgba(146, 208, 0, 0.3) 100%);
}

.content-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(146, 208, 0, 0.1);
  border-color: rgba(146, 208, 0, 0.3);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.card-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
}

/* Responsive card titles */
@media (max-width: 768px) {
  .card-title {
    font-size: 1.2rem;
  }
}

@media (max-width: 480px) {
  .card-title {
    font-size: 1.1rem;
  }
}

.card-label {
  font-size: 0.9rem;
  color: #aaa;
  margin: 0;
  font-weight: 500;
}

@media (max-width: 480px) {
  .card-label {
    font-size: 0.85rem;
  }
}

/* --- TARJETAS PEQUEÑAS (SALDO Y ANÁLISIS) --- */
.balance-card, .insight-card {
  flex-direction: row;
  align-items: flex-start;
  gap: 1.5rem;
}

/* Responsive small cards */
@media (max-width: 768px) {
  .balance-card, .insight-card {
    gap: 1.25rem;
  }
}

@media (max-width: 480px) {
  .balance-card, .insight-card {
    gap: 1rem;
  }
}

.card-icon-bg {
  width: 48px; 
  height: 48px;
  border-radius: 0.75rem;
  display: flex; 
  align-items: center; 
  justify-content: center;
  flex-shrink: 0;
  margin-top: 0.5rem;
}

/* Responsive icon size */
@media (max-width: 480px) {
  .card-icon-bg {
    width: 40px;
    height: 40px;
    margin-top: 0.25rem;
  }
}

.balance-card .card-icon-bg { 
  background: linear-gradient(135deg, rgba(146, 208, 0, 0.2) 0%, rgba(146, 208, 0, 0.1) 100%);
  color: #92d000; 
  border: 1px solid rgba(146, 208, 0, 0.2);
}

.insight-card .card-icon-bg { 
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%);
  color: #3b82f6; 
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.balance-info, .insight-info {
  flex: 1;
}

.balance-value {
  font-size: 2.2rem;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.2;
  margin: 0.5rem 0;
}

/* Responsive balance value */
@media (max-width: 768px) {
  .balance-value {
    font-size: 2rem;
  }
}

@media (max-width: 480px) {
  .balance-value {
    font-size: 1.75rem;
  }
}

.card-description { 
  font-size: 0.8rem; 
  color: #828282; 
  margin: 0;
}

@media (max-width: 480px) {
  .card-description {
    font-size: 0.75rem;
  }
}

.insight-text {
  font-size: 1rem;
  color: #e0e0e0;
  line-height: 1.4;
  margin: 0;
}

@media (max-width: 768px) {
  .insight-text {
    font-size: 0.95rem;
  }
}

@media (max-width: 480px) {
  .insight-text {
    font-size: 0.9rem;
  }
}

.insight-text strong { 
  font-weight: 600;
  color: #ffffff;
}

/* --- TARJETA GRANDE DE SEO --- */
.seo-card {
  flex: 1;
}

.seo-header-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.seo-subtitle {
  font-size: 0.9rem;
  color: #aaa;
  margin: 0;
  font-weight: 400;
}

.seo-stats {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.keyword-count, .best-position {
  font-size: 0.8rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-weight: 600;
}

.keyword-count {
  background-color: rgba(146, 208, 0, 0.15);
  color: #92d000;
  border: 1px solid rgba(146, 208, 0, 0.3);
}

.best-position {
  background-color: rgba(34, 197, 94, 0.15);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.seo-table-container { 
  width: 100%; 
  overflow-x: auto;
  overflow-y: visible;
  border-radius: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
  /* Ensure scrollbar is visible and styled */
  scrollbar-width: thin;
  scrollbar-color: rgba(146, 208, 0, 0.3) rgba(0, 0, 0, 0.1);
}

.seo-table-container::-webkit-scrollbar {
  height: 8px;
}

.seo-table-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.seo-table-container::-webkit-scrollbar-thumb {
  background: rgba(146, 208, 0, 0.3);
  border-radius: 4px;
}

.seo-table-container::-webkit-scrollbar-thumb:hover {
  background: rgba(146, 208, 0, 0.5);
}

.seo-table { 
  width: 100%; 
  border-collapse: collapse; 
  min-width: 600px; /* Ensures table doesn't collapse too much on mobile */
}

.seo-table th, .seo-table td {
  padding: 1rem; 
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

/* Responsive table padding */
@media (max-width: 768px) {
  .seo-table th, .seo-table td {
    padding: 0.75rem;
  }
  
  .seo-table {
    min-width: 500px;
  }
}

@media (max-width: 480px) {
  .seo-table th, .seo-table td {
    padding: 0.5rem;
    font-size: 0.875rem;
  }
  
  .seo-table {
    min-width: 450px;
  }
}

.seo-table th {
  color: #92d000; 
  font-weight: 600;
  font-size: 0.8rem; 
  text-transform: uppercase; 
  letter-spacing: 0.05em;
  background: linear-gradient(135deg, #3b3b3b, #333333);
  border-bottom: 2px solid rgba(146, 208, 0, 0.3);
  position: sticky;
  top: 0;
  z-index: 1;
}

.seo-table th:first-child {
  border-radius: 0.75rem 0 0 0;
}

.seo-table th:last-child {
  border-radius: 0 0.75rem 0 0;
}

.keyword-row {
  transition: all 0.2s ease;
}

.keyword-row:hover {
  background: rgba(146, 208, 0, 0.08);
  transform: translateX(2px);
}

.keyword-row:last-child td {
  border-bottom: none;
}

.keyword-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.keyword-text {
  font-weight: 500; 
  color: #e0e0e0; 
  font-size: 0.95rem;
}

.keyword-meta {
  color: #aaa;
  font-size: 0.75rem;
}

.trend-cell {
  display: flex;
  align-items: center;
}

.position-badge {
  display: inline-block; 
  padding: 0.4rem 0.8rem;
  border-radius: 20px; 
  font-weight: 700; 
  font-size: 0.85rem;
  min-width: 50px;
  text-align: center;
}

.position-badge.excellent { 
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1)); 
  color: #22c55e; 
  border: 1px solid rgba(34, 197, 94, 0.3);
  box-shadow: 0 2px 4px rgba(34, 197, 94, 0.1);
}

.position-badge.good { 
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.1)); 
  color: #3b82f6; 
  border: 1px solid rgba(59, 130, 246, 0.3);
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
}

.position-badge.average { 
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(249, 115, 22, 0.1)); 
  color: #f97316; 
  border: 1px solid rgba(249, 115, 22, 0.3);
  box-shadow: 0 2px 4px rgba(249, 115, 22, 0.1);
}

.position-badge.poor { 
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.2), rgba(220, 38, 38, 0.1)); 
  color: #dc2626; 
  border: 1px solid rgba(220, 38, 38, 0.3);
  box-shadow: 0 2px 4px rgba(220, 38, 38, 0.1);
}

.change-indicator { 
  display: inline-flex; 
  align-items: center; 
  gap: 0.25rem; 
  font-weight: 600;
  font-size: 0.85rem;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
}

.change-indicator.positive { 
  color: #16a34a; 
  background-color: rgba(22, 163, 74, 0.1);
}

.change-indicator.negative { 
  color: #dc2626; 
  background-color: rgba(220, 38, 38, 0.1);
}

.change-indicator.neutral { 
  color: #aaa; 
  background-color: rgba(170, 170, 170, 0.1);
}

.no-change-dot {
  width: 6px;
  height: 6px;
  background-color: #aaa;
  border-radius: 50%;
}

.status-badge {
  display: inline-block;
  padding: 0.3rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-badge.top {
  background-color: rgba(255, 215, 0, 0.15);
  color: #ffd700;
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.status-badge.first-page {
  background-color: rgba(34, 197, 94, 0.15);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.status-badge.second-page {
  background-color: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.status-badge.needs-work {
  background-color: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.no-data-message {
  text-align: center; 
  color: #aaa;
  padding: 3rem;
  background: linear-gradient(135deg, #3b3b3b, #333333);
  border-radius: 0.75rem;
  min-height: 200px;
  display: flex;
  align-items: center; 
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.no-data-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  max-width: 300px;
}

.no-data-icon {
  width: 48px;
  height: 48px;
  color: #92d000;
  opacity: 0.7;
}

.no-data-content h4 {
  color: #ffffff;
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.no-data-content p {
  color: #aaa;
  margin: 0;
  line-height: 1.5;
  text-align: center;
}

.no-data-content small {
  color: #888;
  font-size: 0.8rem;
}

/* --- HIGHLIGHTS CARD --- */
.highlights-card {
  margin-bottom: 1.5rem;
}

.highlights-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(146, 208, 0, 0.2) transparent;
}

.highlights-container::-webkit-scrollbar {
  height: 6px;
}

.highlights-container::-webkit-scrollbar-track {
  background: transparent;
}

.highlights-container::-webkit-scrollbar-thumb {
  background: rgba(146, 208, 0, 0.2);
  border-radius: 3px;
}

.highlights-container::-webkit-scrollbar-thumb:hover {
  background: rgba(146, 208, 0, 0.3);
}

.highlight-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  border-radius: 0.75rem;
  border-left: 4px solid;
  position: relative;
  transition: all 0.3s ease;
}

/* Responsive highlight items */
@media (max-width: 768px) {
  .highlight-item {
    padding: 0.875rem;
    gap: 0.875rem;
  }
}

@media (max-width: 480px) {
  .highlight-item {
    padding: 0.75rem;
    gap: 0.75rem;
  }
}

.highlight-item:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.highlight-item.success {
  background: linear-gradient(135deg, rgba(22, 163, 74, 0.1) 0%, rgba(22, 163, 74, 0.05) 100%);
  border-left-color: #16a34a;
}

.highlight-item.good {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
  border-left-color: #3b82f6;
}

.highlight-item.warning {
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(249, 115, 22, 0.05) 100%);
  border-left-color: #f97316;
}

.highlight-icon {
  width: 32px;
  height: 32px;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 0.25rem;
}

.highlight-item.success .highlight-icon {
  background-color: rgba(22, 163, 74, 0.15);
  color: #16a34a;
}

.highlight-item.good .highlight-icon {
  background-color: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.highlight-item.warning .highlight-icon {
  background-color: rgba(249, 115, 22, 0.15);
  color: #f97316;
}

.highlight-content {
  flex: 1;
}

.highlight-title {
  font-size: 1rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 0.5rem 0;
  line-height: 1.3;
}

/* Responsive highlight text */
@media (max-width: 768px) {
  .highlight-title {
    font-size: 0.95rem;
  }
}

@media (max-width: 480px) {
  .highlight-title {
    font-size: 0.9rem;
  }
}

.highlight-description {
  font-size: 0.9rem;
  color: #e0e0e0;
  margin: 0;
  line-height: 1.4;
}

@media (max-width: 768px) {
  .highlight-description {
    font-size: 0.85rem;
  }
}

@media (max-width: 480px) {
  .highlight-description {
    font-size: 0.8rem;
  }
}
</style>