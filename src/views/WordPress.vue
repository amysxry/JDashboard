<template>
  <div class="layout">
    <SidebarMenu />

    <div class="main-content" :style="{ marginLeft: dynamicMarginLeft }">
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

      <div v-if="isLoading" class="loading-message">Cargando datos...</div>
      <div v-if="fetchError" class="error-message">{{ fetchError }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { supabase } from '@/lib/supabaseClient';
import SidebarMenu from '@/components/SidebarMenu.vue';
import { RefreshCw, HelpCircle } from 'lucide-vue-next';

// --- LÓGICA DEL SIDEBAR (COPIADA DE OTROS COMPONENTES) ---
const sidebarWidth = ref(380);
const isMobileLayout = ref(false);

const dynamicMarginLeft = computed(() => {
  return isMobileLayout.value ? '0' : `${sidebarWidth.value}px`;
});

const handleSidebarWidthChange = (event: Event) => {
  const customEvent = event as CustomEvent;
  if (customEvent.detail && typeof customEvent.detail.width === 'number') {
    sidebarWidth.value = customEvent.detail.width;
  }
};

const checkLayoutSize = () => {
    isMobileLayout.value = window.innerWidth < 1024;
};
// --- FIN DE LA LÓGICA DEL SIDEBAR ---

// Estado del componente
const isLoading = ref(true);
const timeRange = ref('month');
const salesReport = ref<any[]>([]); // Se puede definir un tipo más estricto si se quiere
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

    // Ahora leemos de la tabla de caché que nuestra Edge Function está llenando
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
  checkLayoutSize();
  window.addEventListener('resize', checkLayoutSize);
  window.addEventListener('sidebar-width-changed', handleSidebarWidthChange);
  
  fetchData();
});

onUnmounted(() => {
  window.removeEventListener('resize', checkLayoutSize);
  window.removeEventListener('sidebar-width-changed', handleSidebarWidthChange);
});
</script>

<style scoped>
/* Estos estilos son consistentes con tus otras vistas */
.layout { display: flex; }
.main-content { flex: 1; padding: 2rem; background-color: #1e1e1e; color: #ffffff; transition: margin-left 0.3s ease; min-height: 100vh; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; background-color: #2a2a2a; border-radius: 1rem; padding: 1.5rem; }
.header-left { display: flex; align-items: center; gap: 0.5rem; }
.page-title { font-size: 2rem; font-weight: 700; color: #fff; margin: 0; }
.header-actions { display: flex; gap: 1.5rem; align-items: center; }
.time-select { padding: 0.5rem 1rem; border-radius: 0.5rem; background-color: #3b3b3b; color: #ffffff; border: 1px solid #92d000; cursor: pointer; }
.refresh-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1rem; border-radius: 0.5rem; background-color: #92d000; color: #1e1e1e; font-weight: 600; border: none; cursor: pointer; transition: background-color 0.2s; }
.refresh-btn:hover { background-color: #7eb300; }
.info-tooltip { position: relative; display: inline-flex; align-items: center; }
.kpis-section { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
.kpi-card { background-color: #2a2a2a; padding: 1.5rem; border-radius: 1rem; border: 1px solid #3b3b3b; }
.kpi-title { color: #aaa; font-size: 0.9rem; margin-bottom: 0.5rem; }
.kpi-value { font-size: 2.2rem; font-weight: 700; }
.loading-message, .error-message { text-align: center; padding: 3rem; color: #aaa; }
.error-message { color: #ff6b6b; }
</style>