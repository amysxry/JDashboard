<template>
  <div class="dashboard-layout">
    <SidebarMenu />

    <div 
      class="main-content"
      :class="{
        'lg:ml-[280px]': !isSidebarCollapsed,
        'lg:ml-[80px]': isSidebarCollapsed
      }"
    >
      <main class="dashboard-content px-4 pt-20 md:px-8 bg-gray-50">
        <!-- Header con información general -->
        <div class="mb-8">
          <h1 class="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
          <p class="text-gray-600">Bienvenido, {{ clientName }}</p>
        </div>

        <!-- KPIs Principales -->
        <div class="grid gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="kpi in kpis" :key="kpi.title" 
            class="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:border-[#92d000] transition-all duration-300">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">{{ kpi.title }}</p>
                <h3 class="text-2xl font-bold text-gray-900">{{ kpi.value }}</h3>
              </div>
              <div :class="'p-3 rounded-lg ' + kpi.bgColor">
                <component :is="kpi.icon" class="w-6 h-6 text-white" />
              </div>
            </div>
            <div class="mt-4 flex items-center">
              <component 
                :is="kpi.trend === 'up' ? ArrowUpIcon : ArrowDownIcon" 
                class="w-4 h-4"
                :class="kpi.trend === 'up' ? 'text-green-500' : 'text-red-500'"
              />
              <span 
                class="ml-2 text-sm"
                :class="kpi.trend === 'up' ? 'text-green-500' : 'text-red-500'"
              >
                {{ kpi.change }}
              </span>
              <span class="text-gray-600 text-sm ml-2">vs mes anterior</span>
            </div>
          </div>
        </div>

        <!-- Gráficas y SEO -->
        <div class="grid gap-6 mb-8 lg:grid-cols-2">
          <!-- Gráfica de Visitas -->
          <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-900">Visitas al Sitio Web</h3>
              <div class="flex items-center gap-2 text-sm text-gray-600">
                <span class="font-medium text-[#92d000]">+15.8%</span>
                <span>vs mes anterior</span>
              </div>
            </div>
            <div class="h-[200px]">
              <Line 
                :data="visitChartData" 
                :options="chartOptions"
              />
            </div>
          </div>

          <!-- Posicionamiento SEO -->
          <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-lg font-semibold text-gray-900">Posicionamiento SEO</h3>
              <button 
                @click="refreshSEOData"
                class="text-sm px-3 py-1 bg-[#92d000] text-white rounded-lg hover:bg-[#7ab000] transition-colors"
              >
                Actualizar datos
              </button>
            </div>
            
            <div class="space-y-4">
              <div v-for="keyword in seoKeywords" :key="keyword.term" 
                class="p-4 rounded-lg border border-gray-100 hover:border-[#92d000] transition-all duration-300">
                <div class="flex justify-between items-center">
                  <div>
                    <p class="font-medium text-gray-900">{{ keyword.term }}</p>
                    <p class="text-sm text-gray-600">Última actualización: {{ keyword.lastUpdate }}</p>
                  </div>
                  <div class="text-center">
                    <div 
                      class="text-2xl font-bold"
                      :class="{
                        'text-green-500': keyword.position <= 10,
                        'text-yellow-500': keyword.position > 10 && keyword.position <= 20,
                        'text-red-500': keyword.position > 20
                      }"
                    >
                      #{{ keyword.position }}
                    </div>
                    <p class="text-sm text-gray-600">Posición</p>
                  </div>
                </div>
                <div class="mt-2 flex items-center">
                  <component 
                    :is="keyword.change > 0 ? ArrowUpIcon : ArrowDownIcon"
                    class="w-4 h-4"
                    :class="keyword.change > 0 ? 'text-green-500' : 'text-red-500'"
                  />
                  <span 
                    class="ml-1 text-sm"
                    :class="keyword.change > 0 ? 'text-green-500' : 'text-red-500'"
                  >
                    {{ Math.abs(keyword.change) }} posiciones
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Campañas Activas -->
        <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Campañas Activas</h3>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div v-for="campaign in campaigns" :key="campaign.id"
              class="p-4 rounded-lg border border-gray-100 hover:border-[#92d000] transition-all duration-300">
              <div class="flex items-center justify-between mb-2">
                <h4 class="font-medium text-gray-900">{{ campaign.name }}</h4>
                <span 
                  class="px-2 py-1 text-xs rounded-full"
                  :class="campaign.status === 'Activa' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'"
                >
                  {{ campaign.status }}
                </span>
              </div>
              <div class="space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">Presupuesto:</span>
                  <span class="font-medium text-gray-900">${{ campaign.budget }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">Gastado:</span>
                  <span class="font-medium text-gray-900">${{ campaign.spent }}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    class="bg-[#92d000] h-2 rounded-full"
                    :style="{ width: (campaign.spent/campaign.budget * 100) + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'
import { ArrowUpIcon, ArrowDownIcon, UsersIcon, CurrencyDollarIcon, ChartBarIcon, GlobeAltIcon } from '@heroicons/vue/24/solid'
import SidebarMenu from '@/components/SidebarMenu.vue'

// Registrar componentes de Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

// Estado
const isSidebarCollapsed = ref(false)
const clientName = ref('JDigital Marketing')

// KPIs
const kpis = ref([
  {
    title: 'Visitas Totales',
    value: '24,589',
    change: '+12.5%',
    trend: 'up',
    icon: UsersIcon,
    bgColor: 'bg-blue-500'
  },
  {
    title: 'Conversiones',
    value: '1,423',
    change: '+23.1%',
    trend: 'up',
    icon: ChartBarIcon,
    bgColor: 'bg-[#92d000]'
  },
  {
    title: 'ROI',
    value: '289%',
    change: '-2.4%',
    trend: 'down',
    icon: CurrencyDollarIcon,
    bgColor: 'bg-orange-500'
  },
  {
    title: 'Posición Media',
    value: '#4',
    change: '+2',
    trend: 'up',
    icon: GlobeAltIcon,
    bgColor: 'bg-purple-500'
  }
])

// Datos de la gráfica
const visitChartData = {
  labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
  datasets: [
    {
      label: 'Visitas 2025',
      data: [18000, 22000, 19000, 24000, 23000, 24589],
      borderColor: '#92d000',
      backgroundColor: 'rgba(146, 208, 0, 0.1)',
      tension: 0.4,
      fill: true
    }
  ]
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: '#1e1e1e',
      padding: 12,
      titleFont: {
        size: 13
      },
      bodyFont: {
        size: 12
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        display: true,
        color: '#f3f4f6',
        drawBorder: false
      },
      ticks: {
        font: {
          size: 11
        },
        maxTicksLimit: 5
      }
    },
    x: {
      grid: {
        display: false
      },
      ticks: {
        font: {
          size: 11
        }
      }
    }
  },
  elements: {
    point: {
      radius: 3,
      hoverRadius: 5
    },
    line: {
      borderWidth: 2
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
  }
])

// Campañas
const campaigns = ref([
  {
    id: 1,
    name: 'Campaña Verano 2025',
    status: 'Activa',
    budget: 5000,
    spent: 2340
  },
  {
    id: 2,
    name: 'Remarketing Clientes',
    status: 'Activa',
    budget: 3000,
    spent: 1200
  },
  {
    id: 3,
    name: 'SEO Local Puebla',
    status: 'En Pausa',
    budget: 2500,
    spent: 1800
  }
])

const refreshSEOData = () => {
  // Aquí iría la lógica para actualizar los datos de SEO
  // Por ahora solo actualizamos la fecha
  seoKeywords.value = seoKeywords.value.map(keyword => ({
    ...keyword,
    lastUpdate: new Date().toLocaleDateString()
  }))
}
</script>

<style scoped>
.dashboard-layout {
  min-height: 100vh;
  background: #f9fafb;
}

.main-content {
  transition: all 0.3s ease;
}

.dashboard-content {
  padding-bottom: 3rem;
}

@media (max-width: 640px) {
  .main-content {
    margin-left: 0;
  }
}
</style>
