<template>
  <div class="page-content-wrapper">
    <div v-if="isLoading" class="loading-container">
      <div class="spinner"></div>
      <p>Cargando tu dashboard...</p>
    </div>

    <div v-else class="dashboard-content">
      <header class="page-header">
        <h1 class="welcome-title">Hola, {{ clientName }} 👋</h1>
        <p class="welcome-subtitle">Bienvenido a tu centro de mando. Aquí tienes el pulso de tu proyecto.</p>
      </header>

      <main class="content-grid">
        <div class="content-card balance-card">
          <div class="card-icon-bg">
            <Wallet class="h-6 w-6" />
          </div>
          <div class="balance-info">
            <h3 class="card-label">Saldo Disponible</h3>
            <div class="balance-value">${{ formatCurrency(clientBalance) }}</div>
            <p class="card-description">Fondos actuales en tu cuenta.</p>
          </div>
        </div>

        <div v-if="keywordToWatch" class="content-card insight-card">
          <div class="card-icon-bg">
            <TrendingUp class="h-6 w-6" />
          </div>
          <div class="insight-info">
            <h3 class="card-label">Análisis Rápido</h3>
            <p class="insight-text">
              ¡Buen trabajo! Tu palabra clave
              <strong>"{{ keywordToWatch.term }}"</strong>
              subió a la posición
              <strong>#{{ keywordToWatch.position }}</strong>.
            </p>
          </div>
        </div>
        
        <div class="content-card seo-card">
          <div class="card-header">
            <h3 class="card-title">Reporte de Posicionamiento SEO</h3>
            <div class="help-container"
                 @mouseenter="showPopover($event)"
                 @mouseleave="hidePopover">
              <HelpCircle class="h-5 w-5" />
            </div>
          </div>
          <div v-if="seoKeywords.length === 0" class="no-data-message">
            Aún no hay datos de SEO para mostrar.
          </div>
          <div v-else class="seo-table-container">
            <table class="seo-table">
              <thead>
                <tr>
                  <th>Palabra Clave</th>
                  <th>Posición</th>
                  <th>Cambio (7d)</th>
                  <th>Última Revisión</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="keyword in seoKeywords" :key="keyword.term">
                  <td class="keyword-cell">{{ keyword.term }}</td>
                  <td>
                    <span class="position-badge" :class="getPositionBadgeClass(keyword.position)">
                      #{{ keyword.position }}
                    </span>
                  </td>
                  <td>
                    <span v-if="keyword.change !== 0" class="change-indicator" :class="{'positive': keyword.change > 0, 'negative': keyword.change < 0}">
                      <component :is="keyword.change > 0 ? ArrowUpIcon : ArrowDownIcon" class="h-3 w-3" />
                      {{ Math.abs(keyword.change) }}
                    </span>
                    <span v-else class="change-indicator neutral">-</span>
                  </td>
                  <td>{{ keyword.lastUpdate }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>

    <Transition name="popover-fade">
      <div v-if="showHelpPopover" class="help-popover" :style="{ top: popoverY + 'px', left: popoverX + 'px' }">
        <p class="popover-text">Muestra la posición de tus palabras clave en Google y su cambio reciente.</p>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { supabase } from '@/lib/supabaseClient';
import { ArrowUpIcon, ArrowDownIcon, HelpCircle, Wallet, TrendingUp } from 'lucide-vue-next';

// --- Estado de datos ---
const isLoading = ref(true);
const clientName = ref('');
const clientBalance = ref(null);
const seoKeywords = ref([]);
const showHelpPopover = ref(false);
const popoverX = ref(0);
const popoverY = ref(0);
let hidePopoverTimeout = null;

// --- Propiedades Computadas ---
const keywordToWatch = computed(() => {
  if (!seoKeywords.value || seoKeywords.value.length === 0) return null;
  // Encuentra la palabra clave con el cambio positivo más grande
  return seoKeywords.value
    .filter(k => k.change > 0)
    .sort((a, b) => b.change - a.change)[0] || null;
});

// --- Funciones de Utilidad ---
const formatCurrency = (value) => {
  if (value === null || value === undefined) return '0.00';
  return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const getPositionBadgeClass = (position) => {
  if (position <= 3) return 'excellent';
  if (position <= 10) return 'good';
  if (position <= 20) return 'average';
  return 'poor';
};

// --- Funciones de Datos ---
const fetchDashboardData = async () => {
  isLoading.value = true;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data: clientData, error } = await supabase
      .from('clientes')
      .select('id, empresa, saldo')
      .eq('auth_id', user.id)
      .single();
    if (error) throw error;

    clientName.value = clientData.empresa;
    clientBalance.value = clientData.saldo;

    await fetchSeoData(clientData.id);
  } catch (error) {
    console.error('Error al cargar datos del dashboard:', error);
  } finally {
    isLoading.value = false;
  }
};

const fetchSeoData = async (clienteId) => {
  try {
    const { data, error } = await supabase
      .from('seo_rankings')
      .select('position, previous_position, created_at, monitored_keywords(keyword)')
      .eq('cliente_id', clienteId)
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
          lastUpdate: new Date(row.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
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
const showPopover = (event) => {
  clearTimeout(hidePopoverTimeout);
  const rect = event.target.getBoundingClientRect();
  popoverX.value = rect.left + rect.width / 2;
  popoverY.value = rect.top - 10;
  showHelpPopover.value = true;
};
const hidePopover = () => {
  hidePopoverTimeout = setTimeout(() => { showHelpPopover.value = false; }, 200);
};

// --- Hooks de Ciclo de Vida ---
onMounted(fetchDashboardData);
onUnmounted(() => clearTimeout(hidePopoverTimeout));
</script>

<style scoped>
/* --- DISEÑO GENERAL Y BIENVENIDA --- */
.page-content-wrapper {
  padding: 2rem;
  width: 100%;
  box-sizing: border-box;
  background-color: var(--color-bg-dark);
}

.loading-container {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: calc(100vh - 4rem); color: var(--color-text-secondary); gap: 1rem;
}
.spinner {
  width: 48px; height: 48px; border: 5px solid var(--color-border);
  border-bottom-color: var(--color-primary); border-radius: 50%;
  animation: rotation 1s linear infinite;
}
@keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

.page-header {
  margin-bottom: 2rem;
}
.welcome-title {
  font-size: 2.25rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}
.welcome-subtitle {
  font-size: 1.1rem;
  color: var(--color-text-secondary);
  margin-top: 0.25rem;
}

/* --- GRILLA Y TARJETAS --- */
.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.content-card {
  background-color: var(--color-bg-accent);
  border-radius: var(--border-radius-xl);
  padding: 1.5rem;
  border: 1px solid var(--color-border);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  display: flex;
  flex-direction: column;
}
.content-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
  border-color: #4f4f4f;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}
.card-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text-primary);
}
.help-container {
  cursor: help;
  color: var(--color-text-secondary);
  transition: color 0.2s ease;
}
.help-container:hover { color: var(--color-primary); }

.card-label {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

/* --- TARJETAS PEQUEÑAS (SALDO Y ANÁLISIS) --- */
.balance-card, .insight-card {
  flex-direction: row;
  align-items: center;
  gap: 1.5rem;
}
.card-icon-bg {
  width: 48px; height: 48px;
  border-radius: var(--border-radius-lg);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.balance-card .card-icon-bg { background-color: rgba(146, 208, 0, 0.15); color: #92d000; }
.insight-card .card-icon-bg { background-color: rgba(59, 130, 246, 0.15); color: #3b82f6; }

.balance-value {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.2;
}
.card-description { font-size: 0.8rem; color: #828282; margin-top: 0.1rem; }
.insight-text {
  font-size: 1rem;
  color: var(--color-text-primary);
  line-height: 1.4;
}
.insight-text strong { font-weight: 600; }

/* --- TARJETA GRANDE DE SEO --- */
.seo-card {
  grid-column: 1 / -1; /* Ocupa todo el ancho */
}
@media (min-width: 992px) {
  .content-grid {
    grid-template-columns: 1fr 1fr; /* Dos columnas en pantallas medianas */
  }
  .seo-card {
    grid-column: span 2; /* Abarca las dos columnas */
  }
}

.seo-table-container { width: 100%; overflow-x: auto; }
.seo-table { width: 100%; border-collapse: collapse; }
.seo-table th, .seo-table td {
  padding: 1rem; text-align: left;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}
.seo-table th {
  color: var(--color-text-secondary); font-weight: 600;
  font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;
}
.keyword-cell { font-weight: 500; color: var(--color-text-primary); }

.position-badge {
  display: inline-block; padding: 0.3rem 0.8rem;
  border-radius: 99px; font-weight: 600; font-size: 0.85rem;
}
.position-badge.excellent { background-color: rgba(22, 163, 74, 0.15); color: #16a34a; }
.position-badge.good { background-color: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.position-badge.average { background-color: rgba(249, 115, 22, 0.15); color: #f97316; }
.position-badge.poor { background-color: rgba(220, 38, 38, 0.15); color: #dc2626; }

.change-indicator { display: inline-flex; align-items: center; gap: 0.25rem; font-weight: 600; }
.change-indicator.positive { color: #16a34a; }
.change-indicator.negative { color: #dc2626; }
.change-indicator.neutral { color: var(--color-text-secondary); }

.no-data-message {
  text-align: center; padding: 3rem; color: var(--color-text-secondary);
  font-style: italic; flex-grow: 1; display: flex;
  align-items: center; justify-content: center;
}

/* --- POPOVER Y RESPONSIVIDAD --- */
.help-popover {
  position: fixed; background-color: #2a2a2a; color: #fff;
  padding: 0.5rem 1rem; border-radius: var(--border-radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); font-size: 0.875rem;
  z-index: 1000; pointer-events: none; transform: translate(-50%, -100%);
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.popover-fade-enter-from, .popover-fade-leave-to { opacity: 0; transform: translate(-50%, -90%); }

@media (max-width: 767px) {
  .page-content-wrapper { padding: 1.5rem 1rem; }
  .welcome-title { font-size: 1.75rem; }
  .welcome-subtitle { font-size: 1rem; }
  .content-grid { grid-template-columns: 1fr; }
  .balance-card, .insight-card { flex-direction: column; align-items: flex-start; }
}
</style>