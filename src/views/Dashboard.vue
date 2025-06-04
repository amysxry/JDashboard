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
        <!-- Sección de KPIs -->
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
          
          <div class="kpis-grid">
            <div v-for="kpi in kpis" :key="kpi.title" class="kpi-card">
              <div class="kpi-header">
                <div :class="['kpi-icon', kpi.bgColor]">
                  <component :is="kpi.icon" class="h-5 w-5" />
                </div>
                <div class="kpi-trend" :class="kpi.trend === 'up' ? 'text-green-500' : 'text-red-500'">
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

        <!-- Sección de gráficas principales -->
        <section class="charts-section">
          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">Visitas al Sitio Web</h3>
              <div class="chart-stats">
                <span class="stat-value">24,589</span>
                <span class="stat-change positive">+15.8%</span>
              </div>
            </div>
            <div class="chart-container">
              <Line 
                :data="visitChartData" 
                :options="chartOptions"
              />
            </div>
          </div>
          
          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">Conversiones</h3>
              <div class="chart-stats">
                <span class="stat-value">1,423</span>
                <span class="stat-change positive">+23.1%</span>
              </div>
            </div>
            <div class="chart-container">
              <Bar 
                :data="conversionChartData" 
                :options="chartOptions"
              />
            </div>
          </div>
        </section>

        <!-- Sección de datos SEO y Campañas -->
        <section class="data-section">
          <!-- Tabla de posicionamiento SEO -->
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
          
          <!-- Lista de campañas -->
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
import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { Line, Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  UsersIcon, 
  ShoppingCartIcon,
  DollarSignIcon, 
  BarChart2Icon,
  SearchIcon,
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
const timeRange = ref('30d')

// Función para obtener el nombre del cliente
const fetchClientName = async () => {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('nombre')
      .single()
    
    if (error) throw error
    clientName.value = data?.nombre || 'Usuario'
  } catch (error) {
    console.error('Error al cargar nombre:', error)
    clientName.value = 'Usuario'
  }
}

onMounted(() => {
  fetchClientName()
})

// KPIs
const kpis = ref([
  {
    title: 'Visitas Totales',
    value: '24,589',
    change: '+12.5%',
    trend: 'up',
    progress: 85,
    icon: UsersIcon,
    bgColor: 'bg-blue-100 text-blue-600'
  },
  {
    title: 'Conversiones',
    value: '1,423',
    change: '+23.1%',
    trend: 'up',
    progress: 92,
    icon: ShoppingCartIcon,
    bgColor: 'bg-green-100 text-green-600'
  },
  {
    title: 'Ingresos',
    value: '$28,950',
    change: '+18.7%',
    trend: 'up',
    progress: 78,
    icon: DollarSignIcon,
    bgColor: 'bg-purple-100 text-purple-600'
  },
  {
    title: 'Posición Media SEO',
    value: '#4.2',
    change: '+1.5',
    trend: 'up',
    progress: 65,
    icon: SearchIcon,
    bgColor: 'bg-amber-100 text-amber-600'
  }
])

// Datos de las gráficas
const visitChartData = {
  labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
  datasets: [
    {
      label: 'Visitas',
      data: [18000, 22000, 19000, 24000, 23000, 24589],
      borderColor: '#92d000',
      backgroundColor: 'rgba(146, 208, 0, 0.1)',
      tension: 0.4,
      fill: true,
      borderWidth: 2
    }
  ]
}

const conversionChartData = {
  labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
  datasets: [
    {
      label: 'Conversiones',
      data: [850, 920, 1100, 1050, 1350, 1423],
      backgroundColor: '#fe7529',
      borderRadius: 4,
      borderWidth: 0
    }
  ]
}

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

// Datos SEO
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

// Campañas
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

// Métodos
const refreshData = () => {
  // Aquí iría la lógica para actualizar todos los datos
  console.log('Actualizando datos...')
}

const refreshSEOData = () => {
  // Simular actualización de datos SEO
  seoKeywords.value = seoKeywords.value.map(keyword => ({
    ...keyword,
    lastUpdate: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }),
    position: Math.max(1, keyword.position + (Math.random() > 0.5 ? 1 : -1)),
    change: Math.floor(Math.random() * 5) - 2
  }))
}

const getInitials = (name) => {
  return name.split(' ').map(part => part[0]).join('').toUpperCase()
}
</script>

<style scoped>
.dashboard-layout {
  min-height: 100vh;
  background-color: #1e1e1e;
  color: #ffffff;
}

.main-content {
  margin-left: 280px;
  padding: 1rem;
  transition: margin-left 0.3s ease;
  background-color: #1e1e1e;
  min-height: 100vh;
}

.main-content.lg\:ml-\[80px\] {
  margin-left: 80px; /* Ancho del sidebar colapsado */
}

@media (max-width: 1024px) {
  .main-content {
    margin-left: 0;
    padding-top: 4rem; /* Espacio para el botón de menú móvil */
  }
}

.welcome-section {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.welcome-subtitle {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
}

.dashboard-header {
  background-color: #2a2a2a;
  border: 1px solid rgba(146, 208, 0, 0.1);
  padding: 1.5rem 2rem;
  margin-bottom: 1rem;
  border-radius: 0.75rem;
  margin-top: 1rem;
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #92d000;
  color: #ffffff;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.refresh-btn:hover {
  background-color: #7eb300;
}

.refresh-btn.small {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-name {
  font-size: 0.875rem;
  color: #4B5563;
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
  padding: 1.5rem 2rem;
  max-width: 100%;
  margin: 0 auto;
}

/* Secciones */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
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
}

/* KPIs Grid */
.kpis-section {
  margin-bottom: 2rem;
}

.kpis-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 1.5rem;
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
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border-radius: 0.75rem;
  padding: 1.5rem;
  transition: all 0.2s ease;
}

.kpi-card:hover {
  box-shadow: 0 6px 8px -1px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
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

/* Charts Section */
.charts-section {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 1.5rem;
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
  border-radius: 0.75rem;
  padding: 1.5rem;
  transition: all 0.2s ease;
}

.chart-card:hover {
  box-shadow: 0 6px 8px -1px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
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
  height: 250px;
}

/* Data Section */
.data-section {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 1.5rem;
}

@media (min-width: 1024px) {
  .data-section {
    grid-template-columns: repeat(2, 1fr);
  }
}

.data-card {
  background-color: #2a2a2a;
  border: 1px solid rgba(146, 208, 0, 0.1);
  border-radius: 0.75rem;
  padding: 1.5rem;
  transition: all 0.2s ease;
}

.data-card:hover {
  box-shadow: 0 6px 8px -1px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
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
  color: #111827;
}

/* SEO Table */
.seo-table {
  overflow-x: auto;
}

.seo-table table {
  width: 100%;
  border-collapse: collapse;
}

.seo-table th {
  background-color: #2a2a2a;
  color: rgba(255, 255, 255, 0.7);
  border-bottom: 1px solid rgba(146, 208, 0, 0.1);
  text-align: left;
  padding: 0.75rem 1rem;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.seo-table td {
  padding: 1rem;
  font-size: 0.875rem;
  color: #ffffff;
  border-bottom: 1px solid rgba(146, 208, 0, 0.1);
}

.seo-table tr:last-child td {
  border-bottom: none;
}

.position-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-weight: 500;
  font-size: 0.75rem;
}

.position-badge.excellent {
  background-color: rgba(146, 208, 0, 0.2);
  color: #92d000;
}

.position-badge.good {
  background-color: #D1FAE5;
  color: #047857;
}

.position-badge.average {
  background-color: #FEF3C7;
  color: #B45309;
}

.position-badge.poor {
  background-color: rgba(254, 117, 41, 0.2);
  color: #fe7529;
}

.change-indicator {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.change-indicator.positive {
  color: #10B981;
}

.change-indicator.negative {
  color: #EF4444;
}

/* Campaigns List */
.campaigns-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.campaign-item {
  padding: 1rem;
  border-radius: 0.5rem;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
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

.roi-value {
  font-weight: 600;
}

.roi-value.positive {
  color: #92d000;
}

.roi-value.negative {
  color: #fe7529;
}
</style>