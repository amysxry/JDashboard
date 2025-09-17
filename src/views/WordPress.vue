<template>
  <div class="ga4-page-content">
    <header class="page-controls-header">
      <div class="header-info">
        <div class="date-info-main">
          <CalendarDays class="date-icon" />
          <p class="date-range-display">{{ dateDisplayString }}</p>
        </div>
        <div class="last-updated-info">
          <Clock class="update-icon" />
          <span>Datos actualizados diariamente</span>
        </div>
      </div>
      
      <div class="header-divider"></div>

      <div class="header-actions">
        <select v-model="timeRange" @change="fetchData" class="time-select" :disabled="isLoading">
          <option value="month">Últimos 30 días</option>
          <option value="14d">Últimos 14 días</option>
          <option value="7d">Últimos 7 días</option>
        </select>
        <button @click="fetchData" class="refresh-btn" :disabled="isLoading" title="Actualizar datos">
          <RefreshCw class="h-4 w-4" :class="{ 'rotating': isLoading }" />
          <span>Actualizar</span>
        </button>
      </div>
    </header>

    <main class="analytics-main">
      <section v-if="isLoading" class="kpis-section">
        <div v-for="i in 3" :key="i" class="kpi-card loading"></div>
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
        <section class="kpis-section">
          <div class="kpi-card">
            <div class="kpi-header">
              <p class="kpi-title">Ingresos Totales</p>
              <InfoTooltip text="Suma total de todas las ventas de pedidos completados en el período, incluyendo impuestos y envío." />
            </div>
            <h3 class="kpi-value">{{ formatCurrency(kpiSummary.totalSales) }}</h3>
            <div class="kpi-trend-placeholder"></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header">
              <p class="kpi-title">Pedidos Completados</p>
              <InfoTooltip text="Número total de pedidos únicos marcados como 'Completado' en el período seleccionado." />
            </div>
            <h3 class="kpi-value">{{ kpiSummary.totalOrders }}</h3>
            <div class="kpi-trend-placeholder"></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header">
              <p class="kpi-title">Ticket Promedio</p>
              <InfoTooltip text="Valor promedio de cada pedido (Ingresos Totales / Pedidos Completados)." />
            </div>
            <h3 class="kpi-value">{{ formatCurrency(kpiSummary.averageTicket) }}</h3>
            <div class="kpi-trend-placeholder"></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header">
              <p class="kpi-title">Ingresos Netos</p>
              <InfoTooltip text="Ingresos totales menos impuestos y costos de envío, cuando estén disponibles." />
            </div>
            <h3 class="kpi-value">{{ formatCurrency(kpiSummary.netSales) }}</h3>
            <div class="kpi-trend-placeholder"></div>
          </div>
        </section>

        <section class="charts-section">
          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">Ingresos por Día</h3>
              <InfoTooltip text="Evolución diaria de los ingresos totales generados por los pedidos completados." />
            </div>
            <div class="chart-container">
                <Line :data="salesChartData" :options="chartOptions" />
            </div>
          </div>
          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">Pedidos por Día</h3>
              <InfoTooltip text="Número de pedidos completados por día en el período seleccionado." />
            </div>
            <div class="chart-container">
                <Line :data="ordersChartData" :options="ordersChartOptions" />
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
import { RefreshCw, AlertTriangle, CalendarDays, Clock } from 'lucide-vue-next';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'vue-chartjs';
import InfoTooltip from '@/components/InfoTooltip.vue';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const isLoading = ref(true);
const timeRange = ref('month');
const fetchError = ref<string | null>(null);

const salesReport = ref<any[]>([]);
const previousSalesReport = ref<any[]>([]);

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
    case 'month':
    case '30d': 
      startDate.setDate(endDate.getDate() - 29); 
      break; 
      break; 
  } 
  const formatDateToISO = (date: Date) => { 
    const y = date.getFullYear(); 
    const m = (date.getMonth() + 1).toString().padStart(2, '0'); 
    const d = date.getDate().toString().padStart(2, '0'); 
    return `${y}-${m}-${d}`; 
  }; 
  return { 
    startDate: formatDateToISO(startDate), 
    endDate: formatDateToISO(endDate) 
  }; 
};

const dateRanges = computed(() => {
  const { startDate: startDateISO, endDate: endDateISO } = getDateRange(timeRange.value);
  const startDate = new Date(startDateISO + 'T00:00:00');
  const endDate = new Date(endDateISO + 'T00:00:00');
  
  let days = 30;
  switch(timeRange.value) {
    case '14d':
      days = 14;
      break;
    case '7d':
      days = 7;
      break;
    case 'month':
    default:
      days = 30;
      break;
  }

  const previousEndDate = new Date(startDate);
  previousEndDate.setDate(previousEndDate.getDate() - 1);
  const previousStartDate = new Date(previousEndDate);
  previousStartDate.setDate(previousStartDate.getDate() - (days - 1));

  return { startDate, endDate, previousStartDate, previousEndDate };
});

const dateDisplayString = computed(() => {
  const { startDate, endDate } = getDateRange(timeRange.value);
  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  };
  const startYear = new Date(startDate + 'T00:00:00').getFullYear();
  const endYear = new Date(endDate + 'T00:00:00').getFullYear();
  
  if (startYear !== endYear) {
    return `${formatDisplayDate(startDate)}, ${startYear} - ${formatDisplayDate(endDate)}, ${endYear}`;
  }
  return `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)} de ${endYear}`;
});

const kpiSummary = computed(() => {
  if (!salesReport.value || salesReport.value.length === 0) {
    return { 
      totalSales: 0, 
      totalOrders: 0, 
      averageTicket: 0, 
      netSales: 0
    };
  }
  const totalSales = salesReport.value.reduce((sum, row) => sum + parseFloat(row.total_sales || 0), 0);
  const netSales = salesReport.value.reduce((sum, row) => sum + parseFloat(row.net_sales || 0), 0);
  const totalOrders = salesReport.value.reduce((sum, row) => sum + (row.total_orders || 0), 0);
  const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
  
  return { totalSales, totalOrders, averageTicket, netSales };
});

watch([kpiSummary, previousSalesReport], () => {
  const currentSales = kpiSummary.value.totalSales;
  const currentOrders = kpiSummary.value.totalOrders;
  const currentNetSales = kpiSummary.value.netSales;

  const previousSales = previousSalesReport.value.reduce((sum, row) => sum + parseFloat(row.total_sales || 0), 0);
  const previousOrders = previousSalesReport.value.reduce((sum, row) => sum + (row.total_orders || 0), 0);
  const previousNetSales = previousSalesReport.value.reduce((sum, row) => sum + parseFloat(row.net_sales || 0), 0);
});

const ordersChartData = computed(() => {
    const sortedReport = [...salesReport.value].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const labels = sortedReport.map(d => new Date(d.date + 'T00:00:00').toLocaleDateString('es-ES', {day: 'numeric', month: 'short'}));
    const data = sortedReport.map(d => d.total_orders || 0);

    return {
        labels,
        datasets: [{
            label: 'Pedidos Completados',
            data,
            borderColor: '#60a5fa',
            backgroundColor: 'rgba(96, 165, 250, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#60a5fa',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverBackgroundColor: '#ffffff',
            pointHoverBorderColor: '#60a5fa',
            pointHoverBorderWidth: 3,
            pointHoverRadius: 6,
            borderWidth: 3,
        }]
    };
});

const ordersChartOptions: any = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: 'index' as const
  },
  plugins: { 
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      borderColor: '#60a5fa',
      borderWidth: 1,
      cornerRadius: 8,
      padding: 12,
      displayColors: false,
      callbacks: {
        title: function(context: any) {
          return `${context[0].label}`;
        },
        label: function(context: any) {
          const value = context.parsed.y;
          return `Pedidos: ${value}`;
        }
      }
    }
  },
  scales: {
    y: { 
      grid: { 
        color: 'rgba(255, 255, 255, 0.08)',
        borderColor: 'rgba(255, 255, 255, 0.1)'
      }, 
      ticks: { 
        color: '#aaa',
        font: { size: 12 },
        callback: function(value: any) {
          return value.toLocaleString();
        }
      },
      border: {
        display: false
      }
    },
    x: { 
      grid: { 
        display: false 
      }, 
      ticks: { 
        color: '#aaa',
        font: { size: 12 }
      },
      border: {
        display: false
      }
    }
  },
  elements: {
    line: {
      borderJoinStyle: 'round' as const,
      borderCapStyle: 'round' as const
    }
  }
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
            borderColor: '#92d000',
            backgroundColor: 'rgba(146, 208, 0, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#92d000',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverBackgroundColor: '#ffffff',
            pointHoverBorderColor: '#92d000',
            pointHoverBorderWidth: 3,
            pointHoverRadius: 6,
            borderWidth: 3,
        }]
    };
});

const chartOptions: any = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: 'index' as const
  },
  plugins: { 
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      borderColor: '#92d000',
      borderWidth: 1,
      cornerRadius: 8,
      padding: 12,
      displayColors: false,
      callbacks: {
        title: function(context: any) {
          return `${context[0].label}`;
        },
        label: function(context: any) {
          const value = context.parsed.y;
          return `Ingresos: $${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
        }
      }
    }
  },
  scales: {
    y: { 
      grid: { 
        color: 'rgba(255, 255, 255, 0.08)',
        borderColor: 'rgba(255, 255, 255, 0.1)'
      }, 
      ticks: { 
        color: '#aaa',
        font: { size: 12 },
        callback: function(value: any) {
          return '$' + value.toLocaleString();
        }
      },
      border: {
        display: false
      }
    },
    x: { 
      grid: { 
        display: false 
      }, 
      ticks: { 
        color: '#aaa',
        font: { size: 12 }
      },
      border: {
        display: false
      }
    }
  },
  elements: {
    line: {
      borderJoinStyle: 'round' as const,
      borderCapStyle: 'round' as const
    }
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

    const { startDate, endDate } = getDateRange(timeRange.value);
    
    // Calcular periodo anterior
    const startDateObj = new Date(startDate + 'T00:00:00');
    const previousEndDate = new Date(startDateObj);
    previousEndDate.setDate(previousEndDate.getDate() - 1);
    
    let days = 30;
    switch(timeRange.value) {
      case '14d': days = 14; break;
      case '7d': days = 7; break;
      case 'month': default: days = 30; break;
    }
    
    const previousStartDate = new Date(previousEndDate);
    previousStartDate.setDate(previousStartDate.getDate() - (days - 1));
    
    const formatDateToISO = (date: Date) => {
      const y = date.getFullYear();
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const d = date.getDate().toString().padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const [currentPeriodResult, previousPeriodResult] = await Promise.all([
      supabase
        .from('wc_sales_cache')
        .select('*')
        .eq('cliente_id', clientData.id)
        .gte('date', startDate)
        .lte('date', endDate),
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

function formatNumber(value: number) {
  if (isNaN(value)) return '0';
  return value.toLocaleString('es-MX');
}

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
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
  gap: 1.5rem;
  margin-bottom: 2rem;
  background-color: #2a2a2a;
  border-radius: 1rem;
  padding: 1.25rem 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid #3b3b3b;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.date-info-main {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
}

.date-range-display {
  font-size: 1.1rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
}

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

.time-select {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  background-color: #3b3b3b;
  color: #ffffff;
  border: 1px solid #92d000;
  appearance: none;
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
  color: #1e1e1e;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.refresh-btn:hover:not(:disabled) {
  background-color: #7bb500;
}

.refresh-btn svg {
  color: #1e1e1e;
}

.h-4 {
  width: 1rem;
  height: 1rem;
}

.w-4 {
  width: 1rem;
  height: 1rem;
}

.rotating {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.analytics-main {
  width: 100%;
}

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
  line-height: 1;
}

.kpi-trend {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.9rem;
  font-weight: 600;
  margin-top: auto;
  padding-top: 0.5rem;
}

.kpi-trend.text-green-500 {
  color: #92d000;
}

.kpi-trend.text-red-500 {
  color: #FF453A;
}

.kpi-trend svg {
  width: 1rem;
  height: 1rem;
}

.kpi-trend-placeholder {
  min-height: 22px;
}

.charts-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.chart-card {
  background: linear-gradient(135deg, #2a2a2a 0%, #2d2d2d 100%);
  border-radius: 1rem;
  padding: 1.5rem;
  border: 1px solid #3b3b3b;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  position: relative;
  overflow: hidden;
}

.chart-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #92d000 50%, transparent 100%);
  opacity: 0.6;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  position: relative;
  z-index: 1;
}

.chart-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.chart-container {
  position: relative;
  height: 300px;
  width: 100%;
  background: linear-gradient(135deg, rgba(146, 208, 0, 0.02) 0%, rgba(146, 208, 0, 0.05) 100%);
  border-radius: 0.5rem;
  padding: 1rem;
  margin-top: 0.5rem;
}

.kpi-card.loading {
  background-color: #3b3b3b;
  border-radius: 1rem;
  padding: 1.5rem;
  animation: pulse 1.5s infinite alternate;
  min-height: 150px;
}

@keyframes pulse {
  from { opacity: 0.7; }
  to { opacity: 1; }
}

.error-container {
  display: flex;
  justify-content: center;
  padding: 4rem 2rem;
}

.error-box {
  background-color: #2a2a2a;
  border: 1px solid #FF453A;
  border-radius: 1rem;
  padding: 2.5rem;
  text-align: center;
  max-width: 450px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.error-icon {
  width: 40px;
  height: 40px;
  color: #FF453A;
  margin-bottom: 1rem;
}

.error-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: #ffffff;
}

.error-message {
  color: #aaa;
  margin-bottom: 1.5rem;
}

.retry-btn {
  background-color: #92d000;
  color: #1e1e1e;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-btn:hover {
  background-color: #7bb500;
}

.date-icon {
    width: 20px;
    height: 20px;
    color: #92d000;
}

.last-updated-info { 
  display: flex; 
  align-items: center; 
  gap: 0.5rem; 
  font-size: 0.8rem; 
  color: #aaa; 
  padding-left: 2px; 
}

.update-icon { 
  width: 14px; 
  height: 14px; 
}

@media (max-width: 820px) {
  .header-divider {
    display: none;
  }
  .page-controls-header {
    justify-content: center;
  }
}

@media (max-width: 1023px) {
  .ga4-page-content {
    padding: 1rem;
  }
  .kpi-value {
    font-size: 1.8rem;
  }
  .chart-card {
    padding: 1rem;
  }
  .chart-title {
    font-size: 1.1rem;
  }
  .products-card {
    padding: 1rem;
  }
  .products-title {
    font-size: 1.2rem;
  }
}

@media (max-width: 767px) {
  .kpis-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
  .kpi-card {
    padding: 1rem;
  }
  .kpi-value {
    font-size: 1.6rem;
  }
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
  .products-table-container {
    font-size: 0.85rem;
  }
  .product-name {
    padding: 0.75rem;
  }
  .product-metric {
    padding: 0.75rem;
  }
  .product-title {
    max-width: 200px;
  }
}

@media (max-width: 480px) {
  .kpis-section {
    grid-template-columns: 1fr;
  }
  .products-table th,
  .products-table td {
    padding: 0.5rem;
    font-size: 0.8rem;
  }
  .product-title {
    max-width: 150px;
  }
  .percentage-bar {
    flex-direction: column;
    gap: 0.25rem;
    align-items: flex-start;
  }
  .percentage-fill {
    width: 100%;
    max-width: 80px;
  }
}
</style>