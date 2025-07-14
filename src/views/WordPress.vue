<template>
  <div class="page-wrapper">
    <header class="page-header">
      <div class="header-content">
        <h1 class="page-title">WooCommerce</h1>
        <p class="page-subtitle">{{ dateDisplayString }}</p>
      </div>
      <div class="header-actions">
        <select v-model="timeRange" @change="fetchData" class="time-select" :disabled="isLoading">
          <option value="month">Último mes</option>
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
        <div v-for="i in 3" :key="i" class="kpi-card-skeleton">
          <div class="skeleton-line title"></div>
          <div class="skeleton-line value"></div>
          <div class="skeleton-line trend"></div>
        </div>
      </section>

      <section v-else-if="fetchError" class="error-container">
        <div class="error-box">
          <AlertTriangle class="error-icon" />
          <h3 class="error-title">Ocurrió un error</h3>
          <p class="error-message">{{ fetchError }}</p>
          <button @click="fetchData" class="retry-btn">Reintentar</button>
        </div>
      </section>

      <template v-else>
        <section class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-header">
              <p class="kpi-title">Ingresos Totales</p>
              <InfoTooltip text="Suma total de todas las ventas de pedidos completados en el período, incluyendo impuestos y envío." />
            </div>
            <h3 class="kpi-value">{{ formatCurrency(kpiSummary.totalSales) }}</h3>
            <div class="kpi-trend" :class="getTrendClass(salesChange)">
              <component :is="salesChange >= 0 ? ArrowUpIcon : ArrowDownIcon" class="trend-icon" />
              <span>{{ salesChange.toFixed(2) }}% vs período anterior</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header">
              <p class="kpi-title">Pedidos Realizados</p>
              <InfoTooltip text="Número total de pedidos únicos marcados como 'Completado' en el período seleccionado." />
            </div>
            <h3 class="kpi-value">{{ kpiSummary.totalOrders }}</h3>
             <div class="kpi-trend" :class="getTrendClass(ordersChange)">
              <component :is="ordersChange >= 0 ? ArrowUpIcon : ArrowDownIcon" class="trend-icon" />
              <span>{{ ordersChange.toFixed(2) }}% vs período anterior</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header">
              <p class="kpi-title">Ticket Promedio</p>
              <InfoTooltip text="Valor promedio de cada pedido (Ingresos Totales / Pedidos Realizados)." />
            </div>
            <h3 class="kpi-value">{{ formatCurrency(kpiSummary.averageTicket) }}</h3>
            <div class="kpi-trend-placeholder"></div>
          </div>
        </section>

        <section class="chart-section">
          <div class="chart-card">
            <div class="kpi-header">
              <h3 class="chart-title">Ingresos por Día</h3>
              <InfoTooltip text="Evolución diaria de los ingresos totales generados por los pedidos completados." />
            </div>
            <div class="chart-container">
                <Line :data="salesChartData" :options="chartOptions" />
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
import { RefreshCw, AlertTriangle, ArrowUpIcon, ArrowDownIcon } from 'lucide-vue-next';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'vue-chartjs';
import InfoTooltip from '@/components/InfoTooltip.vue';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const isLoading = ref(true);
const timeRange = ref('month');
const fetchError = ref<string | null>(null);

const salesReport = ref<any[]>([]);
const previousSalesReport = ref<any[]>([]);

const salesChange = ref(0);
const ordersChange = ref(0);

const dateRanges = computed(() => {
  const endDate = new Date();
  const startDate = new Date();
  let days = 30;

  switch(timeRange.value) {
    case '14d':
      days = 14;
      startDate.setDate(endDate.getDate() - 14);
      break;
    case '7d':
      days = 7;
      startDate.setDate(endDate.getDate() - 7);
      break;
    case 'month':
    default:
      days = 30;
      startDate.setMonth(endDate.getMonth() - 1);
      break;
  }

  const previousEndDate = new Date(startDate);
  previousEndDate.setDate(previousEndDate.getDate() - 1);
  const previousStartDate = new Date(previousEndDate);
  previousStartDate.setDate(previousStartDate.getDate() - days);

  return { startDate, endDate, previousStartDate, previousEndDate };
});

const dateDisplayString = computed(() => {
  const { startDate, endDate } = dateRanges.value;
  const formatDate = (date: Date) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(date);
  return `${formatDate(startDate)} - ${formatDate(endDate)}, ${endDate.getFullYear()}`;
});

const kpiSummary = computed(() => {
  if (!salesReport.value || salesReport.value.length === 0) {
    return { totalSales: 0, totalOrders: 0, averageTicket: 0 };
  }
  const totalSales = salesReport.value.reduce((sum, row) => sum + parseFloat(row.total_sales || 0), 0);
  const totalOrders = salesReport.value.reduce((sum, row) => sum + (row.total_orders || 0), 0);
  const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
  return { totalSales, totalOrders, averageTicket };
});

watch([kpiSummary, previousSalesReport], () => {
  const currentSales = kpiSummary.value.totalSales;
  const currentOrders = kpiSummary.value.totalOrders;

  const previousSales = previousSalesReport.value.reduce((sum, row) => sum + parseFloat(row.total_sales || 0), 0);
  const previousOrders = previousSalesReport.value.reduce((sum, row) => sum + (row.total_orders || 0), 0);

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };
  
  salesChange.value = calculateChange(currentSales, previousSales);
  ordersChange.value = calculateChange(currentOrders, previousOrders);
});

const getTrendClass = (value: number) => {
    return value >= 0 ? 'trend-up' : 'trend-down';
};

const salesChartData = computed(() => {
    const sortedReport = [...salesReport.value].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const labels = sortedReport.map(d => new Date(d.date + 'T00:00:00').toLocaleDateString('es-ES', {day: 'numeric', month: 'short'}));
    const data = sortedReport.map(d => parseFloat(d.total_sales || 0));

    return {
        labels,
        datasets: [{
            label: 'Ingresos Totales',
            data,
            borderColor: 'var(--color-accent-green)',
            backgroundColor: 'rgba(0, 220, 130, 0.1)',
            tension: 0.3,
            fill: true,
        }]
    };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#A0A5B1' } },
    x: { grid: { display: false }, ticks: { color: '#A0A5B1' } }
  }
};

const fetchData = async () => {
  isLoading.value = true;
  fetchError.value = null;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const { data: clientData } = await supabase.from('clientes').select('id').eq('auth_id', user.id).single();
    if (!clientData) throw new Error("No se pudo vincular el usuario a un cliente.");

    const { startDate, endDate, previousStartDate, previousEndDate } = dateRanges.value;
    const formatDateToISO = (date: Date) => date.toISOString().split('T')[0];

    const [currentPeriodResult, previousPeriodResult] = await Promise.all([
      supabase
        .from('wc_sales_cache')
        .select('*')
        .eq('cliente_id', clientData.id)
        .gte('date', formatDateToISO(startDate))
        .lte('date', formatDateToISO(endDate)),
      supabase
        .from('wc_sales_cache')
        .select('*')
        .eq('cliente_id', clientData.id)
        .gte('date', formatDateToISO(previousStartDate))
        .lte('date', formatDateToISO(previousEndDate))
    ]);

    if (currentPeriodResult.error) throw currentPeriodResult.error;
    if (previousPeriodResult.error) throw previousPeriodResult.error;
    
    salesReport.value = currentPeriodResult.data || [];
    previousSalesReport.value = previousPeriodResult.data || [];

  } catch (err: any) {
    console.error("Error detallado en fetchData:", err);
    fetchError.value = `No se pudieron cargar los datos. Detalle: ${err.message}`;
  } finally {
    isLoading.value = false;
  }
};

// --- CORRECCIÓN AQUÍ ---
function formatCurrency(value: number) {
  if (isNaN(value)) return '$0.00';
  return `$${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
/* Tus estilos de antes, más los nuevos para las mejoras */
:root {
  --color-bg: #1F2228;
  --color-bg-card: #2A2F37;
  --color-border: #3A404A;
  --color-text-primary: #F5F5F5;
  --color-text-secondary: #A0A5B1;
  --color-accent-green: #00DC82;
  --color-error: #FF453A;
  --color-trend-up: #00DC82;
  --color-trend-down: #FF453A;
}
.page-wrapper {
  background-color: var(--color-bg);
  padding: 1.5rem 2rem;
  font-family: 'Inter', sans-serif;
  width: 100%;
  box-sizing: border-box;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-bottom: 2.5rem;
}
.page-title {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}
.page-subtitle {
  color: var(--color-text-secondary);
  margin-top: 0.25rem;
  font-size: 0.9rem;
}
.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}
.time-select {
  padding: 0.6rem 1rem;
  border-radius: 8px;
  background-color: var(--color-bg-card);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  cursor: pointer;
  font-size: 0.9rem;
  transition: border-color 0.2s;
}
.time-select:hover { border-color: #555; }
.refresh-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background-color: var(--color-bg-card);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.2s;
}
.refresh-btn:hover:not(:disabled) {
  color: var(--color-text-primary);
  border-color: #555;
}
.refresh-btn .icon.rotating { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* KPIs y Gráficas */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2.5rem; /* Espacio antes de la gráfica */
}
.kpi-card {
  background-color: var(--color-bg-card);
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.kpi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
.kpi-title {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  margin: 0;
}
.kpi-value {
  font-size: 2.5rem;
  font-weight: 600;
  color: var(--color-accent-green);
  letter-spacing: -1.5px;
  margin: 0;
  line-height: 1;
}
.kpi-trend {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.8rem;
    font-weight: 500;
    margin-top: auto; /* Empuja hacia abajo */
    padding-top: 0.5rem;
}
.kpi-trend.trend-up { color: var(--color-trend-up); }
.kpi-trend.trend-down { color: var(--color-trend-down); }
.kpi-trend .trend-icon { width: 14px; height: 14px; }
.kpi-trend-placeholder { min-height: 22px; /* Mantiene el espacio alineado */}

/* Nueva sección de gráfica */
.chart-section {
  margin-top: 2rem;
}
.chart-card {
  background-color: var(--color-bg-card);
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid var(--color-border);
}
.chart-title {
    color: var(--color-text-primary);
    font-size: 1.25rem;
    font-weight: 600;
}
.chart-container {
  height: 300px;
  position: relative;
  margin-top: 1.5rem;
}

/* Skeleton Loader */
.kpi-card-skeleton { background-color: var(--color-bg-card); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--color-border); display: flex; flex-direction: column; gap: 1.25rem; }
.skeleton-line { background: linear-gradient(90deg, var(--color-border) 25%, #3A404A 50%, var(--color-border) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 6px; }
.skeleton-line.title { width: 50%; height: 16px; }
.skeleton-line.value { width: 80%; height: 40px; }
.skeleton-line.trend { width: 60%; height: 14px; margin-top: 0.5rem; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* Contenedor de Error */
.error-container { display: flex; justify-content: center; padding: 4rem 2rem; }
.error-box { background-color: var(--color-bg-card); border: 1px solid var(--color-error); border-radius: 12px; padding: 2.5rem; text-align: center; max-width: 450px; }
.error-icon { width: 40px; height: 40px; color: var(--color-error); margin-bottom: 1rem; }
.error-title { font-size: 1.25rem; font-weight: 600; margin: 0 0 0.5rem 0; color: var(--color-text-primary); }
.error-message { color: var(--color-text-secondary); margin-bottom: 1.5rem; }
.retry-btn { background-color: var(--color-accent-green); color: #000; padding: 0.75rem 1.5rem; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.retry-btn:hover { filter: brightness(1.1); }

@media (max-width: 768px) {
  .page-wrapper { padding: 1rem; }
  .page-header { flex-direction: column; align-items: flex-start; }
  .header-actions { width: 100%; justify-content: flex-end; }
}
</style>