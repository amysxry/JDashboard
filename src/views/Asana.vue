<template>
  <div class="ga4-page-content">
    <header class="page-controls-header">
       <div class="header-info">
          <div class="date-info-main">
             <h1 class="page-title">Proyectos en Asana</h1>
          </div>
          <p class="page-subtitle">Resumen de las actividades</p>
       </div>
       <div class="header-actions">
          <label for="showCompleted" class="filter-label">
              <input type="checkbox" id="showCompleted" v-model="showCompletedTasks" class="filter-checkbox">
              Mostrar completadas
          </label>
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

    <main v-else class="analytics-main">
        <div v-if="activeProjects.length > 0" class="project-grid">
            <div v-for="project in activeProjects" :key="project.gid" class="project-card" :style="getProjectBorderStyle(project.current_status_color)">
              <div class="card-header">
                <a :href="project.permalink_url" target="_blank" rel="noopener noreferrer" class="project-name">
                  {{ project.name }}
                  <ExternalLink class="external-link-icon" />
                </a>
                <span v-if="project.current_status_text" class="status-badge" :style="getStatusColor(project.current_status_text)">
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
                <div v-if="getVisibleTasksForProject(project.gid).length > 0" class="tasks-container">
                  <h4 class="tasks-title">Tareas</h4>
                  <Transition name="slide-fade">
                    <ul v-if="expandedProjects.has(project.gid)" class="task-list">
                      <li v-for="task in getVisibleTasksForProject(project.gid)" :key="task.gid" :class="{ 'task-completed': task.completed }">
                        <div class="task-content">
                          <div class="task-header">
                            <Check v-if="task.completed" class="task-icon completed"/>
                            <Circle v-else class="task-icon pending"/>
                            <span class="task-name">{{ task.name }}</span>
                          </div>
                          <p v-if="task.notes" class="task-description">{{ task.notes }}</p>
                        </div>
                        <div class="task-meta">
                          <span v-if="getUserArea(task.assignee_gid)" class="area-badge">
                            {{ getUserArea(task.assignee_gid) }}
                          </span>
                          <span v-if="task.due_on" class="task-due-date">
                            <Calendar class="date-icon"/>
                            {{ formatDate(task.due_on) }}
                          </span>
                        </div>
                      </li>
                    </ul>
                  </Transition>
                </div>
                <div v-else class="no-tasks">
                    <PartyPopper class="no-tasks-icon" />
                    <span v-if="showCompletedTasks">¡Felicidades! No hay tareas en este proyecto.</span>
                    <span v-else>¡Felicidades! No hay tareas pendientes.</span>
                </div>
              </div>
              <div class="card-footer">
                  <button @click="toggleTasks(project.gid)" class="toggle-tasks-btn" v-if="getAllTasksForProject(project.gid).length > 0">
                    <ChevronDown class="toggle-icon" :class="{'is-expanded': expandedProjects.has(project.gid)}" />
                    <span>{{ expandedProjects.has(project.gid) ? 'Ocultar' : 'Mostrar' }} tareas</span>
                  </button>
              </div>
            </div>
        </div>
        <div v-else class="error-container">
            <h2>Sin actividad reciente.</h2>
            <p>No se encontraron proyectos que contengan "Feed" o "Workflow" con tareas.</p>
        </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/lib/supabaseClient';
import { ExternalLink, Calendar, ChevronDown, Circle, Check, PartyPopper } from 'lucide-vue-next';

// El script no necesita cambios, la lógica de datos es la misma.
const isLoading = ref(true);
const projects = ref<any[]>([]);
const tasks = ref<any[]>([]);
const users = ref<any[]>([]);
const fetchError = ref<string | null>(null);
const expandedProjects = ref(new Set<string>());
const showCompletedTasks = ref(true);

const activeProjects = computed(() => {
  const projectsWithTasks = new Set(tasks.value.map(t => t.project_gid));
  return projects.value.filter(p => 
    projectsWithTasks.has(p.gid) && (p.name.includes("Feed") || p.name.includes("Workflow"))
  );
});

const fetchData = async () => {
  isLoading.value = true;
  fetchError.value = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado.");
    const { data: clientData } = await supabase.from('clientes').select('id').eq('auth_id', user.id).single();
    if (!clientData) throw new Error("Cliente no encontrado.");
    
    const { data: projectsData, error: projectsError } = await supabase
      .from('asana_projects_cache').select('*').eq('cliente_id', clientData.id);
    if (projectsError) throw projectsError;
    projects.value = projectsData || [];

    const projectGids = projects.value.map(p => p.gid);
    if (projectGids.length > 0) {
      const { data: tasksData, error: tasksError } = await supabase
        .from('asana_tasks_cache').select('*').in('project_gid', projectGids);
      if (tasksError) throw tasksError;
      tasks.value = tasksData || [];

      const assigneeGids = [...new Set(tasksData?.map(t => t.assignee_gid).filter(Boolean))];
      if (assigneeGids.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('asana_users_cache').select('gid, area').in('gid', assigneeGids);
        if (usersError) throw usersError;
        users.value = usersData || [];
      }
    }
  } catch (err: any) {
    fetchError.value = err.message;
  } finally {
    isLoading.value = false;
  }
};

const getAllTasksForProject = (projectGid: string) => tasks.value.filter(task => task.project_gid === projectGid);
const getVisibleTasksForProject = (projectGid: string) => {
    const allTasks = getAllTasksForProject(projectGid);
    if (showCompletedTasks.value) return allTasks;
    return allTasks.filter(task => !task.completed);
};
const getProjectProgress = (projectGid: string) => {
    const projectTasks = getAllTasksForProject(projectGid);
    if (projectTasks.length === 0) return 100;
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
const getUserArea = (assigneeGid: string) => {
    if (!assigneeGid) return null;
    const user = users.value.find(u => u.gid === assigneeGid);
    return user ? user.area : null;
};
const getStatusColor = (color: string) => {
  const colorMap: { [key: string]: string } = { green: '#28a745', yellow: '#ffc107', red: '#dc3545', blue: '#007bff' };
  return { backgroundColor: colorMap[color] || '#6c757d', color: '#ffffff' };
};
const getProjectBorderStyle = (color: string) => {
    const colorMap: { [key: string]: string } = { green: '#28a745', yellow: '#ffc107', red: '#dc3545', blue: '#007bff' };
    return { borderTop: `4px solid ${colorMap[color] || 'transparent'}` };
}

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
/* --- ESTILOS UNIFICADOS (COPIADOS DE GA4.vue) --- */
.ga4-page-content { /* Renombramos la clase principal para que coincida */
  padding: 1.5rem;
  width: 100%;
  box-sizing: border-box;
}

.page-controls-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-bottom: 2rem;
  background-color: #2a2a2a; /* Fondo oscuro */
  border-radius: 1rem;
  padding: 1.25rem 1.5rem;
  border: 1px solid #3b3b3b; /* Borde sutil */
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.header-info .page-title {
  font-size: 1.25rem; /* Ajustamos el tamaño para que no sea tan grande */
  font-weight: 600;
  color: #ffffff;
  margin: 0;
}
.header-info .page-subtitle {
  font-size: 0.9rem;
  color: #aaa;
  margin: 0;
}
.header-actions {
    display: flex;
    align-items: center;
}

.filter-label {
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    font-size: 0.9rem;
    color: var(--color-text-secondary);
}
.filter-checkbox {
    width: 1.1em;
    height: 1.1em;
    margin-right: 0.5em;
    accent-color: var(--color-primary);
}

.analytics-main { /* Contenedor para el contenido principal debajo de la cabecera */
    width: 100%;
}

/* El resto de los estilos son los que ya tenías, pero ahora se aplicarán correctamente */
.loading-container, .error-container { text-align: center; padding: 4rem; color: var(--color-text-secondary); }
.spinner { width: 48px; height: 48px; border: 5px solid var(--color-border); border-bottom-color: var(--color-primary); border-radius: 50%; display: inline-block; animation: rotation 1s linear infinite; }
@keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

.project-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 1.5rem; }

.project-card {
  background-color: #2a2a2a; /* Fondo unificado */
  border: 1px solid #3b3b3b; /* Borde unificado */
  border-radius: 1rem;
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease-in-out;
}
.project-card:hover { transform: translateY(-5px); box-shadow: 0 8px 25px rgba(0,0,0,0.2); }

.card-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem; }
.project-name { font-size: 1.1rem; font-weight: 600; color: var(--color-text-primary); text-decoration: none; display: flex; align-items: center; gap: 0.5rem; }
.project-name:hover { color: var(--color-primary); }
.external-link-icon { width: 16px; opacity: 0.6; }
.status-badge { padding: 0.3rem 0.8rem; border-radius: 50px; font-size: 0.75rem; font-weight: 600; }

.card-body { padding: 0 1.25rem; }
.progress-section { margin-bottom: 1.5rem; }
.progress-info { display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.8rem; color: var(--color-text-secondary); }
.progress-bar-bg { width: 100%; background-color: #3b3b3b; border-radius: 5px; height: 8px; overflow: hidden; }
.progress-bar-fill { height: 100%; background-color: var(--color-primary); border-radius: 5px; transition: width 0.5s ease; }

.tasks-container { margin-top: 1.5rem; }
.tasks-title { font-weight: 500; color: var(--color-text-secondary); margin-bottom: 1rem; }
.task-list { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.75rem; }

.task-list li { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; padding: 0.75rem 0; border-top: 1px solid #3b3b3b; }
.task-list li:first-child { border-top: none; }
.task-content { flex-grow: 1; }
.task-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.25rem; }
.task-name { font-size: 0.9rem; }
.task-completed .task-name { text-decoration: line-through; color: var(--color-text-secondary); }
.task-icon { width: 16px; height: 16px; flex-shrink: 0; }
.task-icon.completed { color: var(--color-primary); }
.task-icon.pending { color: var(--color-text-secondary); }
.task-description { font-size: 0.85rem; color: var(--color-text-secondary); padding-left: 28px; white-space: pre-wrap; line-height: 1.4; }
.task-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem; flex-shrink: 0; text-align: right; }
.area-badge { background-color: #3b3b3b; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 500; color: var(--color-text-secondary); }
.task-due-date { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; color: var(--color-text-secondary); }
.date-icon { width: 14px; height: 14px; }
.no-tasks { display: flex; align-items: center; gap: 0.5rem; color: #888; padding: 1rem 0; font-size: 0.9rem;}
.no-tasks-icon { width: 18px; height: 18px; }
.card-footer { border-top: 1px solid #3b3b3b; margin-top: 1rem; padding: 0.75rem 1.25rem; text-align: center; }
.toggle-tasks-btn { background: none; border: none; color: var(--color-text-secondary); cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; }
.toggle-tasks-btn:hover { color: var(--color-primary); }
.toggle-icon { transition: transform 0.3s ease; }
.toggle-icon.is-expanded { transform: rotate(180deg); }
.slide-fade-enter-active, .slide-fade-leave-active { transition: all 0.4s ease-out; }
.slide-fade-enter-from, .slide-fade-leave-to { transform: translateY(-10px); opacity: 0; max-height: 0; }
.slide-fade-enter-to, .slide-fade-leave-from { transform: translateY(0); opacity: 1; max-height: 500px; }

/* Estilos responsivos copiados de GA4.vue */
@media (max-width: 1023px) {
    .ga4-page-content {
        padding: 1rem;
    }
    .project-grid {
        grid-template-columns: 1fr;
    }
}
@media (max-width: 767px) {
    .page-controls-header {
        flex-direction: column;
        align-items: stretch;
    }
}
</style>