<template>
  <div>
    <div
      v-if="isMobile && isOpen"
      class="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
      @click="closeSidebar"
    ></div>

    <button
      v-if="isMobile"
      @click="toggleSidebar"
      class="fixed top-4 left-4 z-30 lg:hidden text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
    >
      <Menu class="h-6 w-6" />
    </button>

    <button
      :class="[
        'fixed top-4 z-30 text-white p-2 rounded-lg hover:bg-white/10 transition-colors',
        isMobile ? 'right-4' : 'right-4 lg:right-auto lg:left-[calc(320px+1rem)]' // Ajustar posición en desktop
      ]"
    >
      <Bell class="h-6 w-6" />
    </button>

    <aside
      ref="sidebarRef"
      :class="[
        'sidebar',
        {
          'sidebar-collapsed': isCollapsed && !isMobile,
          'sidebar-open-mobile': isMobile && isOpen, // Nueva clase para controlar apertura en móvil
          'sidebar-closed-mobile': isMobile && !isOpen, // Nueva clase para controlar cierre en móvil
          'lg:translate-x-0': !isMobile // En desktop, siempre visible (no translate)
        }
      ]"
    >
      <div class="sidebar-header">
        <img
          src="@/assets/Logo-JDigital-black.png"
          :class="['logo', { 'logo-small': isCollapsed && !isMobile }]"
          alt="JDigital"
        >
        <button @click="toggleCollapse" class="collapse-btn hidden lg:flex">
          <ChevronLeft v-if="!isCollapsed" />
          <ChevronRight v-else />
        </button>
      </div>

      <nav class="sidebar-nav">
        <ul>
          <li>
            <RouterLink to="/dashboard" class="nav-link" :class="{ active: currentRoute === '/dashboard' }" @click="closeSidebar">
              <LayoutDashboard class="icon" />
              <span v-show="!isCollapsed || isMobile">Dashboard</span>
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/analytics" class="nav-link" :class="{ active: currentRoute === '/analytics' }" @click="closeSidebar">
              <BarChart3 class="icon" />
              <span v-show="!isCollapsed || isMobile">Google Analytics</span>
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/ads" class="nav-link" :class="{ active: currentRoute === '/ads' }" @click="closeSidebar">
              <Target class="icon" />
              <span v-show="!isCollapsed || isMobile">Google Ads</span>
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/wordpress" class="nav-link" :class="{ active: currentRoute === '/wordpress' }" @click="closeSidebar">
              <Globe class="icon" />
              <span v-show="!isCollapsed || isMobile">WordPress</span>
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/asana" class="nav-link" :class="{ active: currentRoute === '/asana' }" @click="closeSidebar">
              <CheckSquare class="icon" />
              <span v-show="!isCollapsed || isMobile">Asana</span>
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/reports" class="nav-link" :class="{ active: currentRoute === '/reports' }" @click="closeSidebar">
              <FileText class="icon" />
              <span v-show="!isCollapsed || isMobile">Reportes</span>
            </RouterLink>
          </li>
          <li class="mt-auto">
            <RouterLink to="/config" class="nav-link" :class="{ active: currentRoute === '/config' }" @click="closeSidebar">
              <Settings class="icon" />
              <span v-show="!isCollapsed || isMobile">Configuración</span>
            </RouterLink>
          </li>
        </ul>
      </nav>
    </aside>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  LayoutDashboard,
  BarChart3,
  Target,
  Globe,
  CheckSquare,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bell,
  Menu
} from 'lucide-vue-next'

const route = useRoute()
const sidebarRef = ref(null)
const isCollapsed = ref(false)
const isOpen = ref(false) // Controla si el sidebar móvil está abierto
const isMobile = ref(false) // Controla si la pantalla es móvil

const currentRoute = computed(() => route.path)

// Función para verificar el tamaño de la pantalla
const checkScreenSize = () => {
  isMobile.value = window.innerWidth < 1024
  // En móvil, el sidebar inicia cerrado por defecto
  if (isMobile.value) {
    isOpen.value = false
  } else {
    // En desktop, el sidebar está siempre "abierto" (visible)
    isOpen.value = true
  }
}

// Alterna el estado de colapso solo en desktop
const toggleCollapse = () => {
  if (!isMobile.value) {
    isCollapsed.value = !isCollapsed.value
    // Emitir un evento para notificar al componente padre (GA4.vue)
    // sobre el cambio de ancho del sidebar
    window.dispatchEvent(new CustomEvent('sidebar-width-changed', {
      detail: {
        width: isCollapsed.value ? 80 : 30 // Ancho colapsado vs. normal (Adjusted to 320px)
      }
    }));
  }
}

// Alterna la apertura/cierre del sidebar en móvil
const toggleSidebar = () => {
  isOpen.value = !isOpen.value
}

// Cierra el sidebar solo si está en modo móvil
const closeSidebar = () => {
  if (isMobile.value) {
    isOpen.value = false
  }
}

// Montar y desmontar listeners para el cambio de tamaño de pantalla
onMounted(() => {
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
});

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize)
});

// Observar cambios en la ruta para cerrar el sidebar móvil
watch(currentRoute, () => {
  closeSidebar();
});
</script>

<style scoped>
/* Variables para anchos del sidebar */
:root {
  --sidebar-width: 350px; /* Increased from 280px to 320px */
  --sidebar-collapsed-width: 80px;
}

.sidebar {
  width: var(--sidebar-width); /* Ancho por defecto */
  background-color: #1e1e1e;
  height: 100vh; /* Ocupa todo el alto de la vista */
  position: fixed; /* Esto lo saca del flujo normal */
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease, width 0.3s ease;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 30; /* Asegura que esté por encima del contenido */
  box-sizing: border-box; /* Incluye padding y border en el width */
}

.sidebar-collapsed {
  width: var(--sidebar-collapsed-width); /* Ancho cuando está colapsado */
}

/* Manejo del sidebar en móviles */
@media (max-width: 1023px) { /* Usamos 1023px para que coincida con el `isMobile < 1024` */
  .sidebar {
    width: var(--sidebar-width); /* En móvil, siempre tiene el ancho completo cuando está visible */
    transform: translateX(-100%); /* Por defecto, oculto */
  }

  .sidebar-open-mobile {
    transform: translateX(0); /* Visible */
  }

  .sidebar-closed-mobile {
    transform: translateX(-100%); /* Oculto */
  }

  /* Asegurarse de que el sidebar-collapsed no aplique en móvil */
  .sidebar-collapsed {
    width: var(--sidebar-width); /* Ancho completo incluso si la variable de colapso es true en js */
  }

  /* Botón de notificaciones en móvil: siempre a la derecha del todo */
  .fixed.top-4.right-4 {
    left: auto !important; /* Desactiva la regla de desktop si se aplicó */
    right: 1rem; /* Margen a la derecha */
  }
}

/* Estilos para desktop */
@media (min-width: 1024px) {
  .sidebar {
    transform: translateX(0); /* Siempre visible en desktop */
  }
  /* Asegura que el botón de notificaciones se posicione a la derecha del sidebar cuando NO está colapsado */
  .fixed.top-4.lg\:right-auto.lg\:left-\[calc\(280px\+1rem\)\] {
      left: calc(var(--sidebar-width) + 1rem); /* 320px + 16px (1rem) */ /* Adjusted from 280px to 320px */
      right: auto;
  }
  .sidebar-collapsed ~ .fixed.top-4.lg\:right-auto.lg\:left-\[calc\(280px\+1rem\)\] {
      left: calc(var(--sidebar-collapsed-width) + 1rem); /* 80px + 16px (1rem) */
  }
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo {
  height: 40px;
  filter: brightness(0) invert(1);
  transition: all 0.3s ease;
  /* Ocultar texto o ajustar si se colapsa */
  opacity: 1;
  visibility: visible;
}

.sidebar-collapsed .logo:not(.logo-small) {
  opacity: 0;
  visibility: hidden;
  width: 0; /* Oculta completamente */
  margin-left: -100%; /* Desplaza fuera de vista */
}

.logo-small {
  height: 30px;
  width: auto; /* Asegura que la imagen no se distorsione */
}
/* Cuando el sidebar está colapsado, el logo se reduce pero sigue siendo visible si no está oculto */
.sidebar-collapsed .logo.logo-small {
    height: 30px;
    opacity: 1;
    visibility: visible;
    margin-left: 0;
    max-width: 100%; /* Asegura que la imagen se ajuste dentro del ancho colapsado */
}

.collapse-btn {
  background: transparent;
  border: none;
  color: #ffffff;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.collapse-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.sidebar-nav {
  flex: 1;
  padding: 1rem;
  overflow-y: auto; /* Permite scroll si hay muchos elementos */
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}
/* Ocultar scrollbar para webkit */
.sidebar-nav::-webkit-scrollbar {
  display: none;
}

.sidebar-nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  transition: all 0.2s ease;
  margin-bottom: 0.5rem;
}

.nav-link:hover {
  background: rgba(146, 208, 0, 0.1);
  color: #ffffff;
}

.nav-link.active {
  background: #92d000;
  color: #1e1e1e; /* Texto oscuro para enlace activo */
  font-weight: 600;
}
.nav-link.active .icon { /* Icono oscuro para enlace activo */
    color: #1e1e1e;
}


.nav-link .icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: inherit; /* Permite que el color del icono sea controlado por el color del enlace */
}

.nav-link span {
  font-size: 0.9375rem;
  white-space: nowrap;
  opacity: 1;
  transition: opacity 0.3s ease;
}

.sidebar-collapsed .nav-link span:not(.no-hide) { /* Oculta texto al colapsar, excepto si tienen 'no-hide' */
  opacity: 0;
  width: 0;
  overflow: hidden;
  display: none; /* Asegura que no ocupe espacio */
}

.mt-auto {
  margin-top: auto;
}

/* Estilos para el botón de hamburguesa y notificaciones */
.fixed.top-4.left-4 {
    z-index: 50; /* Más alto que el overlay */
}
.fixed.top-4.right-4 {
    z-index: 50;
}
</style>