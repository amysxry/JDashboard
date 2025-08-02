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
        <div class="left-column">
          <div class="content-card balance-card">
            <div class="card-icon-bg">
              <Wallet class="h-6 w-6" />
            </div>
            <div class="balance-info">
              <div class="card-header">
                <h3 class="card-label">Saldo Disponible</h3>
              </div>
              <div class="balance-value">${{ formatCurrency(clientBalance) }}</div>
              <p class="card-description">Fondos actuales en tu cuenta.</p>
            </div>
          </div>

          <div class="content-card calendar-card">
            <div class="card-header">
              <h3 class="card-label">Calendario</h3>
            </div>
            <div class="mini-calendar">
              <div class="calendar-header">
                <span class="current-month">{{ currentMonth }}</span>
                <span class="current-year">{{ currentYear }}</span>
              </div>
              <div class="calendar-weekdays">
                <span v-for="day in weekdays" :key="day" class="weekday">{{ day }}</span>
              </div>
              <div class="calendar-grid">
                <span 
                  v-for="date in calendarDates" 
                  :key="date.key"
                  class="calendar-date"
                  :class="{
                    'current-day': date.isToday,
                    'other-month': date.isOtherMonth,
                    'weekend': date.isWeekend
                  }"
                >
                  {{ date.day }}
                </span>
              </div>
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
          
          <div class="content-card seo-card">
            <div class="card-header">
              <h3 class="card-title">Palabras Clave Principales</h3>
            </div>
            <div v-if="seoKeywords.length === 0" class="no-data-message">
              Aún no hay datos de SEO para mostrar.
            </div>
            <div v-else class="seo-table-container">
              <table class="seo-table">
                <thead>
                  <tr>
                    <th>Palabra Clave</th>
                    <th>Posición</th>
                    <th>Cambio (7d)</th>
                    <th>Última Revisión</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="keyword in seoKeywords" :key="keyword.term">
                    <td class="keyword-cell">{{ keyword.term }}</td>
                    <td>
                      <span class="position-badge" :class="getPositionBadgeClass(keyword.position)">
                        #{{ keyword.position }}
                      </span>
                    </td>
                    <td>
                      <span v-if="keyword.change !== 0" class="change-indicator" :class="{'positive': keyword.change > 0, 'negative': keyword.change < 0}">
                        <component :is="keyword.change > 0 ? ArrowUpIcon : ArrowDownIcon" class="h-3 w-3" />
                        {{ Math.abs(keyword.change) }}
                      </span>
                      <span v-else class="change-indicator neutral">-</span>
                    </td>
                    <td>{{ keyword.lastUpdate }}</td>
                  </tr>
                </tbody>
              </table>
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
import { ArrowUpIcon, ArrowDownIcon, Wallet, TrendingUp, CalendarDays, Target, MousePointer, Globe, Zap } from 'lucide-vue-next';

// --- Estado de datos ---
const isLoading = ref(true);
const clientName = ref('');
const clientBalance = ref(null);
const seoKeywords = ref([]);
const ga4Data = ref(null);
const adsData = ref(null);
const wordpressData = ref(null);

// --- Propiedades Computadas ---
const keywordToWatch = computed(() => {
  if (!seoKeywords.value || seoKeywords.value.length === 0) return null;
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
        description: `Tu tasa de conversión es del ${ga4Data.value.conversion_rate}%, lo que indica un gran rendimiento. ¡Sigue así!`,
        type: 'success',
        icon: Target,
        source: 'ga4',
        priority: 10,
        score: parseFloat(ga4Data.value.conversion_rate)
      });
    } else if (ga4Data.value.conversion_rate >= 2) {
      results.push({
        title: 'Buena Tasa de Conversión',
        description: `Tu tasa de conversión del ${ga4Data.value.conversion_rate}% está por encima del promedio. ¡Hay espacio para crecer!`,
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
        description: `Con un ${ga4Data.value.bounce_rate}% de rebote, tus visitantes están muy comprometidos con tu contenido.`,
        type: 'success',
        icon: MousePointer,
        source: 'ga4',
        priority: 9,
        score: 100 - parseFloat(ga4Data.value.bounce_rate)
      });
    } else if (ga4Data.value.bounce_rate <= 50) {
      results.push({
        title: 'Buen Engagement',
        description: `Tu porcentaje de rebote del ${ga4Data.value.bounce_rate}% está en un rango aceptable para tu industria.`,
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
        description: `Un crecimiento del ${ga4Data.value.sessions_growth}% en sesiones muestra que vas en la dirección correcta.`,
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
        description: `Tu CTR del ${adsData.value.ctr}% es excepcional y supera ampliamente el promedio de la industria.`,
        type: 'success',
        icon: MousePointer,
        source: 'ads',
        priority: 9,
        score: parseFloat(adsData.value.ctr) * 2
      });
    } else if (adsData.value.ctr >= 2) {
      results.push({
        title: 'Excelente CTR',
        description: `Tu CTR del ${adsData.value.ctr}% supera el promedio. Tus anuncios están bien optimizados.`,
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
        description: `Tu ROAS del ${adsData.value.roas}% muestra una inversión publicitaria rentable.`,
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
        title: '¡Conversiones en Alza!',
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
        description: `Tus ventas han crecido ${wordpressData.value.sales_growth}% comparado con el período anterior. ¡Excelente trabajo!`,
        type: 'success',
        icon: TrendingUp,
        source: 'wordpress',
        priority: 10,
        score: wordpressData.value.sales_growth
      });
    } else if (wordpressData.value.sales_growth > 0) {
      results.push({
        title: 'Crecimiento en Ventas',
        description: `Un crecimiento del ${wordpressData.value.sales_growth}% en ventas muestra una tendencia positiva.`,
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
        description: `Con un ticket promedio de $${wordpressData.value.average_ticket.toFixed(2)}, tus clientes valoran tus productos.`,
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
  return now.toLocaleDateString('es-ES', { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
});

const currentTime = computed(() => {
  const now = new Date();
  return now.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit'
  });
});

// --- Calendar Computed Properties ---
const currentMonth = computed(() => {
  const now = new Date();
  return now.toLocaleDateString('es-ES', { month: 'long' });
});

const currentYear = computed(() => {
  const now = new Date();
  return now.getFullYear();
});

const weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const calendarDates = computed(() => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  
  // Primer día del mes
  const firstDay = new Date(year, month, 1);
  // Último día del mes
  const lastDay = new Date(year, month + 1, 0);
  
  // Ajustar para que lunes sea 0
  const firstDayWeekday = (firstDay.getDay() + 6) % 7;
  
  const dates = [];
  
  // Días del mes anterior
  const prevMonth = new Date(year, month - 1, 0);
  for (let i = firstDayWeekday - 1; i >= 0; i--) {
    const day = prevMonth.getDate() - i;
    dates.push({
      day,
      isOtherMonth: true,
      isToday: false,
      isWeekend: false,
      key: `prev-${day}`
    });
  }
  
  // Días del mes actual
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = (date.getDay() + 6) % 7; // Ajustar para lunes = 0
    dates.push({
      day,
      isOtherMonth: false,
      isToday: day === today,
      isWeekend: dayOfWeek >= 5, // Sábado y domingo
      key: `current-${day}`
    });
  }
  
  // Días del siguiente mes para completar la grilla
  const remainingDays = 42 - dates.length; // 6 semanas × 7 días
  for (let day = 1; day <= remainingDays; day++) {
    dates.push({
      day,
      isOtherMonth: true,
      isToday: false,
      isWeekend: false,
      key: `next-${day}`
    });
  }
  
  return dates;
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

// --- Funciones de Datos ---
const fetchDashboardData = async () => {
  isLoading.value = true;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data: clientData, error } = await supabase
      .from('clientes')
      .select('id, empresa, saldo')
      .eq('auth_id', user.id)
      .single();
    if (error) throw error;

    clientName.value = clientData.empresa;
    clientBalance.value = clientData.saldo;

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
    const { data, error } = await supabase
      .from('seo_rankings')
      .select('position, previous_position, created_at, monitored_keywords(keyword)')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    const latestKeywords = {};
    data.forEach(row => {
      const keywordText = row.monitored_keywords?.keyword;
      if (keywordText && !latestKeywords[keywordText]) {
        latestKeywords[keywordText] = {
          term: keywordText,
          position: row.position,
          change: row.previous_position !== null ? (row.previous_position - row.position) : 0,
          lastUpdate: new Date(row.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
        };
      }
    });
    seoKeywords.value = Object.values(latestKeywords);
  } catch(err) {
    console.error('Error al cargar datos de SEO:', err);
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

.welcome-title::after {
  content: '✨';
  position: absolute;
  right: -2rem;
  top: -0.5rem;
  font-size: 1.5rem;
  animation: sparkle 2s ease-in-out infinite;
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

.date-sub {
  font-size: 0.9rem;
  color: #92d000;
  font-weight: 600;
  letter-spacing: 0.5px;
}

/* --- GRILLA Y TARJETAS --- */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  position: relative;
}

.left-column, .right-column {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
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

.card-label {
  font-size: 0.9rem;
  color: #aaa;
  margin: 0;
  font-weight: 500;
}

/* --- TARJETAS PEQUEÑAS (SALDO Y ANÁLISIS) --- */
.balance-card, .insight-card {
  flex-direction: row;
  align-items: flex-start;
  gap: 1.5rem;
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

.card-description { 
  font-size: 0.8rem; 
  color: #828282; 
  margin: 0;
}

.insight-text {
  font-size: 1rem;
  color: #e0e0e0;
  line-height: 1.4;
  margin: 0;
}

.insight-text strong { 
  font-weight: 600;
  color: #ffffff;
}

/* --- MINI CALENDAR --- */
.calendar-card {
  max-width: none;
  min-height: auto;
}

.mini-calendar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(146, 208, 0, 0.2);
  margin-bottom: 0.5rem;
}

.current-month {
  font-size: 1.1rem;
  font-weight: 700;
  color: #ffffff;
  text-transform: capitalize;
}

.current-year {
  font-size: 0.95rem;
  color: #92d000;
  font-weight: 600;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.4rem;
  margin-bottom: 0.75rem;
}

.weekday {
  text-align: center;
  font-size: 0.75rem;
  color: #92d000;
  font-weight: 700;
  padding: 0.3rem;
  background-color: rgba(146, 208, 0, 0.1);
  border-radius: 0.3rem;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.4rem;
}

.calendar-date {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  border-radius: 0.3rem;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #e0e0e0;
  font-weight: 500;
  min-height: 28px;
  position: relative;
}

.calendar-date:hover:not(.current-day) {
  background-color: rgba(146, 208, 0, 0.15);
  transform: scale(1.05);
}

.calendar-date.current-day {
  background: linear-gradient(135deg, #92d000 0%, #7bb500 100%);
  color: #1e1e1e;
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(146, 208, 0, 0.4);
  transform: scale(1.05);
}

.calendar-date.current-day::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 0.4rem;
  background: linear-gradient(135deg, #92d000, #7bb500);
  z-index: -1;
  opacity: 0.3;
}

.calendar-date.other-month {
  color: #555;
  opacity: 0.5;
}

.calendar-date.weekend:not(.other-month) {
  color: #92d000;
  font-weight: 600;
}

.calendar-date.other-month.weekend {
  color: #444;
}

.calendar-date.weekend:not(.current-day):not(.other-month):hover {
  background-color: rgba(146, 208, 0, 0.2);
}

/* --- TARJETA GRANDE DE SEO --- */
.seo-card {
  flex: 1;
}

.seo-table-container { 
  width: 100%; 
  overflow-x: auto; 
}

.seo-table { 
  width: 100%; 
  border-collapse: collapse; 
}

.seo-table th, .seo-table td {
  padding: 1rem; 
  text-align: left;
  border-bottom: 1px solid #444;
  white-space: nowrap;
}

.seo-table th {
  color: #92d000; 
  font-weight: 600;
  font-size: 0.75rem; 
  text-transform: uppercase; 
  letter-spacing: 0.05em;
  background: linear-gradient(90deg, #3b3b3b 0%, rgba(146, 208, 0, 0.05) 100%);
  border-bottom: 2px solid rgba(146, 208, 0, 0.2);
}

.seo-table tbody tr:hover {
  background-color: #3b3b3b;
}

.seo-table tbody tr:last-child td {
  border-bottom: none;
}

.keyword-cell { 
  font-weight: 500; 
  color: #e0e0e0; 
}

.position-badge {
  display: inline-block; 
  padding: 0.3rem 0.8rem;
  border-radius: 99px; 
  font-weight: 600; 
  font-size: 0.85rem;
}

.position-badge.excellent { 
  background-color: rgba(22, 163, 74, 0.15); 
  color: #16a34a; 
}

.position-badge.good { 
  background-color: rgba(59, 130, 246, 0.15); 
  color: #3b82f6; 
}

.position-badge.average { 
  background-color: rgba(249, 115, 22, 0.15); 
  color: #f97316; 
}

.position-badge.poor { 
  background-color: rgba(220, 38, 38, 0.15); 
  color: #dc2626; 
}

.change-indicator { 
  display: inline-flex; 
  align-items: center; 
  gap: 0.25rem; 
  font-weight: 600; 
}

.change-indicator.positive { 
  color: #16a34a; 
}

.change-indicator.negative { 
  color: #dc2626; 
}

.change-indicator.neutral { 
  color: #aaa; 
}

.no-data-message {
  text-align: center; 
  color: #aaa;
  font-style: italic; 
  padding: 3rem;
  background-color: #3b3b3b;
  border-radius: 0.5rem;
  min-height: 150px;
  display: flex;
  align-items: center; 
  justify-content: center;
}

/* --- HIGHLIGHTS CARD --- */
.highlights-card {
  margin-bottom: 1.5rem;
}

.highlights-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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

.highlight-description {
  font-size: 0.9rem;
  color: #e0e0e0;
  margin: 0;
  line-height: 1.4;
}
</style>