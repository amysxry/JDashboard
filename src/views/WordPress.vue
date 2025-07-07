<template>
  <div class="page-content">
    <header class="page-header">
      <div class="header-left">
        <h1 class="page-title">WooCommerce</h1>
        <div class="info-tooltip">
          <HelpCircle class="h-5 w-5" />
          <span class="tooltip-text">Resumen de ventas y rendimiento de tu tienda online</span>
        </div>
      </div>
      <div class="header-actions">
        <select v-model="timeRange" @change="fetchData" class="time-select">
          <option value="month">Último mes</option>
          <option value="7d">Últimos 7 días</option>
        </select>
        <button @click="fetchData" class="refresh-btn">
          <RefreshCw class="h-4 w-4" />
          <span>Actualizar</span>
        </button>
      </div>
    </header>

    <main v-if="!isLoading && !fetchError" class="dashboard-main">
      <section class="kpis-section">
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

    <div v-if="isLoading" class="loading-message">Cargando datos de WooCommerce...</div>
    <div v-if="fetchError" class="error-message">{{ fetchError }}</div>
  </div>
</template>

<script setup lang="ts">
// CAMBIO: Se han eliminado las importaciones y lógica del sidebar.
// ¡El script ahora es mucho más limpio!
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/lib/supabaseClient';
import { RefreshCw, HelpCircle } from 'lucide-vue-next';

// Estado del componente
const isLoading = ref(true);
const timeRange = ref('month');
const salesReport = ref<any[]>([]);
const fetchError = ref<string | null>(null);

// Propiedades computadas para los KPIs
const kpiSummary = computed(() => {
  if (salesReport.value.length === 0) {
    return { totalSales: 0, totalOrders: 0, averageTicket: 0 };
  }
  
  const totalSales = salesReport.value.reduce((sum, row) => sum + parseFloat(row.total_sales || 0), 0);
  const totalOrders = salesReport.value.reduce((sum, row) => sum + (row.total_orders || 0), 0);
  const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

  return { totalSales, totalOrders, averageTicket };
});

// Función para obtener los datos desde Supabase
const fetchData = async () => {
  isLoading.value = true;
  fetchError.value = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const { data: clientData } = await supabase.from('clientes').select('id').eq('auth_id', user.id).single();
    if (!clientData) throw new Error("Cliente no encontrado");

    const { data: salesData, error: salesError } = await supabase
      .from('wc_sales_cache')
      .select('*')
      .eq('cliente_id', clientData.id);

    if (salesError) throw salesError;
    salesReport.value = salesData || [];

  } catch (err: any) {
    fetchError.value = `Error al cargar datos: ${err.message}`;
  } finally {
    isLoading.value = false;
  }
};

// Función de utilidad para formatear moneda
const formatCurrency = (value: number) => {
  if (isNaN(value)) return '$0.00';
  return `$${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
};

// Hooks del ciclo de vida
onMounted(() => {
  fetchData();
});
</script>

<style scoped>
/* CAMBIO: La clase raíz ahora es .page-content para consistencia */
.page-content {
  padding: 2rem;
  /* Eliminamos los estilos de .main-content que ahora están en el layout */
}
/* El resto de los estilos son muy similares, pero aplicados a este contexto */
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; background-color: #2a2a2a; border-radius: 1rem; padding: 1.5rem; }
.header-left { display: flex; align-items: center; gap: 0.5rem; }
.page-title { font-size: 1.5rem; font-weight: 600; color: #fff; margin: 0; }
.header-actions { display: flex; gap: 1.5rem; align-items: center; }
.time-select { padding: 0.5rem 1rem; border-radius: 0.5rem; background-color: #3b3b3b; color: #ffffff; border: 1px solid #92d000; cursor: pointer; }
.refresh-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1rem; border-radius: 0.5rem; background-color: #92d000; color: #1e1e1e; font-weight: 600; border: none; cursor: pointer; transition: background-color 0.2s; }
.refresh-btn:hover { background-color: #7eb300; }
.info-tooltip { position: relative; display: inline-flex; align-items: center; cursor: help; }
.info-tooltip .tooltip-text { visibility: hidden; width: 220px; background-color: #333; color: #fff; text-align: center; border-radius: 6px; padding: 0.75rem; position: absolute; z-index: 10; bottom: 130%; left: 50%; transform: translateX(-50%); opacity: 0; transition: opacity 0.3s; font-size: 0.8rem; font-weight: normal; pointer-events: none; }
.info-tooltip:hover .tooltip-text { visibility: visible; opacity: 1; }
.kpis-section { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
.kpi-card { background-color: #2a2a2a; padding: 1.5rem; border-radius: 1rem; border: 1px solid #3b3b3b; }
.kpi-title { color: #aaa; font-size: 0.9rem; margin-bottom: 0.5rem; }
.kpi-value { font-size: 2.2rem; font-weight: 700; }
.loading-message, .error-message { text-align: center; padding: 3rem; color: #aaa; }
.error-message { color: #ff6b6b; }
</style>