<template>
  <div class="dashboard-layout">
    <SidebarMenu v-model:collapsed="isSidebarCollapsed" />

    <div class="main-content">
      <header class="dashboard-header">
        <div class="header-content">
          <div class="welcome-section">
            <h1 class="dashboard-title">¡Bienvenido, {{ clientName }}! 👋</h1>
            <p class="welcome-subtitle">Aquí tienes un resumen de tu rendimiento digital</p>
          </div>
          <div class="header-actions">
            <button class="refresh-btn" @click="refreshData">
              <RefreshCw class="h-4 w-4" />
              <span>Actualizar datos</span>
            </button>
            <div class="user-profile">
              <span class="user-name">{{ clientName }}</span>
              <div class="avatar">
                <span class="initials">{{ getInitials(clientName) }}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main class="dashboard-main">
        <section class="kpis-section">
          <div class="section-header">
            <h2 class="section-title">Resumen de rendimiento</h2>
            <div class="time-filter">
              <select v-model="timeRange" class="time-select">
                <option value="7d">Últimos 7 días</option>
                <option value="30d">Últimos 30 días</option>
                <option value="90d">Últimos 90 días</option>
              </select>
            </div>
          </div>

          <div v-if="isLoading" class="loading-message">Cargando datos...</div>
          <div v-else-if="!clientGaId" class="no-data-message">
            No se pudo obtener el ID del cliente para cargar los datos de Google Analytics.
            Asegúrate de que tu usuario esté vinculado a un cliente en la tabla 'clientes' a través de su 'auth_id'.
          </div>
          <div v-else-if="gaData.length === 0" class="no-data-message">
            No hay datos de Google Analytics disponibles para el rango de fechas seleccionado.
          </div>
          <div v-else class="kpis-grid">
            <div v-for="kpi in kpisData" :key="kpi.title" class="kpi-card">
              <div class="kpi-header">
                <div :class="['kpi-icon', kpi.bgColor]">
                  <component :is="kpi.icon" class="h-5 w-5" />
                </div>
                <div v-if="kpi.change" class="kpi-trend" :class="kpi.trend === 'up' ? 'text-green-500' : 'text-red-500'">
                  <component :is="kpi.trend === 'up' ? ArrowUpIcon : ArrowDownIcon" class="h-4 w-4" />
                  <span>{{ kpi.change }}</span>
                </div>
              </div>
              <div class="kpi-content">
                <p class="kpi-title">{{ kpi.title }}</p>
                <h3 class="kpi-value">{{ kpi.value }}</h3>
              </div>
              <div class="kpi-footer">
                <div class="progress-bar">
                  <div
                    class="progress-fill"
                    :class="kpi.trend === 'up' ? 'bg-green-500' : 'bg-red-500'"
                    :style="{ width: kpi.progress + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="charts-section">
          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">Visitas al Sitio Web</h3>
              <div class="chart-stats">
                <span class="stat-value">{{ totalSessions.toLocaleString() }}</span>
                <span class="stat-change positive">+X.X%</span>
              </div>
            </div>
            <div class="chart-container">
              <Line
                :data="visitChartData"
                :options="chartOptions"
                v-if="!isLoading && gaData.length > 0"
              />
              <div v-else class="chart-placeholder">
                <p v-if="isLoading">Cargando gráfica...</p>
                <p v-else>No hay datos disponibles para la gráfica de visitas.</p>
              </div>
            </div>
          </div>

          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">Conversiones</h3>
              <div class="chart-stats">
                <span class="stat-value">{{ totalConversions.toLocaleString() }}</span>
                 <span class="stat-change positive">+X.X%</span>
              </div>
            </div>
            <div class="chart-container">
              <Bar
                :data="conversionChartData"
                :options="chartOptions"
                v-if="!isLoading && gaData.length > 0"
              />
              <div v-else class="chart-placeholder">
                <p v-if="isLoading">Cargando gráfica...</p>
                <p v-else>No hay datos disponibles para la gráfica de conversiones.</p>
              </div>
            </div>
          </div>
        </section>

        <section class="data-section">
          <div class="data-card">
            <div class="data-header">
              <h3 class="data-title">Posicionamiento SEO</h3>
              <button
                @click="refreshSEOData"
                class="refresh-btn small"
              >
                <RefreshCw class="h-3 w-3" />
                <span>Actualizar</span>
              </button>
            </div>
            <div class="seo-table">
              <table>
                <thead>
                  <tr>
                    <th>Palabra clave</th>
                    <th>Posición</th>
                    <th>Cambio</th>
                    <th>Última actualización</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="keyword in seoKeywords" :key="keyword.term">
                    <td>{{ keyword.term }}</td>
                    <td>
                      <span class="position-badge" :class="{
                        'excellent': keyword.position <= 3,
                        'good': keyword.position > 3 && keyword.position <= 10,
                        'average': keyword.position > 10 && keyword.position <= 20,
                        'poor': keyword.position > 20
                      }">
                        #{{ keyword.position }}
                      </span>
                    </td>
                    <td>
                      <span class="change-indicator" :class="{
                        'positive': keyword.change > 0,
                        'negative': keyword.change < 0
                      }">
                        <component
                          :is="keyword.change > 0 ? ArrowUpIcon : ArrowDownIcon"
                          class="h-3 w-3"
                        />
                        {{ Math.abs(keyword.change) }}
                      </span>
                    </td>
                    <td>{{ keyword.lastUpdate }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="data-card">
            <div class="data-header">
              <h3 class="data-title">Campañas Activas</h3>
              <button class="refresh-btn small">
                <RefreshCw class="h-3 w-3" />
                <span>Actualizar</span>
              </button>
            </div>
            <div class="campaigns-list">
              <div v-for="campaign in campaigns" :key="campaign.id" class="campaign-item">
                <div class="campaign-info">
                  <h4 class="campaign-name">{{ campaign.name }}</h4>
                  <span class="campaign-status" :class="{
                    'active': campaign.status === 'Activa',
                    'paused': campaign.status === 'En Pausa'
                  }">
                    {{ campaign.status }}
                  </span>
                </div>
                <div class="campaign-stats">
                  <div class="budget-bar">
                    <div class="budget-labels">
                      <span>Gastado: ${{ campaign.spent }}</span>
                      <span>Presupuesto: ${{ campaign.budget }}</span>
                    </div>
                    <div class="progress-bar">
                      <div
                        class="progress-fill"
                        :style="{ width: (campaign.spent/campaign.budget * 100) + '%' }"
                      ></div>
                    </div>
                  </div>
                  <div class="campaign-roi">
                    <span>ROI:</span>
                    <span class="roi-value" :class="{
                      'positive': campaign.roi > 100,
                      'negative': campaign.roi <= 100
                    }">
                      {{ campaign.roi }}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { Line, Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js'
import {
  ArrowUpIcon,
  ArrowDownIcon,
  UsersIcon,
  ShoppingCartIcon,
  BarChart2Icon,
  RefreshCw
} from 'lucide-vue-next'
import SidebarMenu from '@/components/SidebarMenu.vue'

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
)

// Estado
const isSidebarCollapsed = ref(true)
const clientName = ref('Cargando...')
const timeRange = ref('30d') // Rango de tiempo para los datos de GA
const gaData = ref([])       // Almacena los datos de Google Analytics
const isLoading = ref(true); // Para mostrar estado de carga
const clientGaId = ref(null); // Nuevo ref para almacenar el ID del cliente de la tabla 'clientes'

// --- Funciones de Utilidad ---
const getInitials = (name) => {
  if (!name) return '';
  return name.split(' ').map(part => part[0]).join('').toUpperCase()
}

// Función para calcular rangos de fechas
const getDateRange = (range) => {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0]; // Formato YYYY-MM-DD

  let startDate = '';
  switch (range) {
    case '7d':
      today.setDate(today.getDate() - 7);
      break;
    case '30d':
      today.setDate(today.getDate() - 30);
      break;
    case '90d':
      today.setDate(today.getDate() - 90);
      break;
    default:
      today.setDate(today.getDate() - 30); // Por defecto 30 días
  }
  startDate = today.toISOString().split('T')[0];
  return { startDate, endDate };
};


// --- Funciones para Obtener Datos ---

// Función para obtener el nombre de la empresa del cliente y su ID de cliente (UUID)
const fetchClientInfo = async () => {
  isLoading.value = true;
  clientGaId.value = null; // Reiniciar clientGaId al inicio de la carga

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Error al obtener usuario autenticado:', userError);
      clientName.value = 'Usuario';
      gaData.value = [];
      isLoading.value = false;
      return;
    }
    console.log("Usuario autenticado (auth_id):", user.id); // Log para depuración

    // 1. Consulta la tabla 'clientes' usando el auth_id del usuario logueado
    const { data: clientData, error: clientError } = await supabase
      .from('clientes')
      .select('id, empresa') // Selecciona 'id' (el UUID de clientes) y 'empresa'
      .eq('auth_id', user.id) // <--- ¡Este es el punto clave! Usa auth_id
      .single();

    if (clientError) {
      console.error('Error al cargar información del cliente desde tabla "clientes" (puede ser por RLS o no hay un cliente vinculado al auth_id):', clientError);
      clientName.value = 'Usuario';
      gaData.value = [];
      isLoading.value = false; // Marcar como cargado (con error)
      return; // Salir si no se encuentra el cliente
    } else {
      clientName.value = clientData?.empresa || 'Usuario'; // Usa la columna 'empresa'
      clientGaId.value = clientData?.id; // Almacena el ID del cliente (UUID)
      console.log("Nombre del cliente (empresa):", clientName.value);
      console.log("ID del cliente (UUID de la tabla clientes):", clientGaId.value);
    }

    // 2. Si se obtuvo el ID del cliente, procede a cargar los datos de Analytics
    if (clientGaId.value) {
      await fetchAnalyticsData();
    } else {
      console.warn("No se pudo obtener el ID del cliente de la tabla 'clientes' a partir del auth_id del usuario logueado. No se cargarán los datos de GA.");
      gaData.value = [];
      isLoading.value = false;
    }

  } catch (error) {
    console.error('Error general al cargar info del cliente o GA:', error);
    clientName.value = 'Usuario';
    gaData.value = [];
    isLoading.value = false;
  }
};


// Función para obtener los datos de Google Analytics (ahora usa clientGaId)
const fetchAnalyticsData = async () => {
  isLoading.value = true; // Mantener isLoading en true mientras se cargan los datos de GA
  try {
    if (!clientGaId.value) {
      console.warn("Client ID no disponible, no se pueden cargar datos de GA.");
      gaData.value = [];
      isLoading.value = false;
      return;
    }

    const { startDate, endDate } = getDateRange(timeRange.value);

    console.log(`Consultando ga_metrics_cache para cliente_id: ${clientGaId.value} entre ${startDate} y ${endDate}`);

    const { data, error } = await supabase
      .from('ga_metrics_cache')
      .select('date, sessions, users, conversions, bounce_rate, avg_session_duration, page_views') // Columnas en ga_metrics_cache
      .eq('cliente_id', clientGaId.value) // Usa el ID del cliente aquí (el UUID de la tabla 'clientes')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;
    gaData.value = data;
    console.log("Datos de GA cargados:", gaData.value.length, "registros.");
  } catch (error) {
    console.error('Error al cargar datos de Google Analytics:', error);
    gaData.value = [];
  } finally {
    isLoading.value = false;
  }
};

// Computed properties (calculan a partir de gaData)
const totalSessions = computed(() => {
  return gaData.value.reduce((sum, row) => sum + (row.sessions || 0), 0);
});

const totalActiveUsers = computed(() => {
  return gaData.value.reduce((sum, row) => sum + (row.users || 0), 0);
});

const totalConversions = computed(() => {
  return gaData.value.reduce((sum, row) => sum + (row.conversions || 0), 0);
});

const averageBounceRate = computed(() => {
  const totalBounceRate = gaData.value.reduce((sum, row) => sum + (row.bounce_rate || 0), 0);
  return gaData.value.length > 0 ? (totalBounceRate / gaData.value.length).toFixed(2) : '0.00';
});

const averageSessionDuration = computed(() => {
  const totalDuration = gaData.value.reduce((sum, row) => sum + (row.avg_session_duration || 0), 0);
  const totalSessionsCount = totalSessions.value;
  if (totalSessionsCount === 0 || totalDuration === 0) return '00:00';

  const averageSeconds = totalDuration / totalSessionsCount;
  const minutes = Math.floor(averageSeconds / 60);
  const seconds = Math.floor(averageSeconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
});

const totalPageViews = computed(() => {
    return gaData.value.reduce((sum, row) => sum + (row.page_views || 0), 0);
});


const kpisData = computed(() => {
  return [
    {
      title: 'Visitas Totales (Sesiones)',
      value: totalSessions.value.toLocaleString(),
      change: null,
      trend: 'up',
      progress: 85,
      icon: UsersIcon,
      bgColor: 'bg-blue-100 text-blue-600'
    },
    {
      title: 'Usuarios Activos',
      value: totalActiveUsers.value.toLocaleString(),
      change: null,
      trend: 'up',
      progress: 90,
      icon: UsersIcon,
      bgColor: 'bg-indigo-100 text-indigo-600'
    },
    {
      title: 'Conversiones',
      value: totalConversions.value.toLocaleString(),
      change: null,
      trend: 'up',
      progress: 92,
      icon: ShoppingCartIcon,
      bgColor: 'bg-green-100 text-green-600'
    },
    {
      title: 'Tasa de Rebote Promedio',
      value: `${averageBounceRate.value}%`,
      change: null,
      trend: 'down',
      progress: 70,
      icon: BarChart2Icon,
      bgColor: 'bg-red-100 text-red-600'
    },
    {
      title: 'Duración Sesión Promedio',
      value: averageSessionDuration.value,
      change: null,
      trend: 'up',
      progress: 75,
      icon: BarChart2Icon,
      bgColor: 'bg-purple-100 text-purple-600'
    },
    {
      title: 'Vistas de Página',
      value: totalPageViews.value.toLocaleString(),
      change: null,
      trend: 'up',
      progress: 88,
      icon: BarChart2Icon,
      bgColor: 'bg-orange-100 text-orange-600'
    }
  ];
});

// Datos de las gráficas (sin cambios)
const visitChartData = computed(() => {
  const sortedData = [...gaData.value].sort((a, b) => new Date(a.date) - new Date(b.date));
  const labels = sortedData.map(row => new Date(row.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }));
  const data = sortedData.map(row => row.sessions || 0);

  return {
    labels: labels,
    datasets: [
      {
        label: 'Visitas (Sesiones)',
        data: data,
        borderColor: '#92d000',
        backgroundColor: 'rgba(146, 208, 0, 0.1)',
        tension: 0.4,
        fill: true,
        borderWidth: 2
      }
    ]
  };
});

const conversionChartData = computed(() => {
  const sortedData = [...gaData.value].sort((a, b) => new Date(a.date) - new Date(b.date));
  const labels = sortedData.map(row => new Date(row.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }));
  const data = sortedData.map(row => row.conversions || 0);

  return {
    labels: labels,
    datasets: [
      {
        label: 'Conversiones',
        data: data,
        backgroundColor: '#fe7529',
        borderRadius: 4,
        borderWidth: 0
      }
    ]
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: '#2a2a2a',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      borderColor: 'rgba(146, 208, 0, 0.1)',
    }
  },
  scales: {
    y: {
      grid: {
        color: 'rgba(255, 255, 255, 0.1)',
      },
      ticks: {
        color: '#ffffff',
      }
    },
    x: {
      grid: {
        display: false
      },
      ticks: {
        color: '#ffffff',
      }
    }
  }
}

// Datos SEO (sin cambios, solo datos dummy)
const seoKeywords = ref([
  {
    term: 'Agencia de marketing digital en Puebla',
    position: 4,
    change: 2,
    lastUpdate: '03 Jun 2025'
  },
  {
    term: 'Agencia SEO Puebla',
    position: 3,
    change: 1,
    lastUpdate: '03 Jun 2025'
  },
  {
    term: 'Marketing digital empresas Puebla',
    position: 8,
    change: -1,
    lastUpdate: '03 Jun 2025'
  },
  {
    term: 'Publicidad en Google Puebla',
    position: 12,
    change: 3,
    lastUpdate: '03 Jun 2025'
  },
  {
    term: 'Diseño web profesional Puebla',
    position: 5,
    change: 0,
    lastUpdate: '03 Jun 2025'
  }
])

// Campañas (sin cambios, solo datos dummy)
const campaigns = ref([
  {
    id: 1,
    name: 'Campaña Verano 2025',
    status: 'Activa',
    budget: 5000,
    spent: 2340,
    roi: 289
  },
  {
    id: 2,
    name: 'Remarketing Clientes',
    status: 'Activa',
    budget: 3000,
    spent: 1200,
    roi: 320
  },
  {
    id: 3,
    name: 'SEO Local Puebla',
    status: 'En Pausa',
    budget: 2500,
    spent: 1800,
    roi: 150
  },
  {
    id: 4,
    name: 'Lanzamiento Producto X',
    status: 'Activa',
    budget: 7500,
    spent: 4200,
    roi: 210
  }
])

// Métodos (sin cambios, solo se llama a fetchClientInfo que es la que se modificó)
const refreshData = async () => {
  console.log('Actualizando todos los datos...');
  await fetchClientInfo();
};

const refreshSEOData = () => {
  seoKeywords.value = seoKeywords.value.map(keyword => ({
    ...keyword,
    lastUpdate: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }),
    position: Math.max(1, keyword.position + (Math.random() > 0.5 ? 1 : -1)),
    change: Math.floor(Math.random() * 5) - 2
  }))
}

// --- Lifecycle Hook ---
onMounted(async () => {
  await fetchClientInfo();
});

// --- Watchers ---
watch(timeRange, () => {
  fetchAnalyticsData();
});
</script>

<style scoped>
/* Tu CSS existente sin cambios */
.dashboard-layout {
  min-height: 100vh;
  background-color: #1e1e1e;
  color: #ffffff;
}

.main-content {
  margin-left: 180px;
  padding: 1rem;
  transition: all 0.3s ease;
  background-color: #1e1e1e;
  min-height: 100vh;
  max-width: 1800px;
  margin-right: -7rem;
  margin-left: auto;
  width: calc(98% - 80px);
}

.dashboard-header {
  background-color: #2a2a2a;
  border: 1px solid rgba(146, 208, 0, 0.1);
  padding: 1.5rem 2rem;
  margin-bottom: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 100%;
  margin: 0 auto;
}

.dashboard-title {
  color: #ffffff;
}

.welcome-subtitle {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
}


.header-actions {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background-color: #92d000;
  color: #ffffff;
  border: none;
  border-radius: 0.75rem;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
}

.refresh-btn:hover {
  background-color: #7eb300;
  transform: translateY(-1px);
}

.refresh-btn.small {
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-name {
  font-size: 1rem;
  color: #ffffff;
}

.avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background-color: #3B82F6;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  font-weight: 500;
  font-size: 0.75rem;
}

.dashboard-main {
  padding: 0.5rem;
  max-width: 100%;
  margin: 0 auto;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.section-title {
  color: #ffffff;
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.025em;
}

.time-filter {
  position: relative;
}

.time-select {
  padding: 0.5rem 2.5rem 0.5rem 1rem;
  background-color: #2a2a2a;
  border: 1px solid rgba(146, 208, 0, 0.3);
  color: #ffffff;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1rem;
  cursor: pointer;
}

.kpis-section {
  margin-bottom: 2rem;
}

.kpis-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  grid-gap: 1.5rem;
  margin-bottom: 2rem;
}

@media (min-width: 640px) {
  .kpis-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .kpis-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.kpi-card {
  background-color: #2a2a2a;
  border: 1px solid rgba(146, 208, 0, 0.1);
  border-radius: 1rem;
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.kpi-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  border-color: rgba(146, 208, 0, 0.3);
}

.kpi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.kpi-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.kpi-trend {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.kpi-content {
  margin-bottom: 1.5rem;
}

.kpi-title {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 0.5rem;
}

.kpi-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: #ffffff;
}

.kpi-footer {
  margin-top: auto;
}

.progress-bar {
  height: 0.375rem;
  background-color: #F3F4F6;
  border-radius: 0.75rem;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 0.75rem;
}

.charts-section {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 2rem;
  margin-bottom: 2rem;
}

@media (min-width: 1024px) {
  .charts-section {
    grid-template-columns: repeat(2, 1fr);
  }
}

.chart-card {
  background-color: #2a2a2a;
  border: 1px solid rgba(146, 208, 0, 0.1);
  border-radius: 1rem;
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.chart-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  border-color: rgba(146, 208, 0, 0.3);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.chart-title {
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
}

.chart-stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stat-value {
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
}

.stat-change {
  font-size: 0.875rem;
  font-weight: 500;
}

.stat-change.positive {
  color: #92d000;
}

.stat-change.negative {
  color: #fe7529;
}

.chart-container {
  height: 300px;
}

.data-section {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 2rem;
}

@media (min-width: 1024px) {
  .data-section {
    grid-template-columns: repeat(2, 1fr);
  }
}

.data-card {
  background-color: #2a2a2a;
  border: 1px solid rgba(146, 208, 0, 0.1);
  border-radius: 1rem;
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.data-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  border-color: rgba(146, 208, 0, 0.3);
}

.data-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.data-title {
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
}

.seo-table {
  border-radius: 0.75rem;
  overflow: hidden;
}

.seo-table table {
  border-spacing: 0;
  width: 100%;
}

.seo-table th {
  background-color: rgba(146, 208, 0, 0.1);
  color: #ffffff;
  font-weight: 600;
  padding: 1rem 1.5rem;
  text-align: left;
}

.seo-table td {
  padding: 1rem 1.5rem;
  color: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.seo-table tr:last-child td {
  border-bottom: none;
}

.campaigns-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.campaign-item {
  background-color: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(146, 208, 0, 0.1);
  border-radius: 0.75rem;
  padding: 1.25rem;
  transition: all 0.2s ease;
}

.campaign-item:hover {
  background-color: rgba(255, 255, 255, 0.05);
  border-color: rgba(146, 208, 0, 0.3);
}

.campaign-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.campaign-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #ffffff;
}

.campaign-status {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
}

.campaign-status.active {
  background-color: rgba(146, 208, 0, 0.2);
  color: #92d000;
}

.campaign-status.paused {
  background-color: rgba(254, 117, 41, 0.2);
  color: #fe7529;
}

.campaign-stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.budget-bar {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.budget-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #6B7280;
}

.campaign-roi {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #6B7280;
}

.roi-value.positive {
  color: #92d000;
}

.roi-value.negative {
  color: #fe7529;
}

.loading-message, .no-data-message, .chart-placeholder {
  text-align: center;
  padding: 2rem;
  background-color: #2a2a2a;
  border: 1px solid rgba(146, 208, 0, 0.1);
  border-radius: 1rem;
  color: rgba(255, 255, 255, 0.7);
  font-style: italic;
  margin-bottom: 1.5rem;
}
</style>