<template>
  <div class="ads-page-content">
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
          <option value="30d">Últimos 30 días</option>
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
      <section class="kpis-section">
        <template v-if="isLoading">
          <div v-for="i in 5" :key="i" class="kpi-card loading"></div>
        </template>
        <template v-else-if="fetchError">
          <div class="error-message">{{ fetchError }}</div>
        </template>
        <template v-else>
          <div class="kpi-card">
            <div class="kpi-header">
              <p class="kpi-title">Inversión Total</p>
              <InfoTooltip text="Costo total de tus campañas" />
            </div>
            <h3 class="kpi-value">{{ formatCurrency(kpiSummary.totalCost) }}</h3>
          </div>
          <div class="kpi-card">
            <div class="kpi-header">
              <p class="kpi-title">Campañas Activas</p>
              <InfoTooltip text="Campañas activas" />
            </div>
            <h3 class="kpi-value">{{ formatNumber(kpiSummary.activeCampaigns) }}</h3>
          </div>
          <div class="kpi-card">
            <div class="kpi-header">
              <p class="kpi-title">Impresiones</p>
              <InfoTooltip text="Cantidad de anuncios mostrados" />
            </div>
            <h3 class="kpi-value">{{ formatNumber(kpiSummary.totalImpressions) }}</h3>
          </div>
          <div class="kpi-card">
            <div class="kpi-header">
              <p class="kpi-title">Clics</p>
              <InfoTooltip text="Número total de clics en anuncios" />
            </div>
            <h3 class="kpi-value">{{ formatNumber(kpiSummary.totalClicks) }}</h3>
          </div>
          <div class="kpi-card">
            <div class="kpi-header">
              <p class="kpi-title">CPC Promedio</p>
              <InfoTooltip text="Costo promedio pagado por cada clic" />
            </div>
            <h3 class="kpi-value">{{ formatCurrency(kpiSummary.avgCpc) }}</h3>
          </div>
        </template>
      </section>

      <section class="charts-section">
        <div class="chart-card">
          <div class="chart-header">
            <h3 class="chart-title">Conversiones y Clics por Día</h3>
          </div>
          <template v-if="isLoading || fetchError">
            <div class="chart-placeholder">{{ fetchError ? 'Error al cargar la gráfica.' : 'Cargando gráfica...' }}</div>
          </template>
          <template v-else>
            <div class="chart-container">
              <Line :data="conversionsClicksChartData" :options="conversionsClicksChartOptions" />
            </div>
          </template>
        </div>
      </section>

      <section class="campaigns-section">
        <div class="campaigns-card">
          <div class="campaigns-header">
            <h3 class="campaigns-title">Campañas Activas</h3>
            <div class="campaigns-count">{{ campaignsData.length }} campañas</div>
          </div>
          <template v-if="isLoading || fetchError">
            <div class="campaigns-placeholder">{{ fetchError ? 'Error al cargar las campañas.' : 'Cargando campañas...' }}</div>
          </template>
          <template v-else-if="campaignsData.length === 0">
            <div class="campaigns-placeholder">No hay campañas activas en el período seleccionado.</div>
          </template>
          <template v-else>
            <div class="campaigns-table-container">
              <table class="campaigns-table">
                <thead>
                  <tr>
                    <th>Campaña</th>
                    <th>Impresiones</th>
                    <th>CPC</th>
                    <th>Costo Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="campaign in campaignsData" :key="campaign.id" class="campaign-row">
                    <td class="campaign-name">{{ campaign.name }}</td>
                    <td class="campaign-metric">{{ formatNumber(campaign.impressions) }}</td>
                    <td class="campaign-metric">{{ formatCurrency(campaign.clicks > 0 ? campaign.cost / campaign.clicks : 0) }}</td>
                    <td class="campaign-metric campaign-cost">{{ formatCurrency(campaign.cost) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { supabase } from '@/lib/supabaseClient';
import { RefreshCw, CalendarDays, Clock } from 'lucide-vue-next';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'vue-chartjs';
import InfoTooltip from '@/components/InfoTooltip.vue';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const isLoading = ref(true);
const timeRange = ref('30d');
const fetchError = ref<string | null>(null);
const performanceReport = ref<any[]>([]);

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
  if (performanceReport.value.length === 0) {
    return { totalCost: 0, activeCampaigns: 0, totalImpressions: 0, totalClicks: 0, avgCpc: 0, totalConversions: 0 };
  }
  const totalCost = performanceReport.value.reduce((sum, row) => sum + (row.cost_micros || 0), 0) / 1000000;
  const totalImpressions = performanceReport.value.reduce((sum, row) => sum + (row.impressions || 0), 0);
  const totalClicks = performanceReport.value.reduce((sum, row) => sum + (row.clicks || 0), 0);
  const totalConversions = performanceReport.value.reduce((sum, row) => sum + (row.conversions || 0), 0);
  const avgCpc = totalClicks > 0 ? totalCost / totalClicks : 0;
  
  // Usar la misma lógica que campaignsData para coherencia
  const campaignMap = new Map();
  performanceReport.value.forEach(row => {
    const campaignName = row.campaign_name || `Campaña ${row.campaign_id || 'Sin ID'}`;
    const campaignKey = campaignName.toLowerCase().trim();
    
    if ((row.impressions > 0 || row.clicks > 0 || row.cost_micros > 0) && !campaignMap.has(campaignKey)) {
      campaignMap.set(campaignKey, true);
    }
  });
  
  const activeCampaigns = campaignMap.size;
  
  return { totalCost, activeCampaigns, totalImpressions, totalClicks, avgCpc, totalConversions };
});

const conversionsClicksChartData = computed(() => {
  const sortedReport = [...performanceReport.value].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const labels = sortedReport.map(d => new Date(d.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }));
  
  return {
    labels,
    datasets: [
      {
        label: 'Clics',
        data: sortedReport.map(d => d.clicks || 0),
        borderColor: '#92d000',
        backgroundColor: 'rgba(146, 208, 0, 0.1)',
        borderWidth: 3,
        fill: true,
        yAxisID: 'y',
        tension: 0.4,
        pointBackgroundColor: '#92d000',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#92d000',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 3,
      },
      {
        label: 'Conversiones',
        data: sortedReport.map(d => d.conversions || 0),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 3,
        fill: true,
        yAxisID: 'y1',
        tension: 0.4,
        pointBackgroundColor: '#f59e0b',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#f59e0b',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 3,
      }
    ]
  };
});

const conversionsClicksChartOptions: any = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { 
    mode: 'index' as const, 
    intersect: false 
  },
  plugins: {
    legend: {
      display: true,
      position: 'top' as const,
      align: 'end' as const,
      labels: {
        color: '#ffffff',
        font: {
          size: 13,
          weight: 'normal' as const
        },
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 20,
        boxWidth: 8,
        boxHeight: 8
      }
    },
    tooltip: {
      enabled: true,
      mode: 'index',
      intersect: false,
      backgroundColor: 'rgba(26, 26, 26, 0.98)',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      borderColor: '#92d000',
      borderWidth: 2,
      cornerRadius: 8,
      displayColors: true,
      padding: 16,
      titleFont: {
        size: 14,
        weight: 'bold' as const
      },
      bodyFont: {
        size: 13
      },
      caretSize: 8,
      caretPadding: 10,
      titleMarginBottom: 10,
      bodySpacing: 6,
      xPadding: 16,
      yPadding: 16,
      callbacks: {
        title: function(context: any) {
          return context[0].label || '';
        },
        label: function(context: any) {
          const label = context.dataset.label || '';
          const value = context.parsed.y || 0;
          const formattedValue = Math.round(value).toLocaleString('es-MX');
          return `${label}: ${formattedValue}`;
        }
      }
    }
  },
  scales: {
    y: { 
      type: 'linear' as const, 
      display: true, 
      position: 'left' as const,
      title: {
        display: true,
        text: 'Clics',
        color: '#92d000',
        font: {
          size: 12,
          weight: '600'
        }
      },
      grid: { 
        color: 'rgba(255, 255, 255, 0.08)',
        lineWidth: 1
      }, 
      ticks: { 
        color: '#A0A5B1',
        font: {
          size: 11
        },
        padding: 8,
        callback: function(value: any) {
          return value.toLocaleString('es-MX');
        }
      },
      border: {
        color: 'rgba(255, 255, 255, 0.1)'
      }
    },
    y1: { 
      type: 'linear' as const, 
      display: true, 
      position: 'right' as const,
      title: {
        display: true,
        text: 'Conversiones',
        color: '#f59e0b',
        font: {
          size: 12,
          weight: 'bold' as const
        }
      },
      grid: { 
        drawOnChartArea: false,
        color: 'rgba(255, 255, 255, 0.08)'
      }, 
      ticks: { 
        color: '#A0A5B1',
        font: {
          size: 11
        },
        padding: 8,
        callback: function(value: any) {
          return value.toLocaleString('es-MX');
        }
      },
      border: {
        color: 'rgba(255, 255, 255, 0.1)'
      }
    },
    x: { 
      grid: { 
        display: false 
      }, 
      ticks: { 
        color: '#A0A5B1',
        font: {
          size: 11
        },
        padding: 8
      },
      border: {
        color: 'rgba(255, 255, 255, 0.1)'
      }
    }
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

    const { startDate, endDate } = getDateRange(timeRange.value);

    const { data, error } = await supabase
      .from('ads_performance_cache')
      .select('*')
      .eq('cliente_id', clientData.id)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) throw error;
    performanceReport.value = data || [];
  } catch (err: any) {
    fetchError.value = `No se pudieron cargar los datos: ${err.message}`;
  } finally {
    isLoading.value = false;
  }
}

const campaignsData = computed(() => {
  if (performanceReport.value.length === 0) return [];
  
  const campaignMap = new Map();
  
  performanceReport.value.forEach(row => {
    // Mejorar el manejo de nombres de campaña
    const campaignName = row.campaign_name?.trim() || `Campaña ${row.campaign_id || 'Sin ID'}`;
    const campaignKey = campaignName.toLowerCase().trim();
    
    if (!campaignMap.has(campaignKey)) {
      campaignMap.set(campaignKey, {
        id: row.campaign_id || campaignKey,
        name: campaignName,
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversions: 0
      });
    }
    
    const campaign = campaignMap.get(campaignKey);
    campaign.impressions += row.impressions || 0;
    campaign.clicks += row.clicks || 0;
    campaign.cost += (row.cost_micros || 0) / 1000000;
    campaign.conversions += row.conversions || 0;
  });
  
  return Array.from(campaignMap.values())
    .filter(campaign => campaign.impressions > 0 || campaign.clicks > 0 || campaign.cost > 0)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 15); // Aumentar a 15 para más campañas
});

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
/* MODERN DESIGN MATCHING GA4.VUE */
.ads-page-content {
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

.date-icon {
  width: 20px;
  height: 20px;
  color: #92d000;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
}

.date-info-secondary {
  padding-left: 2px;
}

.date-range-display {
  font-size: 1.1rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
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

.time-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.refresh-btn svg {
  color: #1e1e1e;
}

.rotating {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.analytics-main {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.kpis-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
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

.charts-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 1.5rem;
}

/* Asegurar que los tooltips de Chart.js sean visibles */
:deep(.chartjs-tooltip) {
  z-index: 9999 !important;
  opacity: 1 !important;
}

/* Contenedor global para tooltips */
:global(.chartjs-tooltip) {
  z-index: 9999 !important;
  opacity: 1 !important;
}

.chart-card {
  background: linear-gradient(135deg, #2a2a2a 0%, #252525 100%);
  border-radius: 1rem;
  padding: 1.5rem;
  border: 1px solid #3b3b3b;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2);
  position: relative;
  overflow: hidden;
}

.chart-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #92d000, #60a5fa);
  border-radius: 1rem 1rem 0 0;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.chart-title {
  font-size: 1.4rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
  background: linear-gradient(135deg, #ffffff, #e0e0e0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.chart-container {
  position: relative;
  height: 350px;
  width: 100%;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 0.75rem;
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  z-index: 10;
  overflow: visible;
}

.chart-placeholder {
  text-align: center;
  color: #aaa;
  padding: 3rem 2rem;
  background: linear-gradient(135deg, #3b3b3b, #333333);
  border-radius: 0.75rem;
  min-height: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.error-message {
  color: #ff6b6b;
  background-color: rgba(255, 107, 107, 0.1);
  border: 1px solid #ff6b6b;
  padding: 1rem;
  border-radius: 0.5rem;
  text-align: center;
  grid-column: 1 / -1;
}

.kpi-card.loading {
  background-color: #3b3b3b;
  border-radius: 1rem;
  padding: 1.5rem;
  animation: pulse 1.5s infinite alternate;
  min-height: 120px;
}

@keyframes pulse {
  from { opacity: 0.7; }
  to { opacity: 1; }
}

/* CAMPAIGNS SECTION STYLES */
.campaigns-section {
  margin-top: 1rem;
}

.campaigns-card {
  background: linear-gradient(135deg, #2a2a2a 0%, #252525 100%);
  border-radius: 1rem;
  padding: 1.5rem;
  border: 1px solid #3b3b3b;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2);
  position: relative;
  overflow: hidden;
}

.campaigns-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #92d000, #f59e0b);
  border-radius: 1rem 1rem 0 0;
}

.campaigns-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.campaigns-title {
  font-size: 1.4rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
  background: linear-gradient(135deg, #ffffff, #e0e0e0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.campaigns-count {
  background: rgba(146, 208, 0, 0.15);
  color: #92d000;
  padding: 0.5rem 1rem;
  border-radius: 50px;
  font-size: 0.85rem;
  font-weight: 600;
  border: 1px solid rgba(146, 208, 0, 0.3);
}

.campaigns-table-container {
  overflow-x: auto;
  border-radius: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.campaigns-table {
  width: 100%;
  border-collapse: collapse;
  background: transparent;
}

.campaigns-table th {
  background: linear-gradient(135deg, #3b3b3b, #333333);
  color: #92d000;
  font-weight: 600;
  font-size: 0.9rem;
  padding: 1rem;
  text-align: left;
  border-bottom: 2px solid rgba(146, 208, 0, 0.3);
  position: sticky;
  top: 0;
  z-index: 1;
}

.campaigns-table th:first-child {
  border-radius: 0.75rem 0 0 0;
}

.campaigns-table th:last-child {
  border-radius: 0 0.75rem 0 0;
}

.campaign-row {
  transition: all 0.2s ease;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.campaign-row:hover {
  background: rgba(146, 208, 0, 0.08);
  transform: translateX(2px);
}

.campaign-row:last-child {
  border-bottom: none;
}

.campaign-name {
  font-weight: 500;
  color: #ffffff;
  padding: 1rem;
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.campaign-metric {
  color: #e0e0e0;
  padding: 1rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-size: 0.9rem;
}

.campaign-cost {
  color: #92d000;
  font-weight: 600;
}

.campaigns-placeholder {
  text-align: center;
  color: #aaa;
  padding: 3rem 2rem;
  background: linear-gradient(135deg, #3b3b3b, #333333);
  border-radius: 0.75rem;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* RESPONSIVE DESIGN */
@media (max-width: 820px) {
  .header-divider {
    display: none;
  }
  
  .page-controls-header {
    justify-content: center;
  }
}

@media (max-width: 1023px) {
  .ads-page-content {
    padding: 1rem;
  }
  
  .kpi-value {
    font-size: 1.8rem;
  }
  
  .chart-card {
    padding: 1rem;
  }
  
  .chart-title {
    font-size: 1.2rem;
  }
  
  .chart-container {
    height: 300px;
    padding: 0.75rem;
  }
  
  .campaigns-card {
    padding: 1rem;
  }
  
  .campaigns-title {
    font-size: 1.2rem;
  }
}

@media (max-width: 767px) {
  .kpis-section {
    grid-template-columns: 1fr 1fr;
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
  
  .time-select,
  .refresh-btn {
    width: 100%;
  }
  
  .chart-container {
    height: 280px;
    padding: 0.5rem;
  }
  
  .campaigns-table th,
  .campaigns-table td {
    padding: 0.75rem 0.5rem;
    font-size: 0.8rem;
  }
  
  .campaign-name {
    max-width: 150px;
  }
}

@media (max-width: 480px) {
  .kpis-section {
    grid-template-columns: 1fr;
  }
  
  .campaigns-table-container {
    overflow-x: scroll;
  }
  
  .campaigns-table {
    min-width: 600px;
  }
}
</style>
