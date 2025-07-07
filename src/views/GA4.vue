<template>
  <div class="ga4-page-content">
    <header class="page-controls-header">
      <div class="header-info">
        <div class="date-info-main">
          <CalendarDays class="date-icon" />
          <p class="date-range-display">{{ displayDateRange }}</p>
        </div>
        <div v-if="lastUpdated" class="last-updated-info">
          <Clock class="update-icon" />
          <span>Datos actualizados {{ timeAgo }}</span>
        </div>
      </div>

      <div class="header-divider"></div>

      <div class="header-actions">
        <div class="info-tooltip">
          <select v-model="timeRange" @change="refreshData" class="time-select">
            <option value="7d">Últimos 7 días</option>
            <option value="14d">Últimos 14 días</option>
            <option value="30d">Últimos 30 días</option>
          </select>
        </div>
        <button @click="refreshData" class="refresh-btn">
          <RefreshCw class="h-4 w-4" />
          <span>Actualizar</span>
        </button>
      </div>
    </header>

    <main class="analytics-main">
      <section class="kpis-section">
        <template v-if="isLoading">
          <div v-for="n in 5" :key="n" class="kpi-card loading"></div>
        </template>
        <template v-else-if="fetchError">
          <div class="error-message">{{ fetchError }}</div>
        </template>
        <template v-else>
          <div class="kpi-card">
            <div class="kpi-header">
              <p class="kpi-title">Usuarios Activos</p>
              <div class="info-tooltip"><HelpCircle class="h-4 w-4" /><span class="tooltip-text">Personas que interactuaron con tu sitio en el período seleccionado</span></div>
            </div>
            <h3 class="kpi-value">{{ formatNumber(kpiData.activeUsers) }}</h3>
            <div class="kpi-trend" :class="getTrendClass('users')"><component :is="usersTrend === 'up' ? ArrowUpIcon : ArrowDownIcon" class="h-4 w-4" /><span>{{ usersChange }}%</span></div>
          </div>
          <div class="kpi-card">
              <div class="kpi-header"><p class="kpi-title">Sesiones</p><div class="info-tooltip"><HelpCircle class="h-4 w-4" /><span class="tooltip-text">Total de visitas a tu sitio web, incluyendo múltiples visitas del mismo usuario</span></div></div>
              <h3 class="kpi-value">{{ formatNumber(kpiData.sessions) }}</h3>
              <div class="kpi-trend" :class="getTrendClass('sessions')"><component :is="sessionsTrend === 'up' ? ArrowUpIcon : ArrowDownIcon" class="h-4 w-4" /><span>{{ sessionsChange }}%</span></div>
            </div>
            <div class="kpi-card">
              <div class="kpi-header"><p class="kpi-title">Duración Media</p><div class="info-tooltip"><HelpCircle class="h-4 w-4" /><span class="tooltip-text">Tiempo promedio que los usuarios pasan en tu sitio por sesión</span></div></div>
              <h3 class="kpi-value">{{ formatDuration(kpiData.avgSessionDuration) }}</h3>
              <div class="kpi-trend" :class="getTrendClass('duration')"><component :is="durationTrend === 'up' ? ArrowUpIcon : ArrowDownIcon" class="h-4 w-4" /><span>{{ durationChange }}%</span></div>
            </div>
            <div class="kpi-card">
              <div class="kpi-header"><p class="kpi-title">Tasa de Rebote</p><div class="info-tooltip"><HelpCircle class="h-4 w-4" /><span class="tooltip-text">Porcentaje de visitas que abandonaron tu sitio sin interactuar</span></div></div>
              <h3 class="kpi-value">{{ formatPercentage(kpiData.bounceRate) }}</h3>
              <div class="kpi-trend" :class="getTrendClass('bounce')"><component :is="bounceTrend === 'up' ? ArrowDownIcon : ArrowUpIcon" class="h-4 w-4" /><span>{{ bounceChange }}%</span></div>
            </div>
            <div class="kpi-card">
              <div class="kpi-header"><p class="kpi-title">Páginas/Sesión</p><div class="info-tooltip"><HelpCircle class="h-4 w-4" /><span class="tooltip-text">Número promedio de páginas vistas durante cada sesión</span></div></div>
              <h3 class="kpi-value">{{ kpiData.pagesPerSession.toFixed(2) }}</h3>
              <div class="kpi-trend" :class="getTrendClass('pages')"><component :is="pagesTrend === 'up' ? ArrowUpIcon : ArrowDownIcon" class="h-4 w-4" /><span>{{ pagesChange }}%</span></div>
            </div>
        </template>
      </section>

      <section class="insight-section" v-if="keyInsight">
        <div class="insight-icon"><component :is="keyInsight.icon" /></div>
        <div class="insight-content"><h3 class="insight-title">{{ keyInsight.title }}</h3><p class="insight-text">{{ keyInsight.text }}</p></div>
      </section>

      <section class="charts-section">
        <div class="chart-card"><div class="chart-header"><h3 class="chart-title">Sesiones por Día</h3><div class="info-tooltip"><HelpCircle class="h-4 w-4" /><span class="tooltip-text">Evolución diaria del tráfico a tu sitio web</span></div></div><template v-if="isLoadingChart || fetchError"><div class="chart-placeholder">{{ fetchError ? 'Error al cargar la gráfica.' : 'Cargando gráfica...' }}</div></template><template v-else><div class="chart-container"><Line :key="chartKey" :data="sessionsChartData" :options="chartOptions" /></div></template></div>
        <div class="chart-card"><div class="chart-header"><h3 class="chart-title">Usuarios por Dispositivo</h3><div class="info-tooltip"><HelpCircle class="h-4 w-4" /><span class="tooltip-text">Distribución del tráfico por tipo de dispositivo</span></div></div><template v-if="isLoadingChart || fetchError"><div class="chart-placeholder">{{ fetchError ? 'Error al cargar la gráfica.' : 'Cargando gráfica...' }}</div></template><template v-else><div class="chart-container"><Bar :key="chartKey" :data="deviceChartData" :options="chartOptions" /></div></template></div>
        <div class="chart-card">
          <div class="chart-header"><h3 class="chart-title">Usuarios por Canal</h3><div class="info-tooltip"><HelpCircle class="h-4 w-4" /><span class="tooltip-text">Fuentes de tráfico que llevan usuarios a tu sitio</span></div></div>
          <template v-if="isLoadingChart || fetchError">
            <div class="chart-placeholder">{{ fetchError ? 'Error al cargar la gráfica.' : 'Cargando gráfica...' }}</div>
          </template>
          <template v-else>
            <div class="chart-container chart-container-doughnut">
              <Doughnut :key="chartKey" :data="channelChartData" :options="responsiveDoughnutChartOptions" />
            </div>
          </template>
        </div>
      </section>

      <section class="conversions-analysis-section">
        <div class="section-header">
            <h3 class="section-title">Análisis de Conversiones</h3>
            <div class="info-tooltip">
                <HelpCircle class="h-4 w-4" />
                <span class="tooltip-text">Rendimiento de las acciones clave de tu sitio web</span>
            </div>
        </div>
        <div class="conversions-grid">
            <div class="conversions-kpis">
                <div class="kpi-card-mini">
                    <p class="kpi-title">Total de Conversiones</p>
                    <h3 v-if="isLoading" class="kpi-value">-</h3>
                    <h3 v-else class="kpi-value">{{ formatNumber(totalConversions) }}</h3>
                </div>
                <div class="kpi-card-mini">
                    <p class="kpi-title">Tasa de Conversión</p>
                    <h3 v-if="isLoading" class="kpi-value">-</h3>
                    <h3 v-else class="kpi-value">{{ formatPercentage(conversionRate) }}</h3>
                    <span class="kpi-subtext">(Conversiones ÷ Sesiones)</span>
                </div>
            </div>
            <div class="chart-card">
                <div class="chart-header">
                    <h3 class="chart-title">Conversiones por Nombre</h3>
                </div>
                <template v-if="isLoadingTable || fetchError">
                    <div class="chart-placeholder">{{ fetchError ? 'Error al cargar la gráfica.' : 'Cargando gráfica...' }}</div>
                </template>
                <template v-else-if="gaConversions.length === 0">
                    <div class="no-data">No hay datos de conversiones para mostrar.</div>
                </template>
                <template v-else>
                    <div class="chart-container">
                        <Bar :key="chartKey" :data="conversionsChartData" :options="conversionsChartOptions" />
                    </div>
                </template>
            </div>
        </div>
      </section>

      <section class="pages-section card-style">
        <div class="section-header"><h3 class="section-title">Páginas Más Visitadas</h3><div class="info-tooltip"><HelpCircle class="h-4 w-4" /><span class="tooltip-text">Contenidos más populares de tu sitio web</span></div></div><template v-if="isLoadingTable || fetchError"><div class="chart-placeholder">{{ fetchError ? 'Error al cargar las páginas.' : 'Cargando tabla...' }}</div></template><template v-else-if="mostVisitedPages.length === 0"><div class="no-data">No hay datos de páginas visitadas para el rango seleccionado.</div></template><template v-else><div class="overflow-x-auto"><table class="pages-table"><thead><tr><th>Página</th><th>Vistas</th><th>Tiempo Promedio</th></tr></thead><tbody><tr v-for="(page, index) in mostVisitedPages" :key="index"><td class="page-path">{{ page.path }}</td><td>{{ formatNumber(page.views) }}</td><td>{{ formatDuration(page.avgTime) }}</td></tr></tbody></table></div></template>
      </section>

      <div v-if="fetchError" class="error-message">Hubo un problema al cargar los datos. Por favor, inténtalo de nuevo. <br> Detalles: {{ fetchError }}</div>
    </main>
  </div>
</template>

<script setup lang="ts">
// CAMBIO: Se importa el nuevo ícono CalendarDays
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { supabase } from '@/lib/supabaseClient';
import { RefreshCw, HelpCircle, ArrowUpIcon, ArrowDownIcon, CheckCircle, TrendingUp, Target, Users, Clock, CalendarDays } from 'lucide-vue-next';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar, Doughnut } from 'vue-chartjs';

// El resto del SCRIPT ES EXACTAMENTE EL MISMO que en la respuesta anterior.
// No ha cambiado nada en la lógica de datos.
ChartJS.register( CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler );

const lastUpdated = ref<Date | null>(null);
const clientName = ref<string>('Cargando...');
const clientGaId = ref<string | null>(null);
const timeRange = ref<string>('30d');
const isLoading = ref<boolean>(true);
const isLoadingChart = ref<boolean>(true);
const isLoadingTable = ref<boolean>(true);
const fetchError = ref<string | null>(null);
const chartKey = ref<number>(0);
const usersTrend = ref<'up' | 'down'>('up');
const usersChange = ref<number>(0);
const sessionsTrend = ref<'up' | 'down'>('up');
const sessionsChange = ref<number>(0);
const durationTrend = ref<'up' | 'down'>('up');
const durationChange = ref<number>(0);
const bounceTrend = ref<'up' | 'down'>('up');
const bounceChange = ref<number>(0);
const pagesTrend = ref<'up' | 'down'>('up');
const pagesChange = ref<number>(0);

interface DailyMetric { date: string; sessions: number; users: number; bounce_rate: number; avg_session_duration: number; page_views: number; }
interface DeviceMetric { dimension_value: string; users: number; }
interface ChannelMetric { dimension_value: string; users: number; }
interface PageMetric { page_path: string; page_views: number; avg_time_on_page: number; }
interface MostVisitedPageDisplay { path: string; views: number; avgTime: number; }
interface ConversionMetric { conversion_name: string; total_conversions: number; }

const gaDailyMetrics = ref<DailyMetric[]>([]);
const gaDeviceMetrics = ref<DeviceMetric[]>([]);
const gaChannelMetrics = ref<ChannelMetric[]>([]);
const gaPageMetrics = ref<PageMetric[]>([]);
const mostVisitedPages = ref<MostVisitedPageDisplay[]>([]);
const gaConversions = ref<ConversionMetric[]>([]);

const formatNumber = (value: number) => (value === null || isNaN(value)) ? '0' : Math.round(value).toLocaleString();
const formatDuration = (seconds: number) => { if (seconds === null || isNaN(seconds) || seconds < 0) return '00:00'; const m = Math.floor(seconds / 60); const s = Math.floor(seconds % 60); return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`; };
const formatPercentage = (value: number) => (value === null || isNaN(value)) ? '0.00%' : `${(value * 100).toFixed(2)}%`.replace('NaN', '0.00');
const getTrendClass = (metric: string) => { switch (metric) { case 'users': return usersTrend.value === 'up' ? 'text-green-500' : 'text-red-500'; case 'sessions': return sessionsTrend.value === 'up' ? 'text-green-500' : 'text-red-500'; case 'duration': return durationTrend.value === 'up' ? 'text-green-500' : 'text-red-500'; case 'bounce': return bounceTrend.value === 'up' ? 'text-red-500' : 'text-green-500'; case 'pages': return pagesTrend.value === 'up' ? 'text-green-500' : 'text-red-500'; default: return 'text-gray-500'; } };
const getDateRange = (range: string) => { const endDate = new Date(); const startDate = new Date(); switch (range) { case '7d': startDate.setDate(endDate.getDate() - 6); break; case '14d': startDate.setDate(endDate.getDate() - 13); break; case '30d': startDate.setDate(endDate.getDate() - 29); break; } const formatDateToISO = (date: Date) => { const y = date.getFullYear(); const m = (date.getMonth() + 1).toString().padStart(2, '0'); const d = date.getDate().toString().padStart(2, '0'); return `${y}-${m}-${d}`; }; return { startDate: formatDateToISO(startDate), endDate: formatDateToISO(endDate) }; };

const timeAgo = computed(() => { if (!lastUpdated.value) return ''; const now = new Date(); const seconds = Math.floor((now.getTime() - lastUpdated.value.getTime()) / 1000); let interval = seconds / 31536000; if (interval > 1) return `hace ${Math.floor(interval)} años`; interval = seconds / 2592000; if (interval > 1) return `hace ${Math.floor(interval)} meses`; interval = seconds / 86400; if (interval > 1) return `hace ${Math.floor(interval)} días`; interval = seconds / 3600; if (interval > 1) return `hace ${Math.floor(interval)} horas`; interval = seconds / 60; if (interval > 1) return `hace ${Math.floor(interval)} minutos`; return 'diariamente'; });

const kpiData = computed(() => {
  if (gaDailyMetrics.value.length === 0) {
    return { activeUsers: 0, sessions: 0, avgSessionDuration: 0, bounceRate: 0, pagesPerSession: 0, pageViews: 0 };
  }
  const totalUsers = gaDailyMetrics.value.reduce((sum, row) => sum + (row.users || 0), 0);
  const totalSessions = gaDailyMetrics.value.reduce((sum, row) => sum + (row.sessions || 0), 0);
  const totalPageViews = gaDailyMetrics.value.reduce((sum, row) => sum + (row.page_views || 0), 0);
  const totalAvgSessionDuration = gaDailyMetrics.value.reduce((sum, row) => sum + (row.avg_session_duration || 0), 0);
  const avgSessionDuration = gaDailyMetrics.value.length > 0 ? totalAvgSessionDuration / gaDailyMetrics.value.length : 0;
  const totalBounceRate = gaDailyMetrics.value.reduce((sum, row) => sum + (row.bounce_rate || 0), 0);
  const avgBounceRate = gaDailyMetrics.value.length > 0 ? totalBounceRate / gaDailyMetrics.value.length : 0;
  return { activeUsers: totalUsers, sessions: totalSessions, avgSessionDuration: avgSessionDuration, bounceRate: avgBounceRate, pagesPerSession: totalSessions > 0 ? totalPageViews / totalSessions : 0 };
});

const totalConversions = computed(() => {
    return gaConversions.value.reduce((sum, item) => sum + Number(item.total_conversions || 0), 0);
});
const conversionRate = computed(() => {
    if (kpiData.value.sessions === 0) return 0;
    return totalConversions.value / kpiData.value.sessions;
});

const keyInsight = computed(() => { if (gaDailyMetrics.value.length === 0) return null; if (conversionRate.value > 0.05) { return { icon: Target, title: '¡Excelente Tasa de Conversión!', text: `Tu tasa de conversión es del ${formatPercentage(conversionRate.value)}, lo que indica un gran rendimiento. ¡Sigue así!` }; } if (usersTrend.value === 'up' && usersChange.value > 50) { return { icon: TrendingUp, title: '¡Excelente Crecimiento!', text: `El número de usuarios activos ha aumentado un ${usersChange.value.toFixed(2)}% en la segunda mitad de este período. ¡Tu estrategia de adquisición está funcionando muy bien!` }; } if (channelChartData.value.labels.length > 0) { const topChannel = channelChartData.value.labels[0]; return { icon: Target, title: 'Tu Canal Principal', text: `La mayoría de tus usuarios están llegando a través de '${topChannel}'. Considera potenciar las campañas en este canal para maximizar resultados.` }; } if (durationTrend.value === 'up' && durationChange.value > 10) { return { icon: Clock, title: 'Mayor Interés de los Usuarios', text: `La duración media de la sesión ha mejorado un ${durationChange.value.toFixed(2)}%. Los usuarios encuentran tu contenido cada vez más valioso.` }; } return { icon: Users, title: 'Rendimiento General', text: `Durante este período, has alcanzado un total de ${formatNumber(kpiData.value.activeUsers)} usuarios a través de ${formatNumber(kpiData.value.sessions)} sesiones.` }; });
const displayDateRange = computed(() => { const { startDate, endDate } = getDateRange(timeRange.value); const formatDisplayDate = (dateString: string) => { const date = new Date(dateString + 'T00:00:00'); return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }); }; const startYear = new Date(startDate + 'T00:00:00').getFullYear(); const endYear = new Date(endDate + 'T00:00:00').getFullYear(); if (startYear !== endYear) { return `${formatDisplayDate(startDate)}, ${startYear} - ${formatDisplayDate(endDate)}, ${endYear}`; } return `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)} de ${endYear}`; });

const sessionsChartData = computed(() => ({ labels: [...gaDailyMetrics.value].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(row => new Date(row.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })), datasets: [{ label: 'Sesiones', data: [...gaDailyMetrics.value].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(row => row.sessions || 0), borderColor: '#92d000', backgroundColor: 'rgba(146, 208, 0, 0.2)', tension: 0.4, fill: true, pointBackgroundColor: '#92d000', pointBorderColor: '#fff', pointHoverBackgroundColor: '#fff', pointHoverBorderColor: '#92d000', }], }));
const deviceChartData = computed(() => { const deviceMap = gaDeviceMetrics.value.reduce((acc: { [key: string]: number }, item) => { acc[item.dimension_value] = (acc[item.dimension_value] || 0) + (item.users || 0); return acc; }, {}); return { labels: Object.keys(deviceMap), datasets: [{ label: 'Usuarios', data: Object.values(deviceMap), backgroundColor: ['#4F46E5', '#3B82F6', '#8B5CF6'], borderColor: '#2a2a2a', borderWidth: 1, }], }; });
const channelChartData = computed(() => { const channelMap = gaChannelMetrics.value.reduce((acc: { [key: string]: number }, item) => { acc[item.dimension_value] = (acc[item.dimension_value] || 0) + (item.users || 0); return acc; }, {}); return { labels: Object.keys(channelMap), datasets: [{ label: 'Usuarios', data: Object.values(channelMap), backgroundColor: ['#92d000', '#fe7529', '#3B82F6', '#FBBF24', '#8B5CF6', '#EF4444'], borderColor: '#2a2a2a', borderWidth: 2, }], }; });
const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false, labels: { color: '#ffffff' } }, tooltip: { backgroundColor: 'rgba(0,0,0,0.7)', titleColor: '#ffffff', bodyColor: '#ffffff', borderColor: '#92d000', borderWidth: 1, cornerRadius: 4 } }, scales: { y: { grid: { color: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#ffffff', font: { size: 12 } } }, x: { grid: { display: false }, ticks: { color: '#ffffff', font: { size: 12 } } } } };

const doughnutChartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#ffffff', boxWidth: 12, padding: 10 } }, tooltip: chartOptions.plugins.tooltip }, cutout: '70%' };

const conversionsChartData = computed(() => ({
    labels: gaConversions.value.map(c => c.conversion_name),
    datasets: [{
        label: 'Cantidad de Conversiones',
        data: gaConversions.value.map(c => c.total_conversions),
        backgroundColor: ['#92d000', '#fe7529', '#4F46E5', '#3B82F6', '#FBBF24', '#8B5CF6', '#EF4444'],
        borderColor: '#2a2a2a',
        borderWidth: 1,
    }]
}));
const conversionsChartOptions = { ...chartOptions, indexAxis: 'y', scales: { ...chartOptions.scales, x: { ...chartOptions.scales.x, grid: { color: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#ffffff', font: { size: 12 }}}, y: { ...chartOptions.scales.y, grid: { display: false }, ticks: {color: '#ffffff', font: {size: 12}}}}, plugins: { legend: { display: false }, tooltip: chartOptions.plugins.tooltip }};

const isMobile = ref(false);

const checkScreenSize = () => {
  isMobile.value = window.innerWidth < 1024;
};

const responsiveDoughnutChartOptions = computed(() => {
  const options = JSON.parse(JSON.stringify(doughnutChartOptions));
  if (isMobile.value) {
    options.plugins.legend.position = 'bottom';
    options.plugins.legend.labels.padding = 20;
  } else {
    options.plugins.legend.position = 'right';
    options.plugins.legend.labels.padding = 10;
  }
  return options;
});

const fetchClientInfo = async () => { fetchError.value = null; try { const { data: { user }, error: userError } = await supabase.auth.getUser(); if (userError || !user) throw new Error('Usuario no autenticado o error al obtener usuario.'); const { data: clientData, error: clientError } = await supabase.from('clientes').select('id, empresa').eq('auth_id', user.id).single(); if (clientError) throw new Error(`Error al cargar info del cliente: ${clientError.message}`); clientName.value = clientData?.empresa || 'Cliente Desconocido'; clientGaId.value = clientData?.id; if (!clientGaId.value) throw new Error('No se pudo vincular el usuario a un cliente con un ID de GA.'); } catch (err: any) { console.error('Error en fetchClientInfo:', err); fetchError.value = err.message; } };
const fetchGaDailyMetrics = async () => { if (!clientGaId.value) { gaDailyMetrics.value = []; return; } const { startDate, endDate } = getDateRange(timeRange.value); const { data, error } = await supabase.rpc('get_daily_analytics_data', { p_client_id: clientGaId.value, p_start_date: startDate, p_end_date: endDate }); if (error) throw error; gaDailyMetrics.value = data || []; if (data && data.length > 1) { const halfLength = Math.floor(data.length / 2); const firstHalf = data.slice(0, halfLength); const secondHalf = data.slice(halfLength); const sumField = (arr: any[], field: string) => arr.reduce((sum, row) => sum + (row[field] || 0), 0); const avgField = (arr: any[], field: string) => arr.length > 0 ? sumField(arr, field) / arr.length : 0; const calculateChange = (current: number, previous: number) => { if (previous === 0) return current > 0 ? 100 : 0; return parseFloat(((current - previous) / previous * 100).toFixed(2)); }; const firstUsers = sumField(firstHalf, 'users'); const secondUsers = sumField(secondHalf, 'users'); usersTrend.value = secondUsers >= firstUsers ? 'up' : 'down'; usersChange.value = Math.abs(calculateChange(secondUsers, firstUsers)); const firstSessions = sumField(firstHalf, 'sessions'); const secondSessions = sumField(secondHalf, 'sessions'); sessionsTrend.value = secondSessions >= firstSessions ? 'up' : 'down'; sessionsChange.value = Math.abs(calculateChange(secondSessions, firstSessions)); const firstDuration = avgField(firstHalf, 'avg_session_duration'); const secondDuration = avgField(secondHalf, 'avg_session_duration'); durationTrend.value = secondDuration >= firstDuration ? 'up' : 'down'; durationChange.value = Math.abs(calculateChange(secondDuration, firstDuration)); const firstBounce = avgField(firstHalf, 'bounce_rate'); const secondBounce = avgField(secondHalf, 'bounce_rate'); bounceTrend.value = secondBounce >= firstBounce ? 'up' : 'down'; bounceChange.value = Math.abs(calculateChange(secondBounce, firstBounce)); const firstPagesViews = sumField(firstHalf, 'page_views'); const secondPagesViews = sumField(secondHalf, 'page_views'); const firstPagesPerSession = firstSessions > 0 ? firstPagesViews / firstSessions : 0; const secondPagesPerSession = secondSessions > 0 ? secondPagesViews / secondSessions : 0; pagesTrend.value = secondPagesPerSession >= firstPagesPerSession ? 'up' : 'down'; pagesChange.value = Math.abs(calculateChange(secondPagesPerSession, firstPagesPerSession)); } else { usersChange.value = 0; sessionsChange.value = 0; durationChange.value = 0; bounceChange.value = 0; pagesChange.value = 0; } };
const fetchGaDeviceMetrics = async () => { if (!clientGaId.value) { gaDeviceMetrics.value = []; return; } const { startDate, endDate } = getDateRange(timeRange.value); const { data, error } = await supabase.rpc('get_device_analytics_data', { p_client_id: clientGaId.value, p_start_date: startDate, p_end_date: endDate }); if (error) throw error; gaDeviceMetrics.value = data || []; };
const fetchGaChannelMetrics = async () => { if (!clientGaId.value) { gaChannelMetrics.value = []; return; } const { startDate, endDate } = getDateRange(timeRange.value); const { data, error } = await supabase.rpc('get_channel_analytics_data', { p_client_id: clientGaId.value, p_start_date: startDate, p_end_date: endDate }); if (error) throw error; gaChannelMetrics.value = data || []; };
const fetchMostVisitedPages = async () => { if (!clientGaId.value) { mostVisitedPages.value = []; return; } const { startDate, endDate } = getDateRange(timeRange.value); const { data, error } = await supabase.rpc('get_most_visited_pages_data', { p_client_id: clientGaId.value, p_start_date: startDate, p_end_date: endDate }); if (error) throw error; gaPageMetrics.value = data || []; mostVisitedPages.value = gaPageMetrics.value.map(p => ({ path: p.page_path, views: p.page_views, avgTime: p.avg_time_on_page })); };
const fetchGaConversions = async () => {
    if (!clientGaId.value) { gaConversions.value = []; return; }
    const { startDate, endDate } = getDateRange(timeRange.value);
    const { data, error } = await supabase.rpc('get_conversions_data', { p_client_id: clientGaId.value, p_start_date: startDate, p_end_date: endDate });
    if (error) throw error;
    gaConversions.value = data || [];
};

const refreshData = async () => {
  fetchError.value = null;
  isLoading.value = true;
  isLoadingChart.value = true;
  isLoadingTable.value = true;
  try {
    if (!clientGaId.value) await fetchClientInfo();
    if (clientGaId.value) {
      await Promise.all([
        fetchGaDailyMetrics(),
        fetchGaDeviceMetrics(),
        fetchGaChannelMetrics(),
        fetchMostVisitedPages(),
        fetchGaConversions()
      ]);
    } else {
      gaDailyMetrics.value = []; gaDeviceMetrics.value = []; gaChannelMetrics.value = []; gaPageMetrics.value = []; mostVisitedPages.value = []; gaConversions.value = [];
      fetchError.value = fetchError.value || 'No se pudo obtener el ID del cliente.';
    }
  } catch (err: any) {
    console.error("Error en refreshData:", err);
    fetchError.value = `Error al cargar los datos: ${err.message}`;
  } finally {
    isLoading.value = false;
    isLoadingChart.value = false;
    isLoadingTable.value = false;
    chartKey.value++;
    lastUpdated.value = new Date();
  }
};

onMounted(async () => {
  checkScreenSize();
  window.addEventListener('resize', checkScreenSize);
  await refreshData();
});

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize);
});

watch(timeRange, () => {
  refreshData();
});
</script>

<style scoped>
/* ESTILOS NUEVOS Y AJUSTADOS */
.ga4-page-content {
  padding: 1.5rem;
  width: 100%;
  box-sizing: border-box;
}

.page-controls-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.5rem; /* Aumentamos el gap para más espacio */
  margin-bottom: 2rem;
  background-color: #2a2a2a;
  border-radius: 1rem;
  padding: 1.25rem 1.5rem; /* Un poco más de padding vertical */
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid #3b3b3b;
}
.header-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem; /* Espacio entre fecha principal y 'actualizado hace' */
}
/* CAMBIO: Estilos para el nuevo contenedor de la fecha principal */
.date-info-main {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}
.date-icon {
    width: 20px;
    height: 20px;
    color: var(--color-primary, #92d000);
}
.date-range-display {
  font-size: 1.1rem; /* Más grande */
  font-weight: 600; /* Más notorio */
  color: #ffffff; /* Blanco para destacar */
  margin: 0;
}
.last-updated-info { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: #aaa; padding-left: 2px; }
.update-icon { width: 14px; height: 14px; }

/* CAMBIO: Divisor vertical */
.header-divider {
    width: 1px;
    align-self: stretch;
    background-color: #444;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}
.time-select { padding: 0.5rem 1rem; border-radius: 0.5rem; background-color: #3b3b3b; color: #ffffff; border: 1px solid #92d000; appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'%3e%3cpath d='M7 7l3 3 3-3m0 6l-3-3-3 3' stroke='%23ffffff' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 0.75rem center; background-size: 0.8em 0.8em; padding-right: 2.5rem; cursor: pointer; }
.refresh-btn { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 0.5rem; background-color: #92d000; color: #1e1e1e; border: none; cursor: pointer; transition: background-color 0.2s ease; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); }
.refresh-btn:hover { background-color: #7bb500; }
.refresh-btn svg { color: #1e1e1e; }

.kpis-section { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
.kpi-card { background-color: #2a2a2a; border-radius: 1rem; padding: 1.5rem; border: 1px solid #3b3b3b; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2); display: flex; flex-direction: column; }
.kpi-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; }
.kpi-title { font-size: 0.9rem; color: #aaa; margin: 0; }
.kpi-value { font-size: 2.2rem; font-weight: 700; color: #ffffff; margin: 0.5rem 0; }
.kpi-trend { display: flex; align-items: center; gap: 0.25rem; font-size: 0.9rem; font-weight: 600; }
.kpi-trend svg { width: 1rem; height: 1rem; }
.insight-section { display: flex; align-items: center; gap: 2rem; background: linear-gradient(90deg, rgba(146, 208, 0, 0.1) 0%, rgba(90, 125, 22, 0.1) 100%); border-left: 4px solid var(--color-primary, #92d000); padding: 1.5rem 2rem; border-radius: 12px; margin-bottom: 2rem; }
.insight-icon { flex-shrink: 0; color: var(--color-primary, #92d000); }
.insight-icon svg { width: 40px; height: 40px; }
.insight-content { display: flex; flex-direction: column; gap: 0.25rem; }
.insight-title { font-size: 1.25rem; font-weight: 600; color: var(--color-text-primary); }
.insight-text { font-size: 1rem; color: var(--color-text-secondary); line-height: 1.6; }
.charts-section { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
.chart-card, .pages-section { background-color: #2a2a2a; border-radius: 1rem; padding: 1.5rem; border: 1px solid #3b3b3b; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2); }
.chart-header, .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.chart-title, .section-title { font-size: 1.3rem; font-weight: 600; color: #ffffff; margin: 0; }
.chart-container { position: relative; height: 250px; width: 100%; }
.chart-container-doughnut { display: flex; justify-content: center; align-items: center; height: 250px; }
.overflow-x-auto { overflow-x: auto; }
.pages-table { width: 100%; border-collapse: collapse; }
.pages-table th, .pages-table td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid #444; color: #e0e0e0; }
.pages-table th { font-weight: 600; color: #92d000; background-color: #3b3b3b; }
.pages-table tbody tr:hover { background-color: #3b3b3b; }
.pages-table tbody tr:last-child td { border-bottom: none; }
.page-path { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chart-placeholder, .no-data { text-align: center; color: #aaa; padding: 2rem; background-color: #3b3b3b; border-radius: 0.5rem; min-height: 150px; display: flex; align-items: center; justify-content: center; }
.error-message { color: #ff6b6b; background-color: rgba(255, 107, 107, 0.1); border: 1px solid #ff6b6b; padding: 1rem; border-radius: 0.5rem; text-align: center; margin-top: 2rem; }
.info-tooltip { position: relative; display: inline-flex; align-items: center; cursor: help; }
.info-tooltip .tooltip-text { visibility: hidden; width: 220px; background-color: #333; color: #fff; text-align: center; border-radius: 6px; padding: 0.75rem; position: absolute; z-index: 10; bottom: 130%; left: 50%; transform: translateX(-50%); opacity: 0; transition: opacity 0.3s; font-size: 0.8rem; font-weight: normal; pointer-events: none; }
.info-tooltip:hover .tooltip-text { visibility: visible; opacity: 1; }
.kpi-card.loading { background-color: #3b3b3b; border-radius: 1rem; padding: 1.5rem; animation: pulse 1.5s infinite alternate; min-height: 150px; }
@keyframes pulse { from { opacity: 0.7; } to { opacity: 1; } }
.conversions-analysis-section { background-color: #2a2a2a; border-radius: 1rem; padding: 1.5rem; border: 1px solid #3b3b3b; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2); margin-bottom: 2rem; }
.conversions-grid { display: grid; grid-template-columns: 300px 1fr; gap: 1.5rem; align-items: start; }
.conversions-kpis { display: flex; flex-direction: column; gap: 1.5rem; }
.kpi-card-mini { background-color: #3b3b3b; border-radius: 1rem; padding: 1.5rem; border: 1px solid #444; }
.kpi-subtext { font-size: 0.8rem; color: #888; margin-top: 0.5rem; }

/* --- CÓDIGO PARA OCULTAR SCROLLBAR --- */
.overflow-x-auto::-webkit-scrollbar {
  display: none;
}
.overflow-x-auto {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* --- ESTILOS RESPONSIVOS MEJORADOS --- */
@media (max-width: 820px) {
    /* CAMBIO: En pantallas más pequeñas, el divisor desaparece y los items se apilan */
    .header-divider {
        display: none;
    }
    .page-controls-header {
        justify-content: center; /* Centra el contenido cuando se apila */
    }
}

@media (max-width: 1023px) {
  .ga4-page-content { padding: 1rem; }
  .insight-section { flex-direction: column; gap: 1rem; padding: 1rem; text-align: center; }
  .charts-section { grid-template-columns: 1fr; gap: 1rem; }
  .conversions-grid { grid-template-columns: 1fr; }
  .kpi-value { font-size: 1.8rem; }
  .chart-card, .pages-section { padding: 1rem; }
  .chart-title, .section-title { font-size: 1.1rem; }
  .page-path { max-width: 150px; }
}

@media (max-width: 767px) {
  .kpis-section { grid-template-columns: 1fr 1fr; gap: 1rem; }
  .kpi-card { padding: 1rem; }
  .kpi-value { font-size: 1.6rem; }
  .page-controls-header {
    flex-direction: column;
    align-items: stretch;
  }
  .header-actions {
    flex-direction: column;
    gap: 0.75rem;
  }
  .time-select, .refresh-btn {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .kpis-section {
    grid-template-columns: 1fr;
  }
}
</style>