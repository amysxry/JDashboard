<template>
  <div class="dashboard-layout" :class="{ 'collapsed': isSidebarCollapsed }">
    <SidebarMenu v-model:collapsed="isSidebarCollapsed" @sidebar-width-changed="handleSidebarWidthChange" />

    <div class="main-content" :style="{ marginLeft: dynamicMarginLeft }">
      <header class="dashboard-header">
        <div class="header-content">
          <div class="welcome-section">
            <h1 class="dashboard-title">¡Bienvenido, {{ clientName }}! 👋</h1>
            <p class="welcome-subtitle">Aquí tienes un resumen de tu actividad y métricas clave</p>
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
        <!-- Sección de Saldo Destacado -->
        <section class="balance-section">
          <div class="balance-card">
            <div class="balance-content">
              <div class="balance-icon">
                <Wallet class="h-6 w-6" />
              </div>
              <div class="balance-info">
                <h3 class="balance-label">Saldo disponible</h3>
                <div class="balance-value">${{ formatCurrency(clientBalance) }}</div>
                <p class="balance-description">Saldo actual en tu cuenta</p>
              </div>
            </div>
            <div class="balance-actions">
              <button class="action-btn primary">
                <Plus class="h-4 w-4" />
                <span>Recargar saldo</span>
              </button>
              <button class="action-btn secondary">
                <History class="h-4 w-4" />
                <span>V</span>
              </button>
            </div>
          </div>
        </section>

        <!-- Sección de Trabajo del Mes -->
        <section class="monthly-work-section">
          <div class="section-header">
            <h2 class="section-title">Este mes se estará trabajando con:</h2>
          </div>
          
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-header">
                <div class="metric-icon bg-blue-100 text-blue-600">
                  <FileText class="h-5 w-5" />
                </div>
                <div class="metric-trend positive">
                  <TrendingUp class="h-4 w-4" />
                  <span>12%</span>
                </div>
              </div>
              <div class="metric-content">
                <h3 class="metric-value">{{ monthlyMetrics.wordpressPosts }}</h3>
                <p class="metric-title">Publicaciones planeadas</p>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-header">
                <div class="metric-icon bg-indigo-100 text-indigo-600">
                  <ListChecks class="h-5 w-5" />
                </div>
                <div class="metric-trend positive">
                  <TrendingUp class="h-4 w-4" />
                  <span>8%</span>
                </div>
              </div>
              <div class="metric-content">
                <h3 class="metric-value">{{ monthlyMetrics.activeTasks }}</h3>
                <p class="metric-title">Tareas activas</p>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-header">
                <div class="metric-icon bg-green-100 text-green-600">
                  <Megaphone class="h-5 w-5" />
                </div>
                <div class="metric-trend negative">
                  <TrendingDown class="h-4 w-4" />
                  <span>5%</span>
                </div>
              </div>
              <div class="metric-content">
                <h3 class="metric-value">{{ monthlyMetrics.activeCampaigns }}</h3>
                <p class="metric-title">Campañas en curso</p>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-header">
                <div class="metric-icon bg-purple-100 text-purple-600">
                  <BarChart2 class="h-5 w-5" />
                </div>
                <div class="metric-trend positive">
                  <TrendingUp class="h-4 w-4" />
                  <span>15%</span>
                </div>
              </div>
              <div class="metric-content">
                <h3 class="metric-value">{{ monthlyMetrics.keywordsTracked }}</h3>
                <p class="metric-title">Palabras clave monitoreadas</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Sección de Posicionamiento SEO (sin cambios) -->
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
import { 
  ArrowUpIcon,
  ArrowDownIcon,
  RefreshCw,
  HelpCircle,
  Wallet,
  Plus,
  History,
  FileText,
  ListChecks,
  Megaphone,
  BarChart2,
  TrendingUp,
  TrendingDown
} from 'lucide-vue-next'
import SidebarMenu from '@/components/SidebarMenu.vue'

// --- Estado del layout ---
const sidebarWidth = ref(200);
const isMobileLayout = ref(false);
const isSidebarCollapsed = ref(true);
const dynamicMarginLeft = computed(() => isMobileLayout.value ? '0' : `${sidebarWidth.value}px`);
const handleSidebarWidthChange = (event) => { sidebarWidth.value = event.detail.width; };
const checkLayoutSize = () => { isMobileLayout.value = window.innerWidth < 1024; };

// --- Estado de datos ---
const profilePhotoUrl = ref('');
const clientName = ref('Cargando...');
const clientBalance = ref(null);
const isLoading = ref(true);
const clientGaId = ref(null);
const seoKeywords = ref([]);
const showHelpPopover = ref(false);
const currentHelpText = ref('');
const popoverX = ref(0);
const popoverY = ref(0);
let hidePopoverTimeout = null;

// Datos simulados para las métricas del mes
const monthlyMetrics = ref({
  wordpressPosts: 8,
  activeTasks: 15,
  activeCampaigns: 3,
  keywordsTracked: 24
});

// --- Funciones de utilidad ---
const getInitials = (name) => {
  if (!name) return '';
  const names = name.split(' ');
  let initials = names[0].substring(0, 1).toUpperCase();
  if (names.length > 1) {
    initials += names[names.length - 1].substring(0, 1).toUpperCase();
  }
  return initials;
};

const formatCurrency = (value) => {
  if (value === null || value === undefined) return '0.00';
  return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// --- Funciones de datos ---
const fetchClientInfo = async () => {
  isLoading.value = true;
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
      await fetchSeoData();
    }

    // Simular carga de métricas integradas
    setTimeout(() => {
      monthlyMetrics.value = {
        wordpressPosts: Math.floor(Math.random() * 10) + 5,
        activeTasks: Math.floor(Math.random() * 20) + 10,
        activeCampaigns: Math.floor(Math.random() * 5) + 1,
        keywordsTracked: Math.floor(Math.random() * 30) + 15
      };
    }, 800);

  } catch (error) {
    console.error('Error al cargar info del cliente:', error);
    clientName.value = 'Usuario';
  } finally {
    isLoading.value = false;
  }
};

const fetchSeoData = async () => {
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

// --- Funciones de UI ---
const refreshData = async () => { 
  await fetchClientInfo(); 
};

const showPopover = (title, event) => {
  clearTimeout(hidePopoverTimeout);
  currentHelpText.value = helpDefinitions[title] || `Información sobre ${title}`;
  popoverX.value = event.clientX + 10;
  popoverY.value = event.clientY + 10;
  showHelpPopover.value = true;
};

const hidePopover = () => {
  hidePopoverTimeout = setTimeout(() => {
    showHelpPopover.value = false;
  }, 200);
};

// Definiciones de ayuda
const helpDefinitions = {
  'Posicionamiento SEO': 'Posiciones actuales de tus palabras clave en los resultados de búsqueda de Google.',
  'Publicaciones planeadas': 'Número de publicaciones programadas para WordPress este mes.',
  'Tareas activas': 'Tareas pendientes en Asana asignadas a tu proyecto.',
  'Campañas en curso': 'Campañas activas actualmente en Google Ads.',
  'Palabras clave monitoreadas': 'Palabras clave que estamos rastreando para tu posicionamiento SEO.'
};

// --- Hooks ---
onMounted(() => {
  checkLayoutSize();
  window.addEventListener('resize', checkLayoutSize);
  window.addEventListener('sidebar-width-changed', handleSidebarWidthChange);
  fetchClientInfo();
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
  display: flex;
}

.main-content {
  flex-grow: 1;
  padding: 2rem;
  overflow-y: auto;
  min-height: 100vh;
  transition: margin-left 0.3s ease;
  box-sizing: border-box;
  width: auto;
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
  font-size: 1.5rem;
  font-weight: 600;
}

.welcome-subtitle {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  margin-top: 0.5rem;
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
  max-width: 100%;
  margin: 0 auto;
}

/* Sección de Saldo */
.balance-section {
  margin-bottom: 2rem;
}

.balance-card {
  background: linear-gradient(135deg, rgba(146, 208, 0, 0.1) 0%, rgba(146, 208, 0, 0.05) 100%);
  border: 1px solid rgba(146, 208, 0, 0.2);
  border-radius: 1rem;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .balance-card {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}

.balance-content {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.balance-icon {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 0.75rem;
  background-color: rgba(146, 208, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #92d000;
}

.balance-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.balance-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 1rem;
  font-weight: 500;
}

.balance-value {
  color: #ffffff;
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
}

.balance-description {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.875rem;
}

.balance-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: 0.75rem;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
}

.action-btn.primary {
  background-color: #92d000;
  color: #1e1e1e;
}

.action-btn.primary:hover {
  background-color: #7eb300;
  transform: translateY(-1px);
}

.action-btn.secondary {
  background-color: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.action-btn.secondary:hover {
  background-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

/* Sección de Trabajo del Mes */
.monthly-work-section {
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.section-title {
  color: #ffffff;
  font-size: 1.25rem;
  font-weight: 600;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  grid-gap: 1.5rem;
}

@media (min-width: 640px) {
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .metrics-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.metric-card {
  background-color: #2a2a2a;
  border: 1px solid rgba(146, 208, 0, 0.1);
  border-radius: 1rem;
  padding: 1.5rem;
  transition: all 0.3s ease;
  position: relative;
}

.metric-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  border-color: rgba(146, 208, 0, 0.3);
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.metric-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.metric-trend {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.metric-trend.positive {
  color: #92d000;
}

.metric-trend.negative {
  color: #ff0000;
}

.metric-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.metric-value {
  font-size: 1.75rem;
  font-weight: 600;
  color: #ffffff;
  line-height: 1;
}

.metric-title {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
}

/* Sección de Posicionamiento SEO (sin cambios) */
.data-section {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 2rem;
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
  white-space: nowrap;
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
  display: flex;
  align-items: center;
  justify-content: center;
}

.help-popover {
  position: fixed;
  background-color: #3a3a3a;
  color: #ffffff;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  max-width: 250px;
  font-size: 0.875rem;
  z-index: 1000;
  pointer-events: none;
  opacity: 0;
  transform: scale(0.9);
  transition: opacity 0.2s ease, transform 0.2s ease;
  transform-origin: top left;
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

/* Responsive adjustments */
@media (max-width: 1023px) {
  .dashboard-layout {
    flex-direction: column;
  }

  .main-content {
    margin-left: 0 !important;
    width: 100%;
    padding-top: 1rem;
  }

  .dashboard-layout.collapsed .main-content {
    margin-left: 0 !important;
  }
  
  .balance-card {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .balance-actions {
    width: 100%;
  }
  
  .action-btn {
    flex-grow: 1;
    justify-content: center;
  }
}

@media (max-width: 640px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .refresh-btn {
    flex-grow: 1;
    justify-content: center;
  }
}
</style>