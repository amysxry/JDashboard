<template>
  <div class="page-wrapper">
    <header class="page-header">
      <div class="header-content">
        <h1 class="page-title">WooCommerce</h1>
        <p class="page-subtitle">{{ dateDisplayString }}</p>
      </div>
      <div class="header-actions">
        <select v-model="timeRange" @change="fetchData" class="time-select" :disabled="isLoading">
          <option value="month">Último mes</option>
          <option value="14d">Últimos 14 días</option>
          <option value="7d">Últimos 7 días</option>
        </select>
        <button @click="fetchData" class="refresh-btn" :disabled="isLoading" title="Actualizar datos">
          <RefreshCw class="icon" :class="{ 'rotating': isLoading }" />
        </button>
      </div>
    </header>

    <main class="main-content">
      <section v-if="isLoading" class="kpi-grid">
        <div v-for="i in 3" :key="i" class="kpi-card-skeleton">
          <div class="skeleton-line title"></div>
          <div class="skeleton-line value"></div>
        </div>
      </section>

      <section v-else-if="fetchError" class="error-container">
        <div class="error-box">
          <AlertTriangle class="error-icon" />
          <h3 class="error-title">Ocurrió un error</h3>
          <p class="error-message">{{ fetchError }}</p>
          <button @click="fetchData" class="retry-btn">Reintentar</button>
        </div>
      </section>

      <section v-else class="kpi-grid">
        <div class="kpi-card">
          <p class="kpi-title">Ingresos Totales</p>
          <h3 class="kpi-value">{{ formatCurrency(kpiSummary.totalSales) }}</h3>
        </div>
        <div class="kpi-card">
          <p class="kpi-title">Pedidos Realizados</p>
          <h3 class="kpi-value">{{ kpiSummary.totalOrders }}</h3>
        </div>
        <div class="kpi-card">
          <p class="kpi-title">Ticket Promedio</p>
          <h3 class="kpi-value">{{ formatCurrency(kpiSummary.averageTicket) }}</h3>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/lib/supabaseClient';
import { RefreshCw, AlertTriangle } from 'lucide-vue-next';

const isLoading = ref(true);
const timeRange = ref('month');
const salesReport = ref<any[]>([]);
const fetchError = ref<string | null>(null);

// Lógica para mostrar el rango de fechas dinámico
const dateDisplayString = computed(() => {
  const endDate = new Date(); // Usamos la fecha actual como fecha final
  let startDate = new Date();

  switch(timeRange.value) {
    case '14d':
      startDate.setDate(endDate.getDate() - 14);
      break;
    case '7d':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case 'month':
    default:
      startDate.setMonth(endDate.getMonth() - 1);
      break;
  }
  
  // Función para formatear las fechas en español
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(date);
  };

  return `${formatDate(startDate)} - ${formatDate(endDate)}, ${endDate.getFullYear()}`;
});

const kpiSummary = computed(() => {
  if (salesReport.value.length === 0) {
    return { totalSales: 0, totalOrders: 0, averageTicket: 0 };
  }
  const totalSales = salesReport.value.reduce((sum, row) => sum + parseFloat(row.total_sales || 0), 0);
  const totalOrders = salesReport.value.reduce((sum, row) => sum + (row.total_orders || 0), 0);
  const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
  return { totalSales, totalOrders, averageTicket };
});

const fetchData = async () => {
  isLoading.value = true;
  fetchError.value = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");
    const { data: clientData } = await supabase.from('clientes').select('id').eq('auth_id', user.id).single();
    if (!clientData) throw new Error("Cliente no encontrado");
    const { data: salesData, error: salesError } = await supabase.from('wc_sales_cache').select('*').eq('cliente_id', clientData.id);
    if (salesError) throw salesError;
    salesReport.value = salesData || [];
  } catch (err: any) {
    fetchError.value = `No se pudieron cargar los datos. Por favor, intenta de nuevo.`;
  } finally {
    isLoading.value = false;
  }
};

const formatCurrency = (value: number) => {
  if (isNaN(value)) return '$0.00';
  return `$${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
:root {
  --color-bg: #1F2228;
  --color-bg-card: #2A2F37;
  --color-border: #3A404A;
  --color-text-primary: #F5F5F5;
  --color-text-secondary: #A0A5B1;
  --color-accent-green: #00DC82; /* Color principal para los valores */
  --color-error: #FF453A;
}

.page-wrapper {
  background-color: var(--color-bg);
  padding: 1.5rem 2rem;
  font-family: 'Inter', sans-serif;
  width: 100%;
  box-sizing: border-box;
}

/* Encabezado */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-bottom: 2.5rem;
}
.page-title {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}
.page-subtitle {
  color: var(--color-text-secondary);
  margin-top: 0.25rem;
  font-size: 0.9rem;
}
.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}
.time-select {
  padding: 0.6rem 1rem;
  border-radius: 8px;
  background-color: var(--color-bg-card);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  cursor: pointer;
  font-size: 0.9rem;
  transition: border-color 0.2s;
}
.time-select:hover {
  border-color: #555;
}
.refresh-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background-color: var(--color-bg-card);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.2s;
}
.refresh-btn:hover:not(:disabled) {
  color: var(--color-text-primary);
  border-color: #555;
}
.refresh-btn .icon.rotating {
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Estilos de Tarjetas KPI */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.kpi-card {
  background-color: var(--color-bg-card);
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1rem; /* Espacio entre título y valor */
}
.kpi-title {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  margin: 0;
}
.kpi-value {
  font-size: 2.5rem; /* Un poco más grande para mayor impacto */
  font-weight: 600;
  color: var(--color-accent-green); /* CAMBIO DE COLOR */
  letter-spacing: -1.5px;
  margin: 0;
  line-height: 1; /* Asegura que no haya espacio extra */
}

/* Skeleton Loader */
.kpi-card-skeleton {
  background-color: var(--color-bg-card);
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.skeleton-line {
  background: linear-gradient(90deg, var(--color-border) 25%, #3A404A 50%, var(--color-border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 6px;
}
.skeleton-line.title {
  width: 50%;
  height: 16px;
}
.skeleton-line.value {
  width: 80%;
  height: 40px; /* Ligeramente más alto para coincidir con el nuevo tamaño de fuente */
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Contenedor de Error */
.error-container { display: flex; justify-content: center; padding: 4rem 2rem; }
.error-box { background-color: var(--color-bg-card); border: 1px solid var(--color-error); border-radius: 12px; padding: 2.5rem; text-align: center; max-width: 450px; }
.error-icon { width: 40px; height: 40px; color: var(--color-error); margin-bottom: 1rem; }
.error-title { font-size: 1.25rem; font-weight: 600; margin: 0 0 0.5rem 0; color: var(--color-text-primary); }
.error-message { color: var(--color-text-secondary); margin-bottom: 1.5rem; }
.retry-btn { background-color: var(--color-accent-green); color: #000; padding: 0.75rem 1.5rem; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.retry-btn:hover { filter: brightness(1.1); }

/* Responsividad */
@media (max-width: 768px) {
  .page-wrapper {
    padding: 1rem;
  }
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>