<template>
  <div class="layout">
    <SidebarMenu />

    <div class="main-content" :style="{ marginLeft: dynamicMarginLeft }">
      <header class="page-header">
        <div class="header-content">
          <h1 class="page-title">Proyectos en Asana</h1>
          <p class="page-subtitle">Resumen de proyectos con actividad en los últimos 30 días.</p>
        </div>
      </header>

      <div v-if="isLoading" class="loading-container">
        <div class="spinner"></div>
        <p>Cargando datos de Asana...</p>
      </div>

      <div v-else-if="fetchError" class="error-container">
        <h2>Oops! Algo salió mal.</h2>
        <p>{{ fetchError }}</p>
        <button @click="fetchData" class="refresh-btn">Reintentar</button>
      </div>

      <main v-else-if="activeProjects.length > 0" class="project-grid">
        <div v-for="project in activeProjects" :key="project.gid" class="project-card" :style="getProjectBorderStyle(project.current_status_color)">
          
          <div class="card-header">
            <a :href="project.permalink_url" target="_blank" rel="noopener noreferrer" class="project-name">
              {{ project.name }}
              <ExternalLink class="external-link-icon" />
            </a>
            <span v-if="project.current_status_text" class="status-badge" :style="getStatusColor(project.current_status_color)">
              {{ project.current_status_text }}
            </span>
          </div>

          <div class="card-body">
            <div class="progress-section">
              <div class="progress-info">
                <span>Progreso</span>
                <span>{{ getProjectProgress(project.gid).toFixed(0) }}%</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" :style="{ width: getProjectProgress(project.gid) + '%' }"></div>
              </div>
            </div>

            <div v-if="getTasksForProject(project.gid).length > 0" class="tasks-container">
              <h4 class="tasks-title">Tareas</h4>
              <Transition name="slide-fade">
                <ul v-if="expandedProjects.has(project.gid)" class="task-list">
                  <li v-for="task in getTasksForProject(project.gid)" :key="task.gid" :class="{ 'task-completed': task.completed }">
                    <Check v-if="task.completed" class="task-icon completed"/>
                    <Circle v-else class="task-icon pending"/>
                    <span class="task-name">{{ task.name }}</span>
                    <span v-if="task.assignee_name" class="assignee-badge">
                      {{ task.assignee_name }}
                    </span>
                  </li>
                </ul>
              </Transition>
            </div>
            <div v-else class="no-tasks">
                <PartyPopper class="no-tasks-icon" />
                <span>¡Felicidades! No hay tareas en este proyecto.</span>
            </div>
          </div>
          
          <div class="card-footer">
             <button @click="toggleTasks(project.gid)" class="toggle-tasks-btn" v-if="getTasksForProject(project.gid).length > 0">
                <ChevronDown class="toggle-icon" :class="{'is-expanded': expandedProjects.has(project.gid)}" />
                <span>{{ expandedProjects.has(project.gid) ? 'Ocultar' : 'Mostrar' }} tareas</span>
             </button>
          </div>

        </div>
      </main>

      <div v-else class="error-container">
        <h2>Sin actividad reciente.</h2>
        <p>No se encontraron proyectos con tareas modificadas en los últimos 30 días.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { supabase } from '@/lib/supabaseClient';
import SidebarMenu from '@/components/SidebarMenu.vue';
import { ExternalLink, Calendar, User, CheckCircle2, ChevronDown, Circle, Check, PartyPopper } from 'lucide-vue-next';

// Lógica del Sidebar (sin cambios)
const sidebarWidth = ref(380);
const isMobileLayout = ref(false);
const dynamicMarginLeft = ref(`${sidebarWidth.value}px`);
const handleSidebarWidthChange = (event: Event) => {
  const customEvent = event as CustomEvent;
  if (customEvent.detail && typeof customEvent.detail.width === 'number') {
    sidebarWidth.value = customEvent.detail.width;
    dynamicMarginLeft.value = isMobileLayout.value ? '0' : `${sidebarWidth.value}px`;
  }
};
const checkLayoutSize = () => {
    isMobileLayout.value = window.innerWidth < 1024;
    dynamicMarginLeft.value = isMobileLayout.value ? '0' : `${sidebarWidth.value}px`;
};

// Estado del componente
const isLoading = ref(true);
const projects = ref<any[]>([]);
const tasks = ref<any[]>([]);
const fetchError = ref<string | null>(null);
const expandedProjects = ref(new Set<string>()); // Para controlar qué listas de tareas están expandidas

// Filtra proyectos para mostrar solo los que tienen tareas (actividad reciente)
const activeProjects = computed(() => {
  const projectsWithTasks = new Set(tasks.value.map(t => t.project_gid));
  return projects.value.filter(p => projectsWithTasks.has(p.gid));
});

const fetchData = async () => {
  isLoading.value = true;
  fetchError.value = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado.");
    const { data: clientData } = await supabase.from('clientes').select('id').eq('auth_id', user.id).single();
    if (!clientData) throw new Error("Cliente no encontrado.");
    
    // Traemos todos los proyectos del cliente
    const { data: projectsData, error: projectsError } = await supabase
      .from('asana_projects_cache').select('*').eq('cliente_id', clientData.id);
    if (projectsError) throw projectsError;
    projects.value = projectsData || [];

    // CAMBIO: Traemos TODAS las tareas (completadas y pendientes) de los últimos 30 días
    const projectGids = projects.value.map(p => p.gid);
    if (projectGids.length > 0) {
      const { data: tasksData, error: tasksError } = await supabase
        .from('asana_tasks_cache').select('*').in('project_gid', projectGids);
      if (tasksError) throw tasksError;
      tasks.value = tasksData || [];
    }
  } catch (err: any) {
    fetchError.value = err.message;
  } finally {
    isLoading.value = false;
  }
};

// Funciones de utilidad
const getTasksForProject = (projectGid: string) => tasks.value.filter(task => task.project_gid === projectGid);
const getProjectProgress = (projectGid: string) => {
    const projectTasks = getTasksForProject(projectGid);
    if (projectTasks.length === 0) return 100; // Si no hay tareas, el proyecto está 100% completo
    const completedTasks = projectTasks.filter(t => t.completed).length;
    return (completedTasks / projectTasks.length) * 100;
};
const toggleTasks = (projectGid: string) => {
    if (expandedProjects.value.has(projectGid)) {
        expandedProjects.value.delete(projectGid);
    } else {
        expandedProjects.value.add(projectGid);
    }
};
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
const getStatusColor = (color: string) => {
  const colorMap: { [key: string]: string } = { green: '#28a745', yellow: '#ffc107', red: '#dc3545', blue: '#007bff' };
  return { backgroundColor: colorMap[color] || '#6c757d', color: '#ffffff' };
};
const getProjectBorderStyle = (color: string) => {
    const colorMap: { [key: string]: string } = { green: '#28a745', yellow: '#ffc107', red: '#dc3545', blue: '#007bff' };
    return { borderTop: `4px solid ${colorMap[color] || 'transparent'}` };
}

// Hooks de ciclo de vida
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
.layout { display: flex; background-color: var(--color-bg-dark); }
.main-content { flex: 1; padding: 2rem; transition: margin-left 0.3s ease; }
.page-header { margin-bottom: 2rem; }
.page-title { font-size: 2.25rem; font-weight: 700; color: var(--color-text-primary); }
.page-subtitle { font-size: 1.1rem; color: var(--color-text-secondary); margin-top: 0.5rem; }

.loading-container, .error-container { text-align: center; padding: 4rem; color: var(--color-text-secondary); }
.spinner { width: 48px; height: 48px; border: 5px solid var(--color-border); border-bottom-color: var(--color-primary); border-radius: 50%; display: inline-block; animation: rotation 1s linear infinite; }
@keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

.project-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem; }

.project-card {
  background-color: var(--color-bg-accent);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-lg);
  display: flex;
  flex-direction: column;
  transition: var(--transition-fast);
}
.project-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.2); }

.card-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem; }
.project-name { font-size: 1.1rem; font-weight: 600; color: var(--color-text-primary); text-decoration: none; display: flex; align-items: center; gap: 0.5rem; }
.project-name:hover { color: var(--color-primary); }
.external-link-icon { width: 16px; opacity: 0.6; }
.status-badge { padding: 0.3rem 0.8rem; border-radius: 50px; font-size: 0.75rem; font-weight: 600; }

.card-body { padding: 0 1.25rem; }
.progress-section { margin-bottom: 1.5rem; }
.progress-info { display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.8rem; color: var(--color-text-secondary); }
.progress-bar-bg { width: 100%; background-color: rgba(0,0,0,0.2); border-radius: 5px; height: 8px; overflow: hidden; }
.progress-bar-fill { height: 100%; background-color: var(--color-primary); border-radius: 5px; transition: width 0.5s ease; }

.tasks-container { margin-top: 1.5rem; }
.tasks-title { font-weight: 500; color: var(--color-text-secondary); margin-bottom: 1rem; }
.task-list { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.task-list li { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0; border-top: 1px solid var(--color-border); font-size: 0.9rem; }
.task-list li:first-child { border-top: none; }
.task-name { flex-grow: 1; }
.task-completed .task-name { text-decoration: line-through; color: var(--color-text-secondary); }
.task-icon { width: 16px; height: 16px; flex-shrink: 0; }
.task-icon.completed { color: var(--color-primary); }
.task-icon.pending { color: var(--color-text-secondary); }

.assignee-badge { background-color: rgba(255,255,255,0.05); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; color: var(--color-text-secondary); }
.no-tasks { display: flex; align-items: center; gap: 0.5rem; color: #888; font-style: italic; padding: 1rem 0; }
.no-tasks-icon { width: 18px; height: 18px; }

.card-footer { border-top: 1px solid var(--color-border); margin-top: 1rem; padding: 0.75rem 1.25rem; text-align: center; }
.toggle-tasks-btn { background: none; border: none; color: var(--color-text-secondary); cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; }
.toggle-tasks-btn:hover { color: var(--color-primary); }
.toggle-icon { transition: transform 0.3s ease; }
.toggle-icon.is-expanded { transform: rotate(180deg); }

/* Transición para la lista de tareas */
.slide-fade-enter-active, .slide-fade-leave-active { transition: all 0.4s ease-out; }
.slide-fade-enter-from, .slide-fade-leave-to { transform: translateY(-10px); opacity: 0; max-height: 0; }
.slide-fade-enter-to, .slide-fade-leave-from { transform: translateY(0); opacity: 1; max-height: 500px; /* Altura máxima esperada */ }
</style>