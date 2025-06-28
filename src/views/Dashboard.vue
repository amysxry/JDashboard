<template>
  <div class="dashboard-layout" :class="{ 'collapsed': isSidebarCollapsed }">
    <SidebarMenu v-model:collapsed="isSidebarCollapsed" @sidebar-width-changed="handleSidebarWidthChange" />

    <div class="main-content" :style="{ marginLeft: dynamicMarginLeft }">
      <header class="dashboard-header">
        <div class="header-content">
          <div class="welcome-section">
            <h1 class="dashboard-title">¡Bienvenido, {{ clientName }}! 👋</h1>
            <div class="saldo-section" v-if="clientBalance !== null">
              <span class="saldo-label">Saldo de cuenta:</span>
              <span class="saldo-value">${{ formatCurrency(clientBalance) }}</span>
            </div>
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
                <template v-if="profilePhotoUrl">
                  <img :src="profilePhotoUrl" alt="Avatar de perfil" class="profile-photo">
                </template>
                <template v-else><span class="initials">{{ getInitials(clientName) }}</span></template>
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
                <div class="help-container"
                     @mouseenter="showPopover(kpi.title, $event)"
                     @mouseleave="hidePopover">
                  <HelpCircle class="h-4 w-4 text-gray-400 hover:text-gray-200 transition-colors cursor-help" />
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
              <div class="help-container"
                   @mouseenter="showPopover('Visitas al Sitio Web', $event)"
                   @mouseleave="hidePopover">
                <HelpCircle class="h-4 w-4 text-gray-400 hover:text-gray-200 transition-colors cursor-help" />
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
              <div class="help-container"
                   @mouseenter="showPopover('Conversiones', $event)"
                   @mouseleave="hidePopover">
                <HelpCircle class="h-4 w-4 text-gray-400 hover:text-gray-200 transition-colors cursor-help" />
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
              <div class="help-container"
                   @mouseenter="showPopover('Posicionamiento SEO', $event)"
                   @mouseleave="hidePopover">
                <HelpCircle class="h-4 w-4 text-gray-400 hover:text-gray-200 transition-colors cursor-help" />
              </div>
            </div>
            <div v-if="isLoading" class="loading-message">Cargando datos de SEO...</div>
            <div v-else-if="!clientGaId" class="no-data-message">
              No se pudo obtener el ID del cliente para cargar los datos de SEO.
            </div>
            <div v-else-if="seoKeywords.length === 0" class="no-data-message">
              No hay datos de posicionamiento SEO disponibles para este cliente.
            </div>
            <div v-else class="seo-table">
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
        </section>
      </main>
    </div>

    <Transition name="popover-fade">
      <div v-if="showHelpPopover"
           class="help-popover"
           :style="{ top: popoverY + 'px', left: popoverX + 'px' }">
        <div class="popover-arrow"></div>
        <p class="popover-text">{{ currentHelpText }}</p>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { Line, Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import {
  ArrowUpIcon,
  ArrowDownIcon,
  UsersIcon,
  ShoppingCartIcon,
  BarChart2Icon,
  RefreshCw,
  HelpCircle,
  PercentIcon
} from 'lucide-vue-next'
import SidebarMenu from '@/components/SidebarMenu.vue'

// --- SIN CAMBIOS EN REGISTROS Y ESTADO DEL LAYOUT ---
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)
const sidebarWidth = ref(200);
const isMobileLayout = ref(false);
const isSidebarCollapsed = ref(true);
const dynamicMarginLeft = computed(() => isMobileLayout.value ? '0' : `${sidebarWidth.value}px`);
const handleSidebarWidthChange = (event) => { sidebarWidth.value = event.detail.width; };
const checkLayoutSize = () => { isMobileLayout.value = window.innerWidth < 1024; };

// --- SIN CAMBIOS EN ESTADO DE DATOS Y POPOVER ---
const profilePhotoUrl = ref('');
const clientName = ref('Cargando...');
const clientBalance = ref(null);
const timeRange = ref('30d');
const gaData = ref([]);
const isLoading = ref(true); // El estado de carga principal.
const clientGaId = ref(null);
const seoKeywords = ref([]);
const showHelpPopover = ref(false);
const currentHelpText = ref('');
const popoverX = ref(0);
const popoverY = ref(0);
let hidePopoverTimeout = null;
const helpDefinitions = { /* ... */ };

// --- SIN CAMBIOS EN FUNCIONES DE UTILIDAD ---
const getInitials = (name) => { /* ... */ };
const formatCurrency = (value) => { /* ... */ };

// --- FUNCIÓN DE FECHAS UNIFICADA (YA ESTABA BIEN) ---
const getDateRange = (range) => {
  const endDate = new Date();
  const startDate = new Date();
  switch (range) {
    case '7d':
      startDate.setDate(endDate.getDate() - 6);
      break;
    default:
      startDate.setDate(endDate.getDate() - 29);
  }
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
};


// --- CORRECCIÓN DEFINITIVA: GESTIÓN DE `isLoading` ---

// fetchAnalyticsData ya NO gestiona isLoading. Solo obtiene los datos.
const fetchAnalyticsData = async () => {
  if (!clientGaId.value) {
    gaData.value = [];
    return; // Salir si no hay ID
  }
  try {
    const { startDate, endDate } = getDateRange(timeRange.value);
    const { data, error } = await supabase.rpc('get_daily_analytics_data', {
      p_client_id: clientGaId.value,
      p_start_date: startDate,
      p_end_date: endDate
    });
    if (error) throw error;
    gaData.value = data || [];
  } catch (err) {
    console.error('Error específico al cargar datos de Analytics:', err);
    gaData.value = []; // En caso de error, asegurar que los datos estén vacíos.
  }
  // Se elimina el bloque finally que modificaba isLoading.
};

const fetchSeoData = async () => {
    // Esta función ya estaba bien, no modificaba isLoading.
    if (!clientGaId.value) return;
    try {
        const { data, error } = await supabase
          .from('seo_rankings')
          .select('keyword_id,position,previous_position,created_at,monitored_keywords(keyword)')
          .eq('cliente_id', clientGaId.value)
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
              lastUpdate: new Date(row.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
            };
          }
        });
        seoKeywords.value = Object.values(latestKeywords);
    } catch(err) {
        console.error('Error al cargar datos de SEO:', err);
        seoKeywords.value = [];
    }
};

// fetchClientInfo es AHORA EL ÚNICO que controla isLoading.
const fetchClientInfo = async () => {
  isLoading.value = true; // 1. La carga COMIENZA.
  gaData.value = [];
  seoKeywords.value = [];

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data: clientData, error: clientError } = await supabase
      .from('clientes')
      .select('id, empresa, saldo, avatar_url')
      .eq('auth_id', user.id)
      .single();
    if (clientError) throw clientError;

    clientName.value = clientData.empresa;
    clientGaId.value = clientData.id;
    clientBalance.value = clientData.saldo;
    profilePhotoUrl.value = clientData.avatar_url;

    if (clientGaId.value) {
      // Espera a que AMBAS promesas se resuelvan.
      await Promise.all([
          fetchAnalyticsData(),
          fetchSeoData()
      ]);
    }
  } catch (error) {
    console.error('Error general al cargar info del cliente:', error);
    clientName.value = 'Usuario';
  } finally {
    isLoading.value = false; // 2. La carga TERMINA, solo aquí.
  }
};


// --- PROPIEDADES COMPUTADAS Y DE GRÁFICAS (COMPLETAS Y SIN CAMBIOS) ---
const totalSessions = computed(() => gaData.value.reduce((sum, row) => sum + (row.sessions || 0), 0));
const totalActiveUsers = computed(() => gaData.value.reduce((sum, row) => sum + (row.users || 0), 0));
const totalConversions = computed(() => gaData.value.reduce((sum, row) => sum + (row.conversions || 0), 0));
const totalPageViews = computed(() => gaData.value.reduce((sum, row) => sum + (row.page_views || 0), 0));
const averageBounceRate = computed(() => {
  const totalBounceSum = gaData.value.reduce((sum, row) => sum + (row.bounce_rate || 0), 0);
  const rate = gaData.value.length > 0 ? (totalBounceSum / gaData.value.length) : 0;
  return (rate * 100).toFixed(2);
});
const conversionRate = computed(() => {
  if (totalSessions.value === 0) return '0.00';
  return ((totalConversions.value / totalSessions.value) * 100).toFixed(2);
});
const kpisData = computed(() => [
  { title: 'Visitas Totales (Sesiones)', value: totalSessions.value.toLocaleString(), trend: 'up', progress: 85, icon: UsersIcon, bgColor: 'bg-blue-100 text-blue-600' },
  { title: 'Usuarios Activos', value: totalActiveUsers.value.toLocaleString(), trend: 'up', progress: 90, icon: UsersIcon, bgColor: 'bg-indigo-100 text-indigo-600' },
  { title: 'Conversiones', value: totalConversions.value.toLocaleString(), trend: 'up', progress: 92, icon: ShoppingCartIcon, bgColor: 'bg-green-100 text-green-600' },
  { title: 'Porcentaje de Conversión', value: `${conversionRate.value}%`, trend: 'up', progress: 80, icon: PercentIcon, bgColor: 'bg-yellow-100 text-yellow-600' },
  { title: 'Tasa de Rebote Promedio', value: `${averageBounceRate.value}%`, trend: 'down', progress: 70, icon: BarChart2Icon, bgColor: 'bg-red-100 text-red-600' },
  { title: 'Vistas de Página', value: totalPageViews.value.toLocaleString(), trend: 'up', progress: 88, icon: BarChart2Icon, bgColor: 'bg-orange-100 text-orange-600' }
]);
const visitChartData = computed(() => {
  const sortedData = [...gaData.value].sort((a, b) => new Date(a.date) - new Date(b.date));
  const labels = sortedData.map(row => new Date(row.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }));
  const data = sortedData.map(row => row.sessions || 0);
  return {
    labels,
    datasets: [{
      label: 'Visitas (Sesiones)', data, borderColor: '#92d000', backgroundColor: 'rgba(146, 208, 0, 0.1)',
      tension: 0.4, fill: true, borderWidth: 2
    }]
  };
});
const conversionChartData = computed(() => {
  const sortedData = [...gaData.value].sort((a, b) => new Date(a.date) - new Date(b.date));
  const labels = sortedData.map(row => new Date(row.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }));
  const data = sortedData.map(row => row.conversions || 0);
  return {
    labels,
    datasets: [{
      label: 'Conversiones', data, backgroundColor: '#fe7529', borderRadius: 4, borderWidth: 0
    }]
  };
});
const chartOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#2a2a2a', titleColor: '#ffffff', bodyColor: '#ffffff', borderColor: 'rgba(146, 208, 0, 0.1)' }},
  scales: {
    y: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#ffffff' }},
    x: { grid: { display: false }, ticks: { color: '#ffffff' }}
  }
};
// --- HOOKS Y WATCHERS ---
const refreshData = async () => { await fetchClientInfo(); };
const showPopover = (title, event) => { /* ... */ };
const hidePopover = () => { /* ... */ };

onMounted(() => {
  checkLayoutSize();
  window.addEventListener('resize', checkLayoutSize);
  window.addEventListener('sidebar-width-changed', handleSidebarWidthChange);
  fetchClientInfo(); // No necesita await aquí
});

watch(timeRange, () => { // Se simplifica, ya que fetchAnalyticsData se llama dentro de fetchClientInfo
  if (clientGaId.value) {
    // En lugar de llamar solo a fetchAnalyticsData, es más robusto relanzar el fetch principal
    // si queremos que el loading se comporte correctamente, aunque llamar solo a la de analytics también funciona.
    // Para simpleza, llamamos solo a analytics si cambia el rango.
     fetchAnalyticsData();
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', checkLayoutSize);
  window.removeEventListener('sidebar-width-changed', handleSidebarWidthChange);
});
</script>

<style scoped>
.dashboard-layout {
  min-height: 100vh;
  background-color: #1e1e1e;
  color: #ffffff;
  display: flex; /* Keep flexbox for initial layout concept */
}

.main-content {
  /* No more fixed margin-left in the CSS. It will be set by the :style binding. */
  flex-grow: 1; /* Allow it to take up remaining space */
  padding: 2rem;
  overflow-y: auto; /* Permite scroll vertical si el contenido es largo */
  min-height: 100vh; /* Asegura que el contenido ocupe al menos la altura de la vista */
  transition: margin-left 0.3s ease; /* Transición suave para el margen */
  box-sizing: border-box; /* Incluye padding en el cálculo del ancho/alto */
  width: auto; /* The width will be the remaining after the margin-left */
}

/* Your existing CSS for other components (no changes here for the request) */
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
  flex-wrap: wrap;
  gap: 1rem;
  max-width: 100%;
  margin: 0 auto;
}

.welcome-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dashboard-title {
  color: #ffffff;
  margin-bottom: 0;
}

.welcome-subtitle {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.saldo-section {
  background-color: rgba(146, 208, 0, 0.1);
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: #92d000;
  margin-top: 0.5rem;
}

.saldo-label {
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

.saldo-value {
  color: #ffffff;
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
  overflow: hidden;
}

.profile-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}


.dashboard-main {
  padding: 0.5rem;
  max-width: 100%; /* Ensure content doesn't overflow internally */
  margin: 0 auto;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
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
  position: relative;
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
  position: relative;
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
  font-weight: 500;
  color: #ffffff;
}

.chart-container {
  height: 200px; /* Adjust as needed */
  width: 100%;
}

.chart-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: rgba(255, 255, 255, 0.6);
  font-style: italic;
}

.data-section {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 2rem;
}

@media (min-width: 1024px) {
  .data-section {
    grid-template-columns: repeat(1, 1fr); /* Only SEO table remains */
  }
}

.data-card {
  background-color: #2a2a2a;
  border: 1px solid rgba(146, 208, 0, 0.1);
  border-radius: 1rem;
  padding: 1.5rem;
  transition: all 0.3s ease;
  position: relative;
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
  font-weight: 500;
  color: #ffffff;
}

.loading-message, .no-data-message {
  text-align: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.7);
  font-style: italic;
}

.seo-table {
  width: 100%;
  overflow-x: auto;
}

.seo-table table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

.seo-table th, .seo-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  white-space: nowrap; /* Prevent text wrapping */
}

.seo-table th {
  color: rgba(255, 255, 255, 0.8);
  font-weight: 600;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.seo-table td {
  color: #ffffff;
  font-size: 0.9rem;
}

.position-badge {
  display: inline-block;
  padding: 0.3rem 0.6rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.8rem;
  text-align: center;
}

.position-badge.excellent {
  background-color: rgba(146, 208, 0, 0.2);
  color: #92d000;
}

.position-badge.good {
  background-color: rgba(0, 128, 255, 0.2);
  color: #0080ff;
}

.position-badge.average {
  background-color: rgba(255, 165, 0, 0.2);
  color: #ffa500;
}

.position-badge.poor {
  background-color: rgba(255, 0, 0, 0.2);
  color: #ff0000;
}

.change-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: 500;
  font-size: 0.85rem;
}

.change-indicator.positive {
  color: #92d000;
}

.change-indicator.negative {
  color: #ff0000;
}

/* Popover styles */
.help-container {
  position: relative;
  display: flex; /* To properly align HelpCircle icon */
  align-items: center;
  justify-content: center;
}

.help-popover {
  position: fixed; /* Use fixed for positioning relative to viewport */
  background-color: #3a3a3a;
  color: #ffffff;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  max-width: 250px;
  font-size: 0.875rem;
  z-index: 1000;
  pointer-events: none; /* Allow clicks to pass through */
  opacity: 0;
  transform: scale(0.9);
  transition: opacity 0.2s ease, transform 0.2s ease;
  transform-origin: top left; /* Default origin */
}

.help-popover.popover-left {
  transform-origin: top right;
}

.popover-fade-enter-active, .popover-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.popover-fade-enter-from, .popover-fade-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
.popover-fade-enter-to, .popover-fade-leave-from {
  opacity: 1;
  transform: scale(1);
}

.popover-arrow {
  position: absolute;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 8px 8px 8px 0;
  border-color: transparent #3a3a3a transparent transparent;
  left: -8px;
  top: 50%;
  transform: translateY(-50%);
}

.help-popover.popover-left .popover-arrow {
  border-width: 8px 0 8px 8px;
  border-color: transparent transparent transparent #3a3a3a;
  left: auto;
  right: -8px;
}

/* Responsive adjustments */
@media (max-width: 1023px) {
  .dashboard-layout {
    flex-direction: column; /* Stack sidebar and content on small screens */
  }

  .main-content {
    margin-left: 0 !important; /* Override dynamic margin for mobile */
    width: 100%;
    padding-top: 1rem; /* Adjust padding if sidebar is overlaying top */
  }

  .dashboard-layout.collapsed .main-content {
    margin-left: 0 !important; /* Ensure no margin even if collapsed on mobile */
  }
}
</style>