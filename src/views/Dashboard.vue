<template>
  <div class="page-content-wrapper">
    <div v-if="isLoading" class="loading-container">
      <div class="spinner"></div>
      <p>Cargando tu dashboard...</p>
    </div>

    <div v-else class="dashboard-content">
      <header class="page-header">
        <div class="header-left">
          <h1 class="welcome-title">Bienvenido, {{ clientName }} ❤️</h1>
          <p class="welcome-subtitle">Visualiza el rendimiento real de tu sitio</p>
        </div>
        <div class="header-right">
          <div class="date-display">
            <CalendarDays class="date-icon" />
            <div class="date-info">
              <span class="date-main">{{ currentDate }}</span>
              <span class="date-sub">{{ currentTime }}</span>
            </div>
          </div>
        </div>
      </header>

      <main class="content-grid">
        <div class="left-column">
          <div class="content-card balance-card">
            <div class="card-icon-bg">
              <Wallet class="h-6 w-6" />
            </div>
            <div class="balance-info">
              <div class="card-header">
                <h3 class="card-label">Saldo Disponible</h3>
                <div class="help-container"
                     @mouseenter="showPopover($event)"
                     @mouseleave="hidePopover">
                  <HelpCircle class="h-4 w-4" />
                </div>
              </div>
              <div class="balance-value">${{ formatCurrency(clientBalance) }}</div>
              <p class="card-description">Fondos actuales en tu cuenta.</p>
            </div>
          </div>

          <div class="content-card calendar-card">
            <div class="card-header">
              <h3 class="card-label">Calendario</h3>
              <div class="help-container"
                   @mouseenter="showPopover($event)"
                   @mouseleave="hidePopover">
                <HelpCircle class="h-4 w-4" />
              </div>
            </div>
            <div class="mini-calendar">
              <div class="calendar-header">
                <span class="current-month">{{ currentMonth }}</span>
                <span class="current-year">{{ currentYear }}</span>
              </div>
              <div class="calendar-weekdays">
                <span v-for="day in weekdays" :key="day" class="weekday">{{ day }}</span>
              </div>
              <div class="calendar-grid">
                <span 
                  v-for="date in calendarDates" 
                  :key="date.key"
                  class="calendar-date"
                  :class="{
                    'current-day': date.isToday,
                    'other-month': date.isOtherMonth,
                    'weekend': date.isWeekend
                  }"
                >
                  {{ date.day }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="right-column">
          <div v-if="keywordToWatch" class="content-card insight-card">
            <div class="card-icon-bg">
              <TrendingUp class="h-6 w-6" />
            </div>
            <div class="insight-info">
              <div class="card-header">
                <h3 class="card-label">Análisis Rápido</h3>
                <div class="help-container"
                     @mouseenter="showPopover($event)"
                     @mouseleave="hidePopover">
                  <HelpCircle class="h-4 w-4" />
                </div>
              </div>
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
              <h3 class="card-title">Palabras Clave Principales</h3>
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
        </div>
      </main>
    </div>

    <Transition name="popover-fade">
      <div v-if="showHelpPopover" class="help-popover" :style="{ top: popoverY + 'px', left: popoverX + 'px' }">
        <p class="popover-text">{{ getTooltipText() }}</p>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { supabase } from '@/lib/supabaseClient';
import { ArrowUpIcon, ArrowDownIcon, HelpCircle, Wallet, TrendingUp, CalendarDays } from 'lucide-vue-next';

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

// --- Computed Properties for Date/Time ---
const currentDate = computed(() => {
  const now = new Date();
  return now.toLocaleDateString('es-ES', { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
});

const currentTime = computed(() => {
  const now = new Date();
  return now.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit'
  });
});

// --- Calendar Computed Properties ---
const currentMonth = computed(() => {
  const now = new Date();
  return now.toLocaleDateString('es-ES', { month: 'long' });
});

const currentYear = computed(() => {
  const now = new Date();
  return now.getFullYear();
});

const weekdays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const calendarDates = computed(() => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  
  // Primer día del mes
  const firstDay = new Date(year, month, 1);
  // Último día del mes
  const lastDay = new Date(year, month + 1, 0);
  
  // Ajustar para que lunes sea 0
  const firstDayWeekday = (firstDay.getDay() + 6) % 7;
  
  const dates = [];
  
  // Días del mes anterior
  const prevMonth = new Date(year, month - 1, 0);
  for (let i = firstDayWeekday - 1; i >= 0; i--) {
    const day = prevMonth.getDate() - i;
    dates.push({
      day,
      isOtherMonth: true,
      isToday: false,
      isWeekend: false,
      key: `prev-${day}`
    });
  }
  
  // Días del mes actual
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = (date.getDay() + 6) % 7; // Ajustar para lunes = 0
    dates.push({
      day,
      isOtherMonth: false,
      isToday: day === today,
      isWeekend: dayOfWeek >= 5, // Sábado y domingo
      key: `current-${day}`
    });
  }
  
  // Días del siguiente mes para completar la grilla
  const remainingDays = 42 - dates.length; // 6 semanas × 7 días
  for (let day = 1; day <= remainingDays; day++) {
    dates.push({
      day,
      isOtherMonth: true,
      isToday: false,
      isWeekend: false,
      key: `next-${day}`
    });
  }
  
  return dates;
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
  currentHelpContext.value = event.target.closest('.balance-card') ? 'balance' : 
                            event.target.closest('.insight-card') ? 'insight' :
                            event.target.closest('.seo-card') ? 'seo' : 'default';
};

const currentHelpContext = ref('default');

const getTooltipText = () => {
  switch (currentHelpContext.value) {
    case 'balance':
      return 'Muestra el saldo actual disponible en tu cuenta para inversiones en campañas.';
    case 'insight':
      return 'Destaca tu palabra clave con mejor rendimiento reciente en posicionamiento.';
    case 'seo':
      return 'Muestra la posición de tus palabras clave en Google y su cambio reciente.';
    default:
      return 'Vista rápida del mes actual con el día de hoy resaltado.';
  }
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
  padding: 1.5rem;
  width: 100%;
  box-sizing: border-box;
  background-color: var(--color-bg-dark);
  position: relative;
}

.page-content-wrapper::before {
  display: none;
}

.page-content-wrapper::after {
  display: none;
}

.loading-container {
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  justify-content: center;
  height: calc(100vh - 4rem); 
  color: var(--color-text-secondary); 
  gap: 1rem;
}

.spinner {
  width: 48px; 
  height: 48px; 
  border: 5px solid var(--color-border);
  border-bottom-color: var(--color-primary); 
  border-radius: 50%;
  animation: rotation 1s linear infinite;
}

@keyframes rotation { 
  0% { transform: rotate(0deg); } 
  100% { transform: rotate(360deg); } 
}

.page-header {
  margin-bottom: 3rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
  position: relative;
  padding: 2rem 0;
}

.page-header::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(146, 208, 0, 0.3) 20%, 
    rgba(146, 208, 0, 0.6) 50%, 
    rgba(146, 208, 0, 0.3) 80%, 
    transparent 100%);
}

.header-left {
  flex: 1;
  position: relative;
}

.header-right {
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.welcome-title {
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0 0 0.5rem 0;
  background: linear-gradient(135deg, 
    #ffffff 0%, 
    #f0f0f0 30%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: relative;
}

.welcome-title::after {
  content: '✨';
  position: absolute;
  right: -2rem;
  top: -0.5rem;
  font-size: 1.5rem;
  animation: sparkle 2s ease-in-out infinite;
}

@keyframes sparkle {
  0%, 100% { 
    opacity: 0.7; 
    transform: scale(1); 
  }
  50% { 
    opacity: 1; 
    transform: scale(1.1); 
  }
}

.welcome-subtitle {
  font-size: 1.2rem;
  color: var(--color-text-secondary);
  margin-top: 0.5rem;
  line-height: 1.5;
  opacity: 0.9;
}

.date-display {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  background-color: rgba(42, 42, 42, 0.8);
  border: 1px solid rgba(146, 208, 0, 0.2);
  border-radius: 1rem;
  padding: 1rem 1.5rem;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.date-display::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    #92d000 50%, 
    transparent 100%);
}

.date-display::after {
  display: none;
}

.date-icon {
  width: 24px;
  height: 24px;
  color: #92d000;
  flex-shrink: 0;
  filter: drop-shadow(0 1px 2px rgba(146, 208, 0, 0.2));
}

.date-info {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  position: relative;
  z-index: 1;
}

.date-main {
  font-size: 1.1rem;
  font-weight: 700;
  color: #ffffff;
  text-transform: capitalize;
}

.date-sub {
  font-size: 0.9rem;
  color: #92d000;
  font-weight: 600;
  letter-spacing: 0.5px;
}

/* --- GRILLA Y TARJETAS --- */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  position: relative;
}

.left-column, .right-column {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.content-card {
  background-color: #2a2a2a;
  border-radius: 1rem;
  padding: 1.5rem;
  border: 1px solid #3b3b3b;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.content-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #92d000 0%, rgba(146, 208, 0, 0.3) 100%);
}

.content-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(146, 208, 0, 0.1);
  border-color: rgba(146, 208, 0, 0.3);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.card-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
}

.card-label {
  font-size: 0.9rem;
  color: #aaa;
  margin: 0;
  font-weight: 500;
}

.help-container {
  cursor: help;
  color: #aaa;
  transition: color 0.2s ease;
  opacity: 0.7;
}

.help-container:hover { 
  color: var(--color-primary);
  opacity: 1;
}

/* --- TARJETAS PEQUEÑAS (SALDO Y ANÁLISIS) --- */
.balance-card, .insight-card {
  flex-direction: row;
  align-items: flex-start;
  gap: 1.5rem;
}

.card-icon-bg {
  width: 48px; 
  height: 48px;
  border-radius: 0.75rem;
  display: flex; 
  align-items: center; 
  justify-content: center;
  flex-shrink: 0;
  margin-top: 0.5rem;
}

.balance-card .card-icon-bg { 
  background: linear-gradient(135deg, rgba(146, 208, 0, 0.2) 0%, rgba(146, 208, 0, 0.1) 100%);
  color: #92d000; 
  border: 1px solid rgba(146, 208, 0, 0.2);
}

.insight-card .card-icon-bg { 
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%);
  color: #3b82f6; 
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.balance-info, .insight-info {
  flex: 1;
}

.balance-value {
  font-size: 2.2rem;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.2;
  margin: 0.5rem 0;
}

.card-description { 
  font-size: 0.8rem; 
  color: #828282; 
  margin: 0;
}

.insight-text {
  font-size: 1rem;
  color: #e0e0e0;
  line-height: 1.4;
  margin: 0;
}

.insight-text strong { 
  font-weight: 600;
  color: #ffffff;
}

/* --- MINI CALENDAR --- */
.calendar-card {
  max-width: none;
  min-height: auto;
}

.mini-calendar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(146, 208, 0, 0.2);
  margin-bottom: 0.5rem;
}

.current-month {
  font-size: 1.1rem;
  font-weight: 700;
  color: #ffffff;
  text-transform: capitalize;
}

.current-year {
  font-size: 0.95rem;
  color: #92d000;
  font-weight: 600;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.4rem;
  margin-bottom: 0.75rem;
}

.weekday {
  text-align: center;
  font-size: 0.75rem;
  color: #92d000;
  font-weight: 700;
  padding: 0.3rem;
  background-color: rgba(146, 208, 0, 0.1);
  border-radius: 0.3rem;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.4rem;
}

.calendar-date {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  border-radius: 0.3rem;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #e0e0e0;
  font-weight: 500;
  min-height: 28px;
  position: relative;
}

.calendar-date:hover:not(.current-day) {
  background-color: rgba(146, 208, 0, 0.15);
  transform: scale(1.05);
}

.calendar-date.current-day {
  background: linear-gradient(135deg, #92d000 0%, #7bb500 100%);
  color: #1e1e1e;
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(146, 208, 0, 0.4);
  transform: scale(1.05);
}

.calendar-date.current-day::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 0.4rem;
  background: linear-gradient(135deg, #92d000, #7bb500);
  z-index: -1;
  opacity: 0.3;
}

.calendar-date.other-month {
  color: #555;
  opacity: 0.5;
}

.calendar-date.weekend:not(.other-month) {
  color: #92d000;
  font-weight: 600;
}

.calendar-date.other-month.weekend {
  color: #444;
}

.calendar-date.weekend:not(.current-day):not(.other-month):hover {
  background-color: rgba(146, 208, 0, 0.2);
}

/* --- TARJETA GRANDE DE SEO --- */
.seo-card {
  flex: 1;
}

.seo-table-container { 
  width: 100%; 
  overflow-x: auto; 
}

.seo-table { 
  width: 100%; 
  border-collapse: collapse; 
}

.seo-table th, .seo-table td {
  padding: 1rem; 
  text-align: left;
  border-bottom: 1px solid #444;
  white-space: nowrap;
}

.seo-table th {
  color: #92d000; 
  font-weight: 600;
  font-size: 0.75rem; 
  text-transform: uppercase; 
  letter-spacing: 0.05em;
  background: linear-gradient(90deg, #3b3b3b 0%, rgba(146, 208, 0, 0.05) 100%);
  border-bottom: 2px solid rgba(146, 208, 0, 0.2);
}

.seo-table tbody tr:hover {
  background-color: #3b3b3b;
}

.seo-table tbody tr:last-child td {
  border-bottom: none;
}

.keyword-cell { 
  font-weight: 500; 
  color: #e0e0e0; 
}

.position-badge {
  display: inline-block; 
  padding: 0.3rem 0.8rem;
  border-radius: 99px; 
  font-weight: 600; 
  font-size: 0.85rem;
}

.position-badge.excellent { 
  background-color: rgba(22, 163, 74, 0.15); 
  color: #16a34a; 
}

.position-badge.good { 
  background-color: rgba(59, 130, 246, 0.15); 
  color: #3b82f6; 
}

.position-badge.average { 
  background-color: rgba(249, 115, 22, 0.15); 
  color: #f97316; 
}

.position-badge.poor { 
  background-color: rgba(220, 38, 38, 0.15); 
  color: #dc2626; 
}

.change-indicator { 
  display: inline-flex; 
  align-items: center; 
  gap: 0.25rem; 
  font-weight: 600; 
}

.change-indicator.positive { 
  color: #16a34a; 
}

.change-indicator.negative { 
  color: #dc2626; 
}

.change-indicator.neutral { 
  color: #aaa; 
}

.no-data-message {
  text-align: center; 
  color: #aaa;
  font-style: italic; 
  padding: 3rem;
  background-color: #3b3b3b;
  border-radius: 0.5rem;
  min-height: 150px;
  display: flex;
  align-items: center; 
  justify-content: center;
}

/* --- RESPONSIVE DESIGN --- */
@media (max-width: 992px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
  
  .left-column {
    order: 1;
  }
  
  .right-column {
    order: 2;
  }
}

@media (max-width: 767px) {
  .page-content-wrapper { 
    padding: 1rem; 
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 2rem;
    padding: 1.5rem 0;
  }

  .header-right {
    align-self: stretch;
  }

  .date-display {
    padding: 1rem 1.2rem;
    justify-content: center;
  }
  
  .welcome-title { 
    font-size: 2rem; 
  }

  .welcome-title::after {
    right: -1.5rem;
    top: -0.3rem;
    font-size: 1.2rem;
  }
  
  .welcome-subtitle { 
    font-size: 1.1rem; 
  }
  
  .content-grid { 
    grid-template-columns: 1fr; 
  }

  .left-column, .right-column {
    gap: 1rem;
  }
  
  .balance-card, .insight-card { 
    flex-direction: column; 
    align-items: flex-start; 
    gap: 1rem;
  }

  .card-icon-bg {
    margin-top: 0;
  }

  .balance-value {
    font-size: 1.8rem;
  }
}

@media (max-width: 480px) {
  .content-card {
    padding: 1rem;
  }
  
  .balance-value {
    font-size: 1.6rem;
  }
  
  .card-title {
    font-size: 1.1rem;
  }

  .welcome-title {
    font-size: 1.8rem;
  }

  .welcome-title::after {
    right: -1rem;
    font-size: 1rem;
  }

  .date-display {
    padding: 0.8rem 1rem;
  }

  .date-main {
    font-size: 1rem;
  }

  .date-sub {
    font-size: 0.85rem;
  }

  .date-icon {
    width: 22px;
    height: 22px;
  }

  .calendar-grid {
    gap: 0.3rem;
  }

  .calendar-date {
    font-size: 0.75rem;
    min-height: 24px;
  }

  .weekday {
    font-size: 0.7rem;
    padding: 0.25rem;
  }

  .mini-calendar {
    gap: 0.75rem;
  }
}
</style>