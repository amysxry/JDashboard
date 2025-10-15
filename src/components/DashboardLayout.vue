<template>
  <div class="dashboard-layout">
    <SidebarMenu />

    <div class="page-container" :class="{ 'sidebar-collapsed': isCollapsed }">
      <TopBarMenu :title="pageTitle" />
      <main class="main-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/stores/user'
import SidebarMenu from '@/components/SidebarMenu.vue';
import TopBarMenu from '@/components/TopBarMenu.vue';

const userStore = useUserStore()
const isCollapsed = ref(false);
const route = useRoute();

const pageTitle = computed(() => route.meta.title || 'Dashboard');

const handleSidebarToggle = (event) => {
  isCollapsed.value = event.detail;
};

onMounted(() => {
  userStore.fetchProfile();
  window.addEventListener('sidebar-toggled', handleSidebarToggle);
});

onUnmounted(() => {
  window.removeEventListener('sidebar-toggled', handleSidebarToggle);
});
</script>

<style scoped>
.dashboard-layout {
  /* Este contenedor ahora solo necesita existir. Su hijo se posicionará sobre él. */
  background-color: var(--color-bg-dark);
  position: relative; /* Necesario para que el posicionamiento absoluto del hijo funcione bien */
  width: 100%;
}

/* --- LA MAGIA ESTÁ AQUÍ --- */
.page-container {
  position: absolute; /* Lo sacamos del flujo normal para posicionarlo con precisión. */
  top: 0;
  right: 0; /* Lo anclamos al borde derecho de la pantalla. */
  height: 100vh; /* Ocupa toda la altura */
  display: flex;
  flex-direction: column;
  
  /* Anclamos su borde izquierdo donde termina el menú lateral */
  left: var(--sidebar-width, 280px);
  
  /* Animamos el cambio de la propiedad `left` */
  transition: left 0.3s ease-in-out;
}

.page-container.sidebar-collapsed {
  /* Cuando el menú se colapsa, movemos el borde izquierdo */
  left: var(--sidebar-collapsed-width, 100px);
}

.main-content {
  flex-grow: 1; /* Hace que el contenido principal ocupe el espacio vertical restante */
  overflow-y: auto; /* Permite el scroll si el contenido es muy largo */
  overflow-x: auto; /* Permite el scroll horizontal si el contenido es muy ancho */
}

/* En pantallas móviles, el contenedor vuelve a su estado normal y ocupa todo el ancho */
@media (max-width: 1023px) {
  .page-container,
  .page-container.sidebar-collapsed {
    position: relative; /* Lo devolvemos al flujo normal */
    left: 0; /* Eliminamos el anclaje izquierdo */
    width: 100%;
  }
}

/* Reglas para ocultar el scrollbar */
.main-content::-webkit-scrollbar { display: none; }
.main-content {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>