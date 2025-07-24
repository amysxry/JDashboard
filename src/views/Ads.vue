<template>
  <div class="page-wrapper">
    <header class="page-header">
      <div class="header-content">
        <h1 class="page-title">Google Ads</h1>
        <p class="page-subtitle">{{ dateDisplayString }}</p>
      </div>
      <div class="header-actions">
        <select v-model="timeRange" @change="fetchData" class="time-select" :disabled="isLoading">
          <option value="30d">Últimos 30 días</option>
          <option value="14d">Últimos 14 días</option>
          <option value="7d">Últimos 7 días</option>
        </select>
        <button @click="fetchData" class="refresh-btn" :disabled="isLoading" title="Actualizar datos">
          <RefreshCw class="icon" :class="{ 'rotating': isLoading }" />
        </button>
      </div>
    </header>

    <main class="main-content">
      <section v-if="isLoading" class="kpi-grid">
        <div v-for="i in 5" :key="i" class="kpi-card-skeleton"></div>
      </section>
      <section v-else-if="fetchError" class="error-container">
        <p>{{ fetchError }}</p>
      </section>

      <template v-else>
        <section class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-header">
              <p class="kpi-title">Inversión Total</p>
              <InfoTooltip text="Costo total de tus campañas en el período seleccionado." />
            </div>
            <h3 class="kpi-value">{{ formatCurrency(kpiSummary.totalCost) }}</h3>
          </div>
          <div class="kpi-card">
            <div class="kpi-header">
              <p class="kpi-title">Impresiones</p>
              <InfoTooltip text="Número de veces que tus anuncios fueron mostrados." />
            </div>
            <h3 class="kpi-value">{{ formatNumber(kpiSummary.totalImpressions) }}</h3>
          </div>
          <div class="kpi-card">
            <div class="kpi-header">
              <p class="kpi-title">Clics</p>
              <InfoTooltip text="Número total de clics en tus anuncios." />
            </div>
            <h3 class="kpi-value">{{ formatNumber(kpiSummary.totalClicks) }}</h3>
          </div>
          <div class="kpi-card">
            <div class="kpi-header">
              <p class="kpi-title">CPC Promedio</p>
              <InfoTooltip text="Costo promedio que has pagado por cada clic (Costo / Clics)." />
            </div>
            <h3 class="kpi-value">{{ formatCurrency(kpiSummary.avgCpc) }}</h3>
          </div>
          <div class="kpi-card">
            <div class="kpi-header">
              <p class="kpi-title">Conversiones</p>
              <InfoTooltip text="Acciones valiosas (como compras o leads) completadas por los usuarios." />
            </div>
            <h3 class="kpi-value">{{ formatNumber(kpiSummary.totalConversions, 2) }}</h3>
          </div>
        </section>

        <section class="chart-section">
          <div class="chart-card">
            <div class="kpi-header">
              <h3 class="chart-title">Rendimiento a lo largo del tiempo</h3>
              <InfoTooltip text="Evolución de clics, impresiones y costo a lo largo del período." />
            </div>
            <div class="chart-container">
              <Line :data="performanceChartData" :options="chartOptions" />
            </div>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { supabase } from '@/lib/supabaseClient';
import { RefreshCw } from 'lucide-vue-next';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'vue-chartjs';
import InfoTooltip from '@/components/InfoTooltip.vue';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const isLoading = ref(true);
const timeRange = ref('30d');
const fetchError = ref<string | null>(null);
const performanceReport = ref<any[]>([]);

const dateDisplayString = computed(() => {
  const endDate = new Date();
  const startDate = new Date();
  let days = 30;
  switch (timeRange.value) {
    case '14d': days = 14; break;
    case '7d': days = 7; break;
  }
  startDate.setDate(endDate.getDate() - (days - 1));
  const formatDate = (date: Date) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(date);
  return `${formatDate(startDate)} - ${formatDate(endDate)}, ${endDate.getFullYear()}`;
});

const kpiSummary = computed(() => {
  if (performanceReport.value.length === 0) {
    return { totalCost: 0, totalImpressions: 0, totalClicks: 0, avgCpc: 0, totalConversions: 0 };
  }
  const totalCost = performanceReport.value.reduce((sum, row) => sum + (row.cost_micros || 0), 0) / 1000000;
  const totalImpressions = performanceReport.value.reduce((sum, row) => sum + (row.impressions || 0), 0);
  const totalClicks = performanceReport.value.reduce((sum, row) => sum + (row.clicks || 0), 0);
  const totalConversions = performanceReport.value.reduce((sum, row) => sum + (row.conversions || 0), 0);
  const avgCpc = totalClicks > 0 ? totalCost / totalClicks : 0;
  return { totalCost, totalImpressions, totalClicks, avgCpc, totalConversions };
});

const performanceChartData = computed(() => {
  const sortedReport = [...performanceReport.value].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const labels = sortedReport.map(d => new Date(d.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }));
  
  return {
    labels,
    datasets: [
      {
        label: 'Clics',
        data: sortedReport.map(d => d.clicks),
        borderColor: 'var(--color-accent-green)',
        yAxisID: 'y',
        tension: 0.3,
      },
      {
        label: 'Impresiones',
        data: sortedReport.map(d => d.impressions),
        borderColor: '#A0A5B1',
        yAxisID: 'y1',
        tension: 0.3,
      }
    ]
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  scales: {
    y: { type: 'linear', display: true, position: 'left', grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#A0A5B1' } },
    y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#A0A5B1' } },
    x: { grid: { display: false }, ticks: { color: '#A0A5B1' } }
  }
};

async function fetchData() {
  isLoading.value = true;
  fetchError.value = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const { data: clientData } = await supabase.from('clientes').select('id').eq('auth_id', user.id).single();
    if (!clientData) throw new Error("Cliente no encontrado");

    const endDate = new Date();
    const startDate = new Date();
    let days = 30;
    switch (timeRange.value) {
      case '14d': days = 14; break;
      case '7d': days = 7; break;
    }
    startDate.setDate(endDate.getDate() - (days - 1));
    const formatDateToISO = (date: Date) => date.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('ads_performance_cache')
      .select('*')
      .eq('cliente_id', clientData.id)
      .gte('date', formatDateToISO(startDate))
      .lte('date', formatDateToISO(endDate));

    if (error) throw error;
    performanceReport.value = data || [];
  } catch (err: any) {
    fetchError.value = `No se pudieron cargar los datos: ${err.message}`;
  } finally {
    isLoading.value = false;
  }
}

function formatCurrency(value: number) {
  return `$${(value || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}
function formatNumber(value: number, decimals = 0) {
  return (value || 0).toLocaleString('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

onMounted(fetchData);
watch(timeRange, fetchData);
</script>

<style scoped>
/* Estilos consistentes con el resto de la app */
:root { --color-bg: #1F2228; --color-bg-card: #2A2F37; --color-border: #3A404A; --color-text-primary: #F5F5F5; --color-text-secondary: #A0A5B1; --color-accent-green: #00DC82; }
.page-wrapper { background-color: var(--color-bg); padding: 1.5rem 2rem; font-family: 'Inter', sans-serif; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem; }
.page-title { font-size: 1.75rem; font-weight: 600; color: var(--color-text-primary); }
.page-subtitle { color: var(--color-text-secondary); font-size: 0.9rem; }
.header-actions { display: flex; gap: 1rem; }
.time-select, .refresh-btn { background-color: var(--color-bg-card); color: var(--color-text-secondary); border: 1px solid var(--color-border); border-radius: 8px; padding: 0.6rem 1rem; cursor: pointer; }
.refresh-btn { padding: 0.6rem; }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; margin-bottom: 2.5rem; }
.kpi-card { background-color: var(--color-bg-card); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--color-border); }
.kpi-header { display: flex; justify-content: space-between; align-items: center; }
.kpi-title { color: var(--color-text-secondary); font-size: 0.9rem; margin: 0; }
.kpi-value { font-size: 2.2rem; font-weight: 600; color: var(--color-accent-green); margin-top: 0.5rem; }
.chart-section { margin-top: 2rem; }
.chart-card { background-color: var(--color-bg-card); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--color-border); }
.chart-title { color: var(--color-text-primary); font-size: 1.25rem; font-weight: 600; }
.chart-container { height: 300px; margin-top: 1.5rem; }
.kpi-card-skeleton { background-color: var(--color-bg-card); border-radius: 12px; border: 1px solid var(--color-border); min-height: 120px; }
.error-container { color: #FF453A; }
</style>
