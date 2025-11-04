<template>
  <div class="seo-page-content">
    <header class="page-controls-header">
      <div class="header-info">
        <div class="page-title-main">
          <h1 class="page-title">🎯 Ranking SEO</h1>
          <p class="page-subtitle">Seguimiento detallado de posiciones en Google</p>
        </div>
        <div class="last-updated-info">
          <Clock class="update-icon" />
          <span>Datos actualizados regularmente</span>
        </div>
      </div>
    </header>

    <main class="seo-main">
      <div v-if="isLoading" class="loading-container">
        <div class="spinner"></div>
        <p>Cargando datos de SEO...</p>
      </div>

      <div v-else-if="fetchError" class="error-container">
        <div class="error-box">
          <AlertTriangle class="error-icon" />
          <h3 class="error-title">Error al cargar datos</h3>
          <p class="error-message">{{ fetchError }}</p>
          <button @click="fetchSeoData" class="retry-btn">Reintentar</button>
        </div>
      </div>

      <div v-else class="seo-content">
        <!-- SEO Stats Summary -->
        <div v-if="seoKeywords.length > 0" class="seo-stats-section">
          <div class="stat-card">
            <div class="stat-header">
              <Target class="stat-icon" />
              <h3>Total Keywords</h3>
            </div>
            <div class="stat-value">{{ seoKeywords.length }}</div>
            <div class="stat-description">Palabras clave monitoreadas</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-header">
              <TrendingUp class="stat-icon" />
              <h3>Mejor Posición</h3>
            </div>
            <div class="stat-value">#{{ Math.min(...seoKeywords.map(k => k.position)) }}</div>
            <div class="stat-description">Posición más alta alcanzada</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-header">
              <Award class="stat-icon" />
              <h3>Top 10</h3>
            </div>
            <div class="stat-value">{{ keywordsInTop10 }}</div>
            <div class="stat-description">Keywords en primera página</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-header">
              <ArrowUp class="stat-icon" />
              <h3>Mejorando</h3>
            </div>
            <div class="stat-value">{{ improvingKeywords }}</div>
            <div class="stat-description">Keywords con tendencia positiva</div>
          </div>
        </div>

        <!-- Main SEO Table -->
        <div class="seo-table-card">
          <div class="card-header">
            <div class="table-title-section">
              <h2 class="table-title">Posiciones Actuales</h2>
              <p class="table-subtitle">Monitoreo completo de palabras clave en Google</p>
            </div>
            <div v-if="seoKeywords.length > 0" class="table-actions">
              <button @click="refreshData" class="refresh-btn" :disabled="isLoading">
                <RefreshCw class="h-4 w-4" :class="{ 'rotating': isLoading }" />
                <span>Actualizar</span>
              </button>
            </div>
          </div>

          <div v-if="seoKeywords.length === 0" class="no-data-message">
            <div class="no-data-content">
              <Target class="no-data-icon" />
              <h4>No hay datos de SEO disponibles</h4>
              <p>Una vez que se agreguen palabras clave a tu seguimiento, aparecerán aquí con sus posiciones actuales.</p>
              <small>Los datos se actualizan regularmente por nuestro equipo.</small>
            </div>
          </div>

          <div v-else class="seo-table-container">
            <table class="seo-table">
              <thead>
                <tr>
                  <th>Palabra Clave</th>
                  <th>Posición Actual</th>
                  <th>Posición Anterior</th>
                  <th>Cambio</th>
                  <th>Tendencia</th>
                  <th>Estado</th>
                  <th>Última Actualización</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="keyword in seoKeywords" :key="keyword.term" class="keyword-row">
                  <td class="keyword-cell">
                    <div class="keyword-info">
                      <span class="keyword-text">{{ keyword.term }}</span>
                      <small class="keyword-url" v-if="keyword.url">{{ keyword.url }}</small>
                    </div>
                  </td>
                  <td>
                    <span class="position-badge" :class="getPositionBadgeClass(keyword.position)">
                      #{{ keyword.position }}
                    </span>
                  </td>
                  <td>
                    <span v-if="keyword.previousPosition" class="previous-position">
                      #{{ keyword.previousPosition }}
                    </span>
                    <span v-else class="no-data-text">-</span>
                  </td>
                  <td>
                    <div class="change-cell">
                      <span v-if="keyword.change > 0" class="change-value positive">
                        +{{ keyword.change }}
                      </span>
                      <span v-else-if="keyword.change < 0" class="change-value negative">
                        {{ keyword.change }}
                      </span>
                      <span v-else class="change-value neutral">0</span>
                    </div>
                  </td>
                  <td>
                    <div class="trend-cell">
                      <span v-if="keyword.change > 0" class="change-indicator positive">
                        <ArrowUpIcon class="h-4 w-4" />
                        Subiendo
                      </span>
                      <span v-else-if="keyword.change < 0" class="change-indicator negative">
                        <ArrowDownIcon class="h-4 w-4" />
                        Bajando
                      </span>
                      <span v-else class="change-indicator neutral">
                        <div class="no-change-dot"></div>
                        Estable
                      </span>
                    </div>
                  </td>
                  <td>
                    <span class="status-badge" :class="getStatusClass(keyword.position)">
                      {{ getStatusText(keyword.position) }}
                    </span>
                  </td>
                  <td>
                    <span class="last-update">{{ keyword.lastUpdate }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  TrendingUp, 
  Target, 
  Award,
  ArrowUp,
  Clock, 
  AlertTriangle, 
  RefreshCw 
} from 'lucide-vue-next';

// --- Estado de datos ---
const isLoading = ref(true);
const fetchError = ref(null);
const seoKeywords = ref([]);

// --- Propiedades Computadas ---
const keywordsInTop10 = computed(() => {
  return seoKeywords.value.filter(k => k.position <= 10).length;
});

const improvingKeywords = computed(() => {
  return seoKeywords.value.filter(k => k.change > 0).length;
});

// --- Funciones de Utilidad ---
const getPositionBadgeClass = (position) => {
  if (position <= 3) return 'excellent';
  if (position <= 10) return 'good';
  if (position <= 20) return 'average';
  return 'poor';
};

const getStatusClass = (position) => {
  if (position <= 3) return 'top';
  if (position <= 10) return 'first-page';
  if (position <= 20) return 'second-page';
  return 'needs-work';
};

const getStatusText = (position) => {
  if (position <= 3) return 'Top 3';
  if (position <= 10) return '1ª Página';
  if (position <= 20) return '2ª Página';
  return 'Mejorable';
};

// --- Funciones de Datos ---
const fetchSeoData = async () => {
  isLoading.value = true;
  fetchError.value = null;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    console.log('Usuario autenticado:', user.id);
    console.log('Email del usuario:', user.email);

    // Buscar cliente solo con columnas que existen
    const { data: clientData, error } = await supabase
      .from('clientes')
      .select('id, empresa, auth_id')
      .eq('auth_id', user.id)
      .single();
    
    if (error) {
      console.error('❌ Error buscando cliente por auth_id:', error);
      
      // Si no encuentra por auth_id, mostrar todos los clientes para diagnóstico
      console.log('🔍 Obteniendo todos los clientes para diagnóstico...');
      const { data: allClients, error: allError } = await supabase
        .from('clientes')
        .select('id, empresa, auth_id');
        
      if (!allError && allClients) {
        console.log('📋 Todos los clientes disponibles:', allClients);
        
        // Buscar por email si auth_id no funciona
        const userEmail = user.email;
        console.log('🔍 Buscando cliente por email:', userEmail);
        
        const matchingClient = allClients.find(client => client.auth_id === user.id);
        
        if (matchingClient) {
          console.log('✅ Cliente encontrado por auth_id en lista completa:', matchingClient);
          await loadSeoDataForClient(matchingClient.id);
          return;
        }
      }
      
      throw new Error('Cliente no encontrado');
    }

    console.log('✅ Datos del cliente encontrados por auth_id:', clientData);
    await loadSeoDataForClient(clientData.id);
    
  } catch (error) {
    console.error('❌ Error al cargar datos de SEO:', error);
    fetchError.value = error.message;
  } finally {
    isLoading.value = false;
  }
};

const loadSeoDataForClient = async (clienteId) => {
  try {
    // Omitir ranking SEO para el cliente específico
    if (clienteId === '43cc43d3-3136-46a6-9853-a5c392d7b7ab') {
      console.log('SEO ranking omitido para este cliente');
      seoKeywords.value = [];
      return;
    }
    
    console.log('🔍 Cargando datos SEO para cliente:', clienteId);
    
    // MÉTODO 1: Intentar consulta directa
    const { data, error } = await supabase
      .from('seo_rankings')
      .select('keyword, position, previous_position')
      .eq('cliente_id', clienteId)
      .order('position', { ascending: true });

    if (error) {
      console.error('❌ Error en consulta directa:', error);
      
      // MÉTODO 2: Intentar sin filtro para ver si hay datos
      console.log('🔍 Intentando consulta sin filtro para diagnóstico...');
      const { data: allData, error: allError } = await supabase
        .from('seo_rankings')
        .select('*')
        .limit(50);
        
      if (allError) {
        console.error('❌ Error general en seo_rankings:', allError);
        throw new Error('Error de acceso a datos SEO. Contacta al administrador.');
      }
      
      console.log('📊 Datos encontrados sin filtro:', allData);
      
      // Filtrar manualmente por cliente_id
      const filteredData = allData.filter(row => row.cliente_id === clienteId);
      console.log(`🎯 Datos filtrados para cliente ${clienteId}:`, filteredData);
      
      if (filteredData.length === 0) {
        console.warn('⚠️ No hay datos SEO para este cliente');
        seoKeywords.value = [];
        return;
      }
      
      // Usar datos filtrados manualmente
      processSeolData(filteredData);
      return;
    }
    
    console.log('📊 Datos SEO recibidos (método directo):', data);
    
    if (!data || data.length === 0) {
      console.warn('⚠️ No hay datos SEO para este cliente');
      seoKeywords.value = [];
      return;
    }    processSeolData(data || []);  } catch (err) {
    console.error('❌ Error al cargar datos SEO del cliente:', err);
    throw err;
  }
};

const processSeolData = (data) => {
  seoKeywords.value = data.map(row => {
    const previousPos = row.previous_position;
    const currentPos = row.position;
    const change = previousPos !== null && previousPos !== undefined 
      ? (previousPos - currentPos) 
      : 0;
    
    return {
      term: row.keyword,
      position: currentPos,
      previousPosition: previousPos,
      change: change,
      url: null, // URL field doesn't exist in database
      lastUpdate: 'Reciente' // Simplified since updated_at might not be available
    };
  });
  
  console.log('✅ Datos SEO procesados:', seoKeywords.value);
};

const refreshData = async () => {
  await fetchSeoData();
};

// --- Hooks de Ciclo de Vida ---
onMounted(fetchSeoData);
</script>

<style scoped>
.seo-page-content {
  padding: 1.5rem;
  width: 100%;
  box-sizing: border-box;
  overflow-x: auto;
  min-width: 0;
}

.page-controls-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(146, 208, 0, 0.2);
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.page-title-main {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
  background: linear-gradient(135deg, #ffffff 0%, #f0f0f0 30%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  font-size: 1.1rem;
  color: var(--color-text-secondary);
  margin: 0;
  opacity: 0.9;
}

.last-updated-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #aaa;
}

.update-icon {
  width: 14px;
  height: 14px;
}

.seo-main {
  width: 100%;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
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

.error-container {
  display: flex;
  justify-content: center;
  padding: 4rem 2rem;
}

.error-box {
  background-color: #2a2a2a;
  border: 1px solid #FF453A;
  border-radius: 1rem;
  padding: 2.5rem;
  text-align: center;
  max-width: 450px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.error-icon {
  width: 40px;
  height: 40px;
  color: #FF453A;
  margin-bottom: 1rem;
}

.error-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: #ffffff;
}

.error-message {
  color: #aaa;
  margin-bottom: 1.5rem;
}

.retry-btn {
  background-color: #92d000;
  color: #1e1e1e;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-btn:hover {
  background-color: #7bb500;
}

.seo-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* SEO Stats Section */
.seo-stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.stat-card {
  background-color: #2a2a2a;
  border-radius: 1rem;
  padding: 1.5rem;
  border: 1px solid #3b3b3b;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #92d000 0%, rgba(146, 208, 0, 0.3) 100%);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(146, 208, 0, 0.1);
}

.stat-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.stat-icon {
  width: 24px;
  height: 24px;
  color: #92d000;
}

.stat-header h3 {
  font-size: 0.9rem;
  color: #aaa;
  margin: 0;
  font-weight: 500;
}

.stat-value {
  font-size: 2.2rem;
  font-weight: 700;
  color: #ffffff;
  line-height: 1;
  margin-bottom: 0.5rem;
}

.stat-description {
  font-size: 0.85rem;
  color: #888;
}

/* Table Card */
.seo-table-card {
  background-color: #2a2a2a;
  border-radius: 1rem;
  border: 1px solid #3b3b3b;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  position: relative;
}

.seo-table-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #92d000 0%, rgba(146, 208, 0, 0.3) 100%);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.5rem;
  border-bottom: 1px solid #3b3b3b;
}

.table-title-section {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.table-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
}

.table-subtitle {
  font-size: 0.9rem;
  color: #aaa;
  margin: 0;
}

.table-actions {
  display: flex;
  gap: 0.75rem;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  background-color: #92d000;
  color: #1e1e1e;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-weight: 600;
}

.refresh-btn:hover:not(:disabled) {
  background-color: #7bb500;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.rotating {
  animation: rotation 1s linear infinite;
}

/* Table Styles */
.seo-table-container {
  width: 100%;
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(146, 208, 0, 0.3) rgba(0, 0, 0, 0.1);
}

.seo-table-container::-webkit-scrollbar {
  height: 8px;
}

.seo-table-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.seo-table-container::-webkit-scrollbar-thumb {
  background: rgba(146, 208, 0, 0.3);
  border-radius: 4px;
}

.seo-table-container::-webkit-scrollbar-thumb:hover {
  background: rgba(146, 208, 0, 0.5);
}

.seo-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 900px;
}

.seo-table th,
.seo-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.seo-table th {
  color: #92d000;
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: linear-gradient(135deg, #3b3b3b, #333333);
  border-bottom: 2px solid rgba(146, 208, 0, 0.3);
  position: sticky;
  top: 0;
  z-index: 1;
}

.keyword-row {
  transition: all 0.2s ease;
}

.keyword-row:hover {
  background: rgba(146, 208, 0, 0.08);
}

.keyword-row:last-child td {
  border-bottom: none;
}

.keyword-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.keyword-text {
  font-weight: 500;
  color: #e0e0e0;
  font-size: 0.95rem;
}

.keyword-url {
  color: #aaa;
  font-size: 0.75rem;
}

.position-badge {
  display: inline-block;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-weight: 700;
  font-size: 0.85rem;
  min-width: 50px;
  text-align: center;
}

.position-badge.excellent {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1));
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.position-badge.good {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.1));
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.position-badge.average {
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(249, 115, 22, 0.1));
  color: #f97316;
  border: 1px solid rgba(249, 115, 22, 0.3);
}

.position-badge.poor {
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.2), rgba(220, 38, 38, 0.1));
  color: #dc2626;
  border: 1px solid rgba(220, 38, 38, 0.3);
}

.previous-position {
  color: #aaa;
  font-size: 0.9rem;
}

.no-data-text {
  color: #666;
  font-style: italic;
}

.change-cell {
  display: flex;
  align-items: center;
}

.change-value {
  font-weight: 600;
  font-size: 0.9rem;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
}

.change-value.positive {
  color: #16a34a;
  background-color: rgba(22, 163, 74, 0.1);
}

.change-value.negative {
  color: #dc2626;
  background-color: rgba(220, 38, 38, 0.1);
}

.change-value.neutral {
  color: #aaa;
  background-color: rgba(170, 170, 170, 0.1);
}

.trend-cell {
  display: flex;
  align-items: center;
}

.change-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: 600;
  font-size: 0.85rem;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
}

.change-indicator.positive {
  color: #16a34a;
  background-color: rgba(22, 163, 74, 0.1);
}

.change-indicator.negative {
  color: #dc2626;
  background-color: rgba(220, 38, 38, 0.1);
}

.change-indicator.neutral {
  color: #aaa;
  background-color: rgba(170, 170, 170, 0.1);
}

.no-change-dot {
  width: 6px;
  height: 6px;
  background-color: #aaa;
  border-radius: 50%;
}

.status-badge {
  display: inline-block;
  padding: 0.3rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-badge.top {
  background-color: rgba(255, 215, 0, 0.15);
  color: #ffd700;
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.status-badge.first-page {
  background-color: rgba(34, 197, 94, 0.15);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.status-badge.second-page {
  background-color: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.status-badge.needs-work {
  background-color: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.last-update {
  color: #aaa;
  font-size: 0.85rem;
}

.no-data-message {
  text-align: center;
  color: #aaa;
  padding: 3rem;
  background: linear-gradient(135deg, #3b3b3b, #333333);
  border-radius: 0.75rem;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 1.5rem;
}

.no-data-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  max-width: 400px;
}

.no-data-icon {
  width: 48px;
  height: 48px;
  color: #92d000;
  opacity: 0.7;
}

.no-data-content h4 {
  color: #ffffff;
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.no-data-content p {
  color: #aaa;
  margin: 0;
  line-height: 1.5;
  text-align: center;
}

.no-data-content small {
  color: #888;
  font-size: 0.8rem;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .seo-page-content {
    padding: 1rem;
  }
  
  .page-controls-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .seo-stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
}

@media (max-width: 768px) {
  .page-title {
    font-size: 1.75rem;
  }
  
  .page-subtitle {
    font-size: 1rem;
  }
  
  .seo-stats-section {
    grid-template-columns: 1fr;
  }
  
  .card-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  
  .seo-table th,
  .seo-table td {
    padding: 0.75rem 0.5rem;
    font-size: 0.875rem;
  }
  
  .seo-table {
    min-width: 800px;
  }
}

@media (max-width: 480px) {
  .seo-page-content {
    padding: 0.75rem;
  }
  
  .page-title {
    font-size: 1.5rem;
  }
  
  .stat-value {
    font-size: 1.8rem;
  }
  
  .seo-table th,
  .seo-table td {
    padding: 0.5rem 0.25rem;
    font-size: 0.8rem;
  }
}
</style>