<template>
  <div class="analytics-layout">
    <SidebarMenu @sidebar-width-changed="handleSidebarWidthChange" />

    <div class="main-content" :style="{ marginLeft: dynamicMarginLeft }">
      <header class="page-header">
        <div class="header-left">
          <h1 class="page-title">Google Analytics 4</h1>
          <div class="info-tooltip">
            <HelpCircle class="h-5 w-5" />
            <span class="tooltip-text">Datos desde tus métricas de Google Analytics 4</span>
          </div>
        </div>
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
                <div class="info-tooltip">
                  <HelpCircle class="h-4 w-4" />
                  <span class="tooltip-text">Personas que interactuaron con tu sitio en el período seleccionado</span>
                </div>
              </div>
              <h3 class="kpi-value">{{ formatNumber(kpiData.activeUsers) }}</h3>
              <div class="kpi-trend" :class="getTrendClass('users')">
                <component :is="usersTrend === 'up' ? ArrowUpIcon : ArrowDownIcon" class="h-4 w-4" />
                <span>{{ usersChange }}%</span>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-header">
                <p class="kpi-title">Sesiones</p>
                <div class="info-tooltip">
                  <HelpCircle class="h-4 w-4" />
                  <span class="tooltip-text">Total de visitas a tu sitio web, incluyendo múltiples visitas del mismo usuario</span>
                </div>
              </div>
              <h3 class="kpi-value">{{ formatNumber(kpiData.sessions) }}</h3>
              <div class="kpi-trend" :class="getTrendClass('sessions')">
                <component :is="sessionsTrend === 'up' ? ArrowUpIcon : ArrowDownIcon" class="h-4 w-4" />
                <span>{{ sessionsChange }}%</span>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-header">
                <p class="kpi-title">Duración Media</p>
                <div class="info-tooltip">
                  <HelpCircle class="h-4 w-4" />
                  <span class="tooltip-text">Tiempo promedio que los usuarios pasan en tu sitio por sesión</span>
                </div>
              </div>
              <h3 class="kpi-value">{{ formatDuration(kpiData.avgSessionDuration) }}</h3>
              <div class="kpi-trend" :class="getTrendClass('duration')">
                <component :is="durationTrend === 'up' ? ArrowUpIcon : ArrowDownIcon" class="h-4 w-4" />
                <span>{{ durationChange }}%</span>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-header">
                <p class="kpi-title">Tasa de Rebote</p>
                <div class="info-tooltip">
                  <HelpCircle class="h-4 w-4" />
                  <span class="tooltip-text">Porcentaje de visitas que abandonaron tu sitio sin interactuar</span>
                </div>
              </div>
              <h3 class="kpi-value">{{ formatPercentage(kpiData.bounceRate) }}</h3>
              <div class="kpi-trend" :class="getTrendClass('bounce')">
                <component :is="bounceTrend === 'up' ? ArrowDownIcon : ArrowUpIcon" class="h-4 w-4" />
                <span>{{ bounceChange }}%</span>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-header">
                <p class="kpi-title">Páginas/Sesión</p>
                <div class="info-tooltip">
                  <HelpCircle class="h-4 w-4" />
                  <span class="tooltip-text">Número promedio de páginas vistas durante cada sesión</span>
                </div>
              </div>
              <h3 class="kpi-value">{{ kpiData.pagesPerSession.toFixed(2) }}</h3>
              <div class="kpi-trend" :class="getTrendClass('pages')">
                <component :is="pagesTrend === 'up' ? ArrowUpIcon : ArrowDownIcon" class="h-4 w-4" />
                <span>{{ pagesChange }}%</span>
              </div>
            </div>
          </template>
        </section>

        <section class="charts-section">
          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">Sesiones por Día</h3>
              <div class="info-tooltip">
                <HelpCircle class="h-4 w-4" />
                <span class="tooltip-text">Evolución diaria del tráfico a tu sitio web</span>
              </div>
            </div>
            <template v-if="isLoadingChart || fetchError">
              <div class="chart-placeholder">
                {{ fetchError ? 'Error al cargar la gráfica.' : 'Cargando gráfica...' }}
              </div>
            </template>
            <template v-else>
              <div class="chart-container">
                <Line :key="chartKey" :data="sessionsChartData" :options="chartOptions" />
              </div>
            </template>
          </div>

          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">Usuarios por Dispositivo</h3>
              <div class="info-tooltip">
                <HelpCircle class="h-4 w-4" />
                <span class="tooltip-text">Distribución del tráfico por tipo de dispositivo</span>
              </div>
            </div>
            <template v-if="isLoadingChart || fetchError">
              <div class="chart-placeholder">
                {{ fetchError ? 'Error al cargar la gráfica.' : 'Cargando gráfica...' }}
              </div>
            </template>
            <template v-else>
              <div class="chart-container">
                <Bar :key="chartKey" :data="deviceChartData" :options="chartOptions" />
              </div>
            </template>
          </div>

          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">Usuarios por Canal</h3>
              <div class="info-tooltip">
                <HelpCircle class="h-4 w-4" />
                <span class="tooltip-text">Fuentes de tráfico que llevan usuarios a tu sitio</span>
              </div>
            </div>
            <template v-if="isLoadingChart || fetchError">
              <div class="chart-placeholder">
                {{ fetchError ? 'Error al cargar la gráfica.' : 'Cargando gráfica...' }}
              </div>
            </template>
            <template v-else>
              <div class="chart-container chart-container-doughnut">
                <Doughnut :key="chartKey" :data="channelChartData" :options="doughnutChartOptions" />
              </div>
            </template>
          </div>
        </section>

        <section class="pages-section card-style">
          <div class="section-header">
            <h3 class="section-title">Páginas Más Visitadas</h3>
            <div class="info-tooltip">
              <HelpCircle class="h-4 w-4" />
              <span class="tooltip-text">Contenidos más populares de tu sitio web</span>
            </div>
          </div>
          <template v-if="isLoadingTable || fetchError">
            <div class="chart-placeholder">
              {{ fetchError ? 'Error al cargar las páginas.' : 'Cargando tabla...' }}
            </div>
          </template>
          <template v-else-if="mostVisitedPages.length === 0">
            <div class="no-data">No hay datos de páginas visitadas para el rango seleccionado.</div>
          </template>
          <template v-else>
            <div class="overflow-x-auto">
              <table class="pages-table">
                <thead>
                  <tr>
                    <th>Página</th>
                    <th>Vistas</th>
                    <th>Tiempo Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(page, index) in mostVisitedPages" :key="index">
                    <td class="page-path">{{ page.path }}</td>
                    <td>{{ formatNumber(page.views) }}</td>
                    <td>{{ formatDuration(page.avgTime) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </section>

        <div v-if="fetchError" class="error-message">
          Hubo un problema al cargar los datos. Por favor, inténtalo de nuevo. <br>
          Detalles: {{ fetchError }}
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'; // Corrected: Added onUnmounted
import { supabase } from '@/lib/supabaseClient';
import SidebarMenu from '@/components/SidebarMenu.vue';
import { RefreshCw, HelpCircle, ArrowUpIcon, ArrowDownIcon } from 'lucide-vue-next';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'vue-chartjs';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Variables reactivas para el ancho del sidebar
const sidebarWidth = ref(280); // Ancho inicial del sidebar (normal)
const isMobileLayout = ref(false); // Para controlar si estamos en móvil

// Computa el margin-left dinámicamente para el main-content
const dynamicMarginLeft = computed(() => {
    if (isMobileLayout.value) {
        return '0'; // En móvil, el sidebar se superpone o es un overlay, no necesitamos margen
    }
    return `${sidebarWidth.value}px`;
});

// Manejador para el evento 'sidebar-width-changed'
const handleSidebarWidthChange = (event: CustomEvent) => {
    sidebarWidth.value = event.detail.width;
};

// Función para verificar el tamaño de la pantalla
const checkLayoutSize = () => {
    isMobileLayout.value = window.innerWidth < 1024;
};

// Datos del cliente
const clientName = ref<string>('Cargando...');
const clientGaId = ref<string | null>(null);
const timeRange = ref<string>('30d');

// Estados de carga
const isLoading = ref<boolean>(true);
const isLoadingChart = ref<boolean>(true);
const isLoadingTable = ref<boolean>(true);
const fetchError = ref<string | null>(null);

// Clave para forzar recarga de gráficas
const chartKey = ref<number>(0);

// Tendencias y cambios porcentuales
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

// Interfaces para los datos
interface DailyMetric {
  date: string;
  sessions: number;
  users: number;
  bounce_rate: number;
  avg_session_duration: number;
  page_views: number;
}

interface DeviceMetric {
  dimension_value: string;
  users: number;
}

interface ChannelMetric {
  dimension_value: string;
  users: number;
}

interface PageMetric {
  page_path: string;
  page_views: number;
  avg_time_on_page: number;
}

interface MostVisitedPageDisplay {
  path: string;
  views: number;
  avgTime: number;
}

// Datos de GA
const gaDailyMetrics = ref<DailyMetric[]>([]);
const gaDeviceMetrics = ref<DeviceMetric[]>([]);
const gaChannelMetrics = ref<ChannelMetric[]>([]);
const gaPageMetrics = ref<PageMetric[]>([]);
const mostVisitedPages = ref<MostVisitedPageDisplay[]>([]);

// KPIs computados
const kpiData = computed(() => {
  if (gaDailyMetrics.value.length === 0) {
    return {
      activeUsers: 0,
      sessions: 0,
      avgSessionDuration: 0,
      bounceRate: 0,
      pagesPerSession: 0,
      pageViews: 0
    };
  }

  const totalUsers = gaDailyMetrics.value.reduce((sum, row) => sum + (row.users || 0), 0);
  const totalSessions = gaDailyMetrics.value.reduce((sum, row) => sum + (row.sessions || 0), 0);
  const totalPageViews = gaDailyMetrics.value.reduce((sum, row) => sum + (row.page_views || 0), 0);

  const totalAvgSessionDuration = gaDailyMetrics.value.reduce((sum, row) => sum + (row.avg_session_duration || 0), 0);
  const avgSessionDuration = gaDailyMetrics.value.length > 0 ? totalAvgSessionDuration / gaDailyMetrics.value.length : 0;

  const totalBounceRate = gaDailyMetrics.value.reduce((sum, row) => sum + (row.bounce_rate || 0), 0);
  const avgBounceRate = gaDailyMetrics.value.length > 0 ? totalBounceRate / gaDailyMetrics.value.length : 0;

  return {
    activeUsers: totalUsers,
    sessions: totalSessions,
    avgSessionDuration: avgSessionDuration,
    bounceRate: avgBounceRate,
    pagesPerSession: totalSessions > 0 ? totalPageViews / totalSessions : 0,
  };
});

// Datos para gráficas
const sessionsChartData = computed(() => {
  const sortedData = [...gaDailyMetrics.value].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const labels = sortedData.map(row => new Date(row.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }));
  const data = sortedData.map(row => row.sessions || 0);

  return {
    labels: labels,
    datasets: [
      {
        label: 'Sesiones',
        data: data,
        borderColor: '#92d000',
        backgroundColor: 'rgba(146, 208, 0, 0.2)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#92d000',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#92d000',
      },
    ],
  };
});

const deviceChartData = computed(() => {
  const deviceMap = gaDeviceMetrics.value.reduce((acc: { [key: string]: number }, item) => {
    acc[item.dimension_value] = (acc[item.dimension_value] || 0) + (item.users || 0);
    return acc;
  }, {});

  const labels = Object.keys(deviceMap);
  const data = Object.values(deviceMap);

  return {
    labels: labels,
    datasets: [
      {
        label: 'Usuarios',
        data: data,
        backgroundColor: ['#4F46E5', '#3B82F6', '#8B5CF6'],
        borderColor: '#2a2a2a',
        borderWidth: 1,
      },
    ],
  };
});

const channelChartData = computed(() => {
  const channelMap = gaChannelMetrics.value.reduce((acc: { [key: string]: number }, item) => {
    acc[item.dimension_value] = (acc[item.dimension_value] || 0) + (item.users || 0);
    return acc;
  }, {});

  const labels = Object.keys(channelMap);
  const data = Object.values(channelMap);
  const backgroundColors = [
    '#92d000',
    '#fe7529',
    '#3B82F6',
    '#FBBF24',
    '#8B5CF6',
    '#EF4444',
  ];

  return {
    labels: labels,
    datasets: [
      {
        label: 'Usuarios',
        data: data,
        backgroundColor: backgroundColors.slice(0, labels.length),
        borderColor: '#2a2a2a',
        borderWidth: 2,
      },
    ],
  };
});

// Opciones de gráficas
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
      labels: {
        color: '#ffffff',
      },
    },
    tooltip: {
      backgroundColor: 'rgba(0,0,0,0.7)',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      borderColor: '#92d000',
      borderWidth: 1,
      cornerRadius: 4,
    },
  },
  scales: {
    y: {
      grid: {
        color: 'rgba(255, 255, 255, 0.1)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      ticks: {
        color: '#ffffff',
        font: {
          size: 12,
        },
      },
    },
    x: {
      grid: {
        display: false,
      },
      ticks: {
        color: '#ffffff',
        font: {
          size: 12,
        },
      },
    },
  },
};

const doughnutChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',
      labels: {
        color: '#ffffff',
        boxWidth: 12,
        padding: 10,
      },
    },
    tooltip: chartOptions.plugins.tooltip,
  },
  cutout: '70%',
};

// Métodos de utilidad
const getDateRange = (range: string) => {
  const endDate = new Date();
  const startDate = new Date();

  switch (range) {
    case '7d':
      startDate.setDate(endDate.getDate() - 6);
      break;
    case '14d':
      startDate.setDate(endDate.getDate() - 13);
      break;
    case '30d':
      startDate.setDate(endDate.getDate() - 29);
      break;
  }
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
};

const formatNumber = (value: number) => {
  if (value === null || isNaN(value)) return '0';
  return Math.round(value).toLocaleString();
};

const formatDuration = (seconds: number) => {
  if (seconds === null || isNaN(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const formatPercentage = (value: number) => {
  if (value === null || isNaN(value)) return '0.00%';
  return `${(value * 100).toFixed(2)}%`;
};

const getTrendClass = (metric: string) => {
  switch (metric) {
    case 'users':
      return usersTrend.value === 'up' ? 'text-green-500' : 'text-red-500';
    case 'sessions':
      return sessionsTrend.value === 'up' ? 'text-green-500' : 'text-red-500';
    case 'duration':
      return durationTrend.value === 'up' ? 'text-green-500' : 'text-red-500';
    case 'bounce':
      return bounceTrend.value === 'up' ? 'text-red-500' : 'text-green-500'; // Bounce rate: up is bad (red)
    case 'pages':
      return pagesTrend.value === 'up' ? 'text-green-500' : 'text-red-500';
    default:
      return 'text-gray-500';
  }
};

// Métodos para obtener datos
const fetchClientInfo = async () => {
  fetchError.value = null;
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Usuario no autenticado o error al obtener usuario.');
    }

    const { data: clientData, error: clientError } = await supabase
      .from('clientes')
      .select('id, empresa')
      .eq('auth_id', user.id)
      .single();

    if (clientError) {
      throw new Error(`Error al cargar info del cliente: ${clientError.message}`);
    }

    clientName.value = clientData?.empresa || 'Cliente Desconocido';
    clientGaId.value = clientData?.id;

    if (!clientGaId.value) {
      throw new Error('No se pudo vincular el usuario a un cliente con un ID de GA.');
    }
  } catch (err: any) {
    console.error('Error en fetchClientInfo:', err);
    fetchError.value = err.message;
    clientName.value = 'Error';
    clientGaId.value = null;
    isLoading.value = false;
    isLoadingChart.value = false;
    isLoadingTable.value = false;
  }
};

const fetchGaDailyMetrics = async () => {
  if (!clientGaId.value) {
    gaDailyMetrics.value = [];
    return;
  }

  isLoading.value = true;
  isLoadingChart.value = true;
  try {
    const { startDate, endDate } = getDateRange(timeRange.value);

    const { data, error } = await supabase.rpc('get_daily_analytics_data', {
      p_client_id: clientGaId.value,
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) throw error;
    gaDailyMetrics.value = data || [];

    // Calcular tendencias
    if (data && data.length > 1) {
      // Para tendencias, dividimos el período en dos mitades para comparar
      const halfLength = Math.floor(data.length / 2);
      const firstHalf = data.slice(0, halfLength);
      const secondHalf = data.slice(halfLength);

      const sumField = (arr: any[], field: string) => arr.reduce((sum, row) => sum + (row[field] || 0), 0);
      const avgField = (arr: any[], field: string) => arr.length > 0 ? sumField(arr, field) / arr.length : 0;

      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0; // Si el anterior era 0 y ahora hay valor, es 100% de aumento (o 0 si sigue en 0)
        return parseFloat(((current - previous) / previous * 100).toFixed(2));
      };

      // Usuarios
      const firstUsers = sumField(firstHalf, 'users');
      const secondUsers = sumField(secondHalf, 'users');
      usersTrend.value = secondUsers >= firstUsers ? 'up' : 'down';
      usersChange.value = Math.abs(calculateChange(secondUsers, firstUsers));

      // Sesiones
      const firstSessions = sumField(firstHalf, 'sessions');
      const secondSessions = sumField(secondHalf, 'sessions');
      sessionsTrend.value = secondSessions >= firstSessions ? 'up' : 'down';
      sessionsChange.value = Math.abs(calculateChange(secondSessions, firstSessions));

      // Duración Media
      const firstDuration = avgField(firstHalf, 'avg_session_duration');
      const secondDuration = avgField(secondHalf, 'avg_session_duration');
      durationTrend.value = secondDuration >= firstDuration ? 'up' : 'down';
      durationChange.value = Math.abs(calculateChange(secondDuration, firstDuration));

      // Tasa de Rebote (una SUBIDA es MALA, por eso el `up` es `text-red-500`)
      const firstBounce = avgField(firstHalf, 'bounce_rate');
      const secondBounce = avgField(secondHalf, 'bounce_rate');
      bounceTrend.value = secondBounce >= firstBounce ? 'up' : 'down'; // 'up' significa que subió la tasa de rebote
      bounceChange.value = Math.abs(calculateChange(secondBounce, firstBounce));

      // Páginas por Sesión (total page_views / total sessions)
      const firstPagesViews = sumField(firstHalf, 'page_views');
      const secondPagesViews = sumField(secondHalf, 'page_views');
      const firstPagesPerSession = firstSessions > 0 ? firstPagesViews / firstSessions : 0;
      const secondPagesPerSession = secondSessions > 0 ? secondPagesViews / secondSessions : 0;
      pagesTrend.value = secondPagesPerSession >= firstPagesPerSession ? 'up' : 'down';
      pagesChange.value = Math.abs(calculateChange(secondPagesPerSession, firstPagesPerSession));

    } else {
        // No hay suficientes datos para calcular tendencias
        usersChange.value = 0; usersTrend.value = 'up';
        sessionsChange.value = 0; sessionsTrend.value = 'up';
        durationChange.value = 0; durationTrend.value = 'up';
        bounceChange.value = 0; bounceTrend.value = 'down'; // Por defecto verde para rebote si no hay datos
        pagesChange.value = 0; pagesTrend.value = 'up';
    }

  } catch (err: any) {
    console.error('Error al cargar métricas diarias de GA:', err);
    fetchError.value = 'No se pudieron cargar los datos diarios de Analytics.';
    gaDailyMetrics.value = [];
  } finally {
    isLoading.value = false;
    isLoadingChart.value = false;
  }
};

const fetchGaDeviceMetrics = async () => {
  if (!clientGaId.value) {
    gaDeviceMetrics.value = [];
    return;
  }

  try {
    const { startDate, endDate } = getDateRange(timeRange.value);

    const { data, error } = await supabase.rpc('get_device_analytics_data', {
      p_client_id: clientGaId.value,
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) throw error;
    gaDeviceMetrics.value = data || [];

  } catch (err: any) {
    console.error('Error al cargar datos de dispositivo de GA:', err);
    fetchError.value = 'No se pudieron cargar los datos de dispositivo.';
    gaDeviceMetrics.value = [];
  } finally {
    isLoadingChart.value = false;
  }
};

const fetchGaChannelMetrics = async () => {
  if (!clientGaId.value) {
    gaChannelMetrics.value = [];
    return;
  }

  try {
    const { startDate, endDate } = getDateRange(timeRange.value);

    const { data, error } = await supabase.rpc('get_channel_analytics_data', {
      p_client_id: clientGaId.value,
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) throw error;
    gaChannelMetrics.value = data || [];

  } catch (err: any) {
    console.error('Error al cargar datos de canal de GA:', err);
    fetchError.value = 'No se pudieron cargar los datos de canal.';
    gaChannelMetrics.value = [];
  } finally {
    isLoadingChart.value = false;
  }
};

const fetchMostVisitedPages = async () => {
  if (!clientGaId.value) {
    mostVisitedPages.value = [];
    return;
  }

  try {
    const { startDate, endDate } = getDateRange(timeRange.value);

    const { data, error } = await supabase.rpc('get_most_visited_pages_data', {
      p_client_id: clientGaId.value,
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) throw error;
    gaPageMetrics.value = data || [];

    mostVisitedPages.value = gaPageMetrics.value.map(p => ({
      path: p.page_path,
      views: p.page_views,
      avgTime: p.avg_time_on_page
    }));

  } catch (err: any) {
    console.error('Error al cargar las páginas más visitadas:', err);
    fetchError.value = 'No se pudieron cargar las páginas más visitadas.';
    mostVisitedPages.value = [];
  } finally {
    isLoadingTable.value = false;
  }
};

const refreshData = async () => {
  fetchError.value = null;
  isLoading.value = true;
  isLoadingChart.value = true;
  isLoadingTable.value = true;

  try {
    if (!clientGaId.value) {
      await fetchClientInfo();
    }

    if (clientGaId.value) {
      await Promise.all([
        fetchGaDailyMetrics(),
        fetchGaDeviceMetrics(),
        fetchGaChannelMetrics(),
        fetchMostVisitedPages()
      ]);
    } else {
      gaDailyMetrics.value = [];
      gaDeviceMetrics.value = [];
      gaChannelMetrics.value = [];
      gaPageMetrics.value = [];
      mostVisitedPages.value = [];
      fetchError.value = 'No se pudo obtener el ID del cliente. Asegúrate de que el usuario esté vinculado y que el cliente tenga un GA Property ID.';
    }
  } catch (err: any) {
    console.error("Error en refreshData (general catch):", err);
    fetchError.value = `Error general al cargar los datos: ${err.message}`;
  } finally {
    isLoading.value = false;
    isLoadingChart.value = false;
    isLoadingTable.value = false;
    // Incrementa la key para forzar la recreación de las gráficas
    chartKey.value++;
  }
};

onMounted(async () => {
  checkLayoutSize(); // Verifica el tamaño inicial de la pantalla
  window.addEventListener('resize', checkLayoutSize); // Escucha cambios de tamaño
  await refreshData();
});

onUnmounted(() => { // This line caused the error if onUnmounted was not imported
  window.removeEventListener('resize', checkLayoutSize); // Limpia el listener
});

watch(timeRange, () => {
  refreshData();
});
</script>

<style scoped>
/* Layout */
.analytics-layout {
  /* Si el sidebar es fixed, el layout principal NO necesita ser display: flex */
  /* min-height: 100vh; */ /* Ya lo controla el body/html o un wrapper superior si es el caso */
  background-color: #1e1e1e;
  color: #ffffff;
}

.main-content {
  /* No necesitamos flex: 1 aquí directamente en relación al sidebar fixed */
  /* margin-left será controlado por la propiedad style dinámica */
  padding: 2rem;
  overflow-y: auto; /* Permite scroll vertical si el contenido es largo */
  min-height: 100vh; /* Asegura que el contenido ocupe al menos la altura de la vista */
  transition: margin-left 0.3s ease; /* Transición suave para el margen */
  box-sizing: border-box; /* Incluye padding en el cálculo del ancho/alto */
  width: auto; /* El ancho será el restante después del margen izquierdo */
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  background-color: #2a2a2a;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.time-select {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  background-color: #3b3b3b;
  color: #ffffff;
  border: 1px solid #92d000;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'%3e%3cpath d='M7 7l3 3 3-3m0 6l-3-3-3 3' stroke='%23ffffff' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 0.8em 0.8em;
  padding-right: 2.5rem;
  cursor: pointer;
}

.refresh-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  background-color: #92d000;
  color: #1e1e1e; /* Color de texto más oscuro para el botón de refrescar */
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.refresh-btn:hover {
  background-color: #7bb500;
}
.refresh-btn svg {
  color: #1e1e1e; /* Color del ícono en el botón de refrescar */
}

/* KPIs */
.kpis-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.kpi-card {
  background-color: #2a2a2a;
  border-radius: 1rem;
  padding: 1.5rem;
  border: 1px solid #3b3b3b;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
}

.kpi-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.kpi-title {
  font-size: 0.9rem;
  color: #aaa;
  margin: 0;
}

.kpi-value {
  font-size: 2.2rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0.5rem 0;
}

.kpi-trend {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.9rem;
  font-weight: 600;
}
.kpi-trend svg {
    width: 1rem;
    height: 1rem;
}

/* Charts */
.charts-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.chart-card {
  background-color: #2a2a2a;
  border-radius: 1rem;
  padding: 1.5rem;
  border: 1px solid #3b3b3b;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  position: relative;
  display: flex;
  flex-direction: column;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.chart-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
}

.chart-placeholder {
  text-align: center;
  color: #aaa;
  padding: 2rem;
  background-color: #3b3b3b;
  border-radius: 0.5rem;
  height: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
}

.chart-container {
  position: relative;
  height: 250px; /* Altura fija para gráficas */
  width: 100%;
  flex-grow: 1;
}

.chart-container-doughnut {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 250px; /* También altura fija para el donut */
}

/* Pages Table */
.pages-section {
  background-color: #2a2a2a;
  border-radius: 1rem;
  padding: 1.5rem;
  border: 1px solid #3b3b3b;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
}

.overflow-x-auto {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.pages-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.pages-table th,
.pages-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #444;
  color: #e0e0e0;
}

.pages-table th {
  font-weight: 600;
  color: #92d000;
  background-color: #3b3b3b;
}

.pages-table tbody tr {
  transition: background-color 0.2s ease;
}

.pages-table tbody tr:hover {
  background-color: #3b3b3b;
}

.pages-table tbody tr:last-child td {
  border-bottom: none;
}

.page-path {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Loading and Error */
.kpi-card.loading {
  background-color: #3b3b3b;
  border-radius: 1rem;
  padding: 1.5rem;
  animation: pulse 2s infinite alternate;
  height: 120px;
}

.error-message {
  color: #ff6b6b;
  background-color: rgba(255, 107, 107, 0.1);
  border: 1px solid #ff6b6b;
  padding: 1rem;
  border-radius: 0.5rem;
  text-align: center;
  margin-top: 2rem;
}

.no-data {
  color: #aaa;
  text-align: center;
  padding: 2rem;
  background-color: #3b3b3b;
  border-radius: 0.5rem;
}

/* Info Tooltip */
.info-tooltip {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.info-tooltip .tooltip-text {
  visibility: hidden;
  width: 200px;
  background-color: #333;
  color: #fff;
  text-align: center;
  border-radius: 6px;
  padding: 0.5rem;
  position: absolute;
  z-index: 1;
  bottom: 125%;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0;
  transition: opacity 0.3s;
  font-size: 0.8rem;
  font-weight: normal;
}

.info-tooltip:hover .tooltip-text {
  visibility: visible;
  opacity: 1;
}

/* Responsive Design */
@media (max-width: 1023px) { /* Coincide con la condición `isMobileLayout` */
  .main-content {
    margin-left: 0 !important; /* Desactiva el margen en móvil */
    padding-top: 4.5rem; /* Espacio para los botones de hamburguesa/notificaciones fijos */
    width: 100%; /* Ocupa todo el ancho disponible */
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem;
  }

  .page-title {
    font-size: 1.8rem;
  }

  .header-actions {
    width: 100%;
    flex-direction: column;
    gap: 0.5rem;
  }

  .time-select,
  .refresh-btn {
    width: 100%;
  }

  .kpis-section {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .charts-section {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .chart-card {
    padding: 1rem;
  }

  .chart-title {
    font-size: 1.1rem;
  }

  .pages-table th,
  .pages-table td {
    padding: 0.5rem 0.75rem;
  }

  .page-path {
    max-width: 150px;
  }
}

/* @media (min-width: 1024px) {
  // Ya no necesitamos esta media query específica aquí para el main-content
  // El margin-left ya es manejado por la propiedad style dinámica
} */

@media (min-width: 1024px) {
  .kpis-section {
    grid-template-columns: repeat(5, 1fr);
  }
}

@keyframes pulse {
  0% {
    opacity: 0.7;
  }
  100% {
    opacity: 1;
  }
}
</style>