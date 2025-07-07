<template>
  <div class="wordpress-page-container">
    <header class="page-header">
      <div class="header-left">
        <h1 class="page-title">Resumen de WooCommerce</h1>
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

    <div class="content-body">
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/lib/supabaseClient';
import { RefreshCw, HelpCircle } from 'lucide-vue-next';

// El SCRIPT se mantiene exactamente igual, no necesita cambios.
const isLoading = ref(true);
const timeRange = ref('month');
const salesReport = ref<any[]>([]);
const fetchError = ref<string | null>(null);

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

const formatCurrency = (value: number) => {
  if (isNaN(value)) return '$0.00';
  return `$${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
/* El contenedor principal ya no tiene padding */
.wordpress-page-container {
  width: 100%;
}

/* Se ajustan los estilos del header para que sea una barra a todo lo ancho */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #2a2a2a;
  /* El padding ahora es solo horizontal, para que el fondo llegue a los bordes */
  padding: 1.25rem 2rem;
  border-bottom: 1px solid #3b3b3b; /* Un borde inferior para separarlo del contenido */
}
.header-left { display: flex; align-items: center; gap: 1rem; }
.page-title { font-size: 1.25rem; font-weight: 600; color: #fff; margin: 0; }
.header-actions { display: flex; gap: 1.5rem; align-items: center; }
.time-select { padding: 0.5rem 1rem; border-radius: 0.5rem; background-color: #3b3b3b; color: #ffffff; border: 1px solid #92d000; cursor: pointer; }
.refresh-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1rem; border-radius: 0.5rem; background-color: #92d000; color: #1e1e1e; font-weight: 600; border: none; cursor: pointer; transition: background-color 0.2s; }
.refresh-btn:hover { background-color: #7eb300; }
.info-tooltip { position: relative; display: inline-flex; align-items: center; cursor: help; }
.info-tooltip .tooltip-text { visibility: hidden; width: 220px; background-color: #333; color: #fff; text-align: center; border-radius: 6px; padding: 0.75rem; position: absolute; z-index: 10; bottom: 130%; left: 50%; transform: translateX(-50%); opacity: 0; transition: opacity 0.3s; font-size: 0.8rem; font-weight: normal; pointer-events: none; }
.info-tooltip:hover .tooltip-text { visibility: visible; opacity: 1; }

/* Nuevo estilo para el cuerpo del contenido, que ahora lleva el padding */
.content-body {
  padding: 2rem;
}

.kpis-section { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; }
.kpi-card { background-color: #2a2a2a; padding: 1.5rem; border-radius: 1rem; border: 1px solid #3b3b3b; }
.kpi-title { color: #aaa; font-size: 0.9rem; margin-bottom: 0.5rem; }
.kpi-value { font-size: 2.2rem; font-weight: 700; }
.loading-message, .error-message { text-align: center; padding: 3rem; color: #aaa; }
.error-message { color: #ff6b6b; }
</style>