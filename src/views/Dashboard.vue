<template>
  <div class="dashboard-layout">
    <SidebarMenu v-model:collapsed="isSidebarCollapsed" />

    <div class="main-content">
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

          <div class="data-card">
            <div class="data-header">
              <h3 class="data-title">Campañas Activas</h3>
              <div class="help-container"
                   @mouseenter="showPopover('Campañas Activas', $event)"
                   @mouseleave="hidePopover">
                <HelpCircle class="h-4 w-4 text-gray-400 hover:text-gray-200 transition-colors cursor-help" />
              </div>
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
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { Line, Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js'
//                                                                                                                              ^-- ¡Asegúrate de que 'Filler' esté aquí!
import {
  ArrowUpIcon,
  ArrowDownIcon,
  UsersIcon,
  ShoppingCartIcon,
  BarChart2Icon,
  RefreshCw,
  HelpCircle,
  PercentIcon // Importar el nuevo icono para Porcentaje de Conversión
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
  Legend,
  Filler
)

const profilePhotoUrl = ref(''); // Nueva ref para la URL de la foto de perfil

// Estado
const isSidebarCollapsed = ref(true)
const clientName = ref('Cargando...')
const clientBalance = ref(null); // Nuevo ref para el saldo del cliente
const timeRange = ref('30d')
const gaData = ref([])
const isLoading = ref(true);
const clientGaId = ref(null);

// Estado del Popover de Ayuda
const showHelpPopover = ref(false);
const currentHelpText = ref('');
const popoverX = ref(0);
const popoverY = ref(0);
let hidePopoverTimeout = null;

// Definiciones de ayuda más fáciles y sencillas
const helpDefinitions = {
  'Visitas Totales (Sesiones)': 'Cuántas veces la gente visitó tu sitio web. Una visita es cuando alguien navega por tu sitio.',
  'Usuarios Activos': 'Cuántas personas diferentes visitaron tu sitio web.',
  'Conversiones': 'Cuántas veces la gente hizo algo importante en tu sitio (ej. llenó un formulario, hizo una compra).',
  'Porcentaje de Conversión': 'El porcentaje de visitas que terminaron en una acción importante (ej. compra, contacto).',
  'Tasa de Rebote Promedio': 'Porcentaje de visitas donde la gente se fue de inmediato. Si es alta, puede que algo no les interesara.',
  'Vistas de Página': 'El número total de veces que se vieron las páginas de tu sitio.',
  'Visitas al Sitio Web': 'Cómo ha cambiado el número de visitas a tu sitio web con el tiempo.',
  'Posicionamiento SEO': 'Qué tan arriba aparece tu sitio en los resultados de búsqueda de Google (orgánicos). Un número más bajo es mejor.',
  'Campañas Activas': 'Cómo van tus anuncios pagados (ej. en Google). Muestra cuánto se ha gastado y si están dando ganancias.'
};

// --- Funciones de Utilidad ---
const getInitials = (name) => {
  if (!name) return '';
  return name.split(' ').map(part => part[0]).join('').toUpperCase()
}

// Función para formatear moneda
const formatCurrency = (value) => {
  if (value === null || isNaN(value)) return '0.00';
  return parseFloat(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// Función para calcular rangos de fechas (CORREGIDA)
const getDateRange = (range) => {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0]; // Fecha actual como fin

  let startDateObj = new Date(today); // Crear una nueva instancia para calcular la fecha de inicio

  switch (range) {
    case '7d':
      startDateObj.setDate(startDateObj.getDate() - 7);
      break;
    case '30d':
      startDateObj.setDate(startDateObj.getDate() - 30);
      break;
    // La opción de 90d ya no está en el selector, pero la función la sigue manejando si se le pasa
    case '90d':
      startDateObj.setDate(startDateObj.getDate() - 90);
      break;
    default: // En caso de que se pase un valor no esperado, por defecto 30 días
      startDateObj.setDate(startDateObj.getDate() - 30);
  }
  const startDate = startDateObj.toISOString().split('T')[0]; // Fecha de inicio calculada
  return { startDate, endDate };
};


// --- Funciones para Obtener Datos ---
const fetchClientInfo = async () => {
  isLoading.value = true;
  clientGaId.value = null;
  clientBalance.value = null; // Resetear saldo

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Error al obtener usuario autenticado:', userError);
      clientName.value = 'Usuario';
      gaData.value = [];
      seoKeywords.value = []; // Limpia también los datos de SEO
      isLoading.value = false;
      return;
    }
    console.log("Usuario autenticado (auth_id):", user.id);

    // Modificado para también obtener el saldo
    const { data: clientData, error: clientError } = await supabase
      .from('clientes')
      .select('id, empresa, saldo, avatar_url') // Incluir 'saldo'
      .eq('auth_id', user.id)
      .single();

    if (clientError) {
      console.error('Error al cargar información del cliente desde tabla "clientes" (puede ser por RLS o no hay un cliente vinculado al auth_id):', clientError);
      clientName.value = 'Usuario';
      gaData.value = [];
      seoKeywords.value = []; // Limpia también los datos de SEO
      isLoading.value = false;
      return;
    } else {
      clientName.value = clientData?.empresa || 'Usuario';
      clientGaId.value = clientData?.id;
      clientBalance.value = clientData?.saldo || 0; 
      profilePhotoUrl.value = clientData?.avatar_url || '';
      console.log("Nombre del cliente (empresa):", clientName.value);
      console.log("ID del cliente (UUID de la tabla clientes):", clientGaId.value);
      console.log("Saldo del cliente:", clientBalance.value);
      console.log("Client Profile Photo URL:", profilePhotoUrl.value);
    }

    if (clientGaId.value) {
      await fetchAnalyticsData();
      await fetchSeoData(); // ¡Aquí se llama a la nueva función de SEO!
    } else {
      console.warn("No se pudo obtener el ID del cliente de la tabla 'clientes' a partir del auth_id del usuario logueado. No se cargarán los datos de GA ni SEO.");
      gaData.value = [];
      seoKeywords.value = []; // Limpia también los datos de SEO
      isLoading.value = false;
    }

  } catch (error) {
    console.error('Error general al cargar info del cliente, GA o SEO:', error);
    clientName.value = 'Usuario';
    gaData.value = [];
    seoKeywords.value = []; // Limpia también los datos de SEO en caso de cualquier error
    isLoading.value = false;
  } finally {
    // Es importante asegurar que isLoading.value se ponga en false
    // al final de todo el proceso de carga, independientemente del éxito o error.
    // Esto es especialmente relevante si en un futuro añades más llamadas asíncronas aquí.
    if (isLoading.value) { // Solo si no se ha puesto en false antes por un return temprano
       isLoading.value = false;
    }
  }
};


const fetchAnalyticsData = async () => {
  isLoading.value = true;
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
      .select('date, sessions, users, conversions, bounce_rate, avg_session_duration, page_views')
      .eq('cliente_id', clientGaId.value)
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

const fetchSeoData = async () => {
  isLoading.value = true;
  seoKeywords.value = [];

  try {
    if (!clientGaId.value) {
      console.warn("Client ID no disponible, no se pueden cargar datos de SEO.");
      seoKeywords.value = [];
      isLoading.value = false;
      return;
    }

    console.log(`Consultando seo_rankings y monitored_keywords para cliente_id: ${clientGaId.value}`);

    const { data, error } = await supabase
      .from('seo_rankings')
      // CAMBIO CLAVE AQUÍ: Eliminamos 'url' del select
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
          lastUpdate: row.created_at ? new Date(row.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'
        };
      }
    });

    seoKeywords.value = Object.values(latestKeywords);
    console.log("Datos de SEO cargados:", seoKeywords.value.length, "registros.");

    if (seoKeywords.value.length === 0) {
      console.warn("No hay datos de posicionamiento SEO disponibles para este cliente en la base de datos.");
    }

  } catch (error) {
    console.error('Error al cargar datos de SEO desde Supabase:', error);
    seoKeywords.value = [];
  } finally {
    isLoading.value = false;
  }
};


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

const conversionRate = computed(() => {
  const totalSessionsVal = totalSessions.value;
  const totalConversionsVal = totalConversions.value;
  if (totalSessionsVal === 0) return '0.00';
  return ((totalConversionsVal / totalSessionsVal) * 100).toFixed(2);
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
      title: 'Porcentaje de Conversión',
      value: `${conversionRate.value}%`,
      change: null,
      trend: 'up',
      progress: 80,
      icon: PercentIcon,
      bgColor: 'bg-yellow-100 text-yellow-600'
    },
    {
      title: 'Tasa de Rebote Promedio',
      value: `${averageBounceRate.value}%`,
      change: null,
      trend: 'down', // Asumimos 'down' es bueno para la tasa de rebote
      progress: 70, // Esto podría ser inverso para la tasa de rebote (menos es mejor)
      icon: BarChart2Icon,
      bgColor: 'bg-red-100 text-red-600'
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

const seoKeywords = ref([]);

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

const showPopover = (title, event) => {
  clearTimeout(hidePopoverTimeout);
  currentHelpText.value = helpDefinitions[title] || 'No hay descripción disponible.';
  showHelpPopover.value = true;

  nextTick(() => {
    const iconRect = event.currentTarget.getBoundingClientRect();
    const popoverElement = document.querySelector('.help-popover');
    if (popoverElement) {
      // Ajustar posición del popover para que aparezca a la derecha del icono
      popoverX.value = iconRect.right + 10;
      popoverY.value = iconRect.top + (iconRect.height / 2) - (popoverElement.offsetHeight / 2);

      // Simple ajuste para que no se salga de la pantalla por la derecha
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      if (popoverX.value + popoverElement.offsetWidth > viewportWidth - 20) {
        popoverX.value = iconRect.left - popoverElement.offsetWidth - 10;
        popoverElement.classList.add('popover-left'); // Para ajustar la flecha
      } else {
        popoverElement.classList.remove('popover-left');
      }

      // Simple ajuste para que no se salga de la pantalla por arriba o abajo
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      if (popoverY.value < 10) {
        popoverY.value = 10;
      }
      if (popoverY.value + popoverElement.offsetHeight > viewportHeight - 10) {
        popoverY.value = viewportHeight - popoverElement.offsetHeight - 10;
      }
    }
  });
};

const hidePopover = () => {
  hidePopoverTimeout = setTimeout(() => {
    showHelpPopover.value = false;
    currentHelpText.value = '';
  }, 100);
};

onMounted(async () => {
  await fetchClientInfo();
});

watch(timeRange, () => {
  fetchAnalyticsData();
});
</script>

<style scoped>
/* Tu CSS existente */
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
  margin-right: -7rem; /* Ajuste para ocupar más espacio si es necesario */
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
  flex-wrap: wrap; /* Permite que los elementos se envuelvan en pantallas pequeñas */
  gap: 1rem; /* Espacio entre los elementos del encabezado */
  max-width: 100%;
  margin: 0 auto;
}

.welcome-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem; /* Espacio entre el título y el subtítulo/saldo */
}

.dashboard-title {
  color: #ffffff;
  margin-bottom: 0; /* Elimina margen inferior extra */
}

.welcome-subtitle {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  margin-top: 0.5rem; /* Asegura espacio si el saldo está arriba */
}

/* Estilos para la sección de saldo */
.saldo-section {
  background-color: rgba(146, 208, 0, 0.1);
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  display: inline-flex; /* Permite que el contenedor se ajuste al contenido */
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: #92d000;
  margin-top: 0.5rem; /* Espacio con el título */
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
  flex-wrap: wrap; /* Permite que se envuelvan en pantallas pequeñas */
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
  grid-template-columns: repeat(1, 1fr); /* Default for mobile */
  grid-gap: 1.5rem;
  margin-bottom: 2rem;
}

@media (min-width: 640px) {
  .kpis-grid {
    grid-template-columns: repeat(2, 1fr); /* 2 columns on small screens */
  }
}

@media (min-width: 1024px) {
  .kpis-grid {
    grid-template-columns: repeat(4, 1fr); /* 4 columns on large screens */
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

.position-badge {
  padding: 0.25rem 0.6rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.8rem;
  display: inline-block;
}

.position-badge.excellent {
  background-color: rgba(146, 208, 0, 0.2);
  color: #92d000;
}
.position-badge.good {
  background-color: rgba(60, 180, 255, 0.2);
  color: #3cb4ff;
}
.position-badge.average {
  background-color: rgba(255, 193, 7, 0.2);
  color: #ffc107;
}
.position-badge.poor {
  background-color: rgba(220, 53, 69, 0.2);
  color: #dc3545;
}

.change-indicator {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: 500;
}
.change-indicator.positive {
  color: #92d000;
}
.change-indicator.negative {
  color: #fe7529;
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

.help-container {
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: help;
  padding: 5px;
}

.chart-header, .data-header {
  position: relative;
  padding-right: 2.5rem;
}

.help-popover {
  position: fixed;
  background-color: #3a3a3a;
  border: 1px solid rgba(146, 208, 0, 0.3);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  max-width: 250px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  z-index: 100;
  color: #e0e0e0;
  font-size: 0.85rem;
  line-height: 1.4;
  pointer-events: none; /* No interactuar con el mouse, solo mostrar */
  transition: opacity 0.2s ease, transform 0.2s ease;
  transform-origin: left center;
}

/* Transiciones para el popover */
.popover-fade-enter-active, .popover-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.popover-fade-enter-from, .popover-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.popover-text {
  margin: 0;
}

.popover-arrow {
  position: absolute;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 6px 6px 6px 0; /* Flecha hacia la izquierda */
  border-color: transparent #3a3a3a transparent transparent;
  left: -6px;
  top: 50%;
  transform: translateY(-50%);
}

.help-popover.popover-left .popover-arrow {
  border-width: 6px 0 6px 6px; /* Flecha hacia la derecha */
  border-color: transparent transparent transparent #3a3a3a;
  left: auto;
  right: -6px;
}

/* Media query para ajustar el margen del main-content cuando el sidebar está colapsado */
.dashboard-layout.collapsed .main-content {
  margin-left: 80px; /* Ajusta este valor al ancho de tu sidebar colapsado */
}
</style>