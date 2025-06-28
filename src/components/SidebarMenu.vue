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
        isMobile ? 'right-4' : 'right-4 lg:right-auto lg:left-[calc(380px+1rem)]'
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
          'sidebar-open-mobile': isMobile && isOpen,
          'sidebar-closed-mobile': isMobile && !isOpen,
          'lg:translate-x-0': !isMobile
        }
      ]"
    >
      <div class="sidebar-header">
        <template v-if="!isCollapsed">
          <img
            src="@/assets/Logo-JDigital-black.png"
            class="logo"
            alt="JDigital"
          >
          <button @click="toggleCollapse" class="collapse-btn hidden lg:flex">
            <ChevronLeft />
          </button>
        </template>

        <template v-else>
          <button @click="toggleCollapse" class="collapse-btn hidden lg:flex mx-auto">
            <Menu class="h-6 w-6" />
          </button>
        </template>
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
// El script no necesita cambios, la lógica de 'isCollapsed' ya funciona.
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
  ChevronRight, // Ya no se usa, pero lo dejamos por si acaso
  Bell,
  Menu
} from 'lucide-vue-next'

const route = useRoute()
const isCollapsed = ref(false)
const isOpen = ref(false)
const isMobile = ref(false)

const currentRoute = computed(() => route.path)

const checkScreenSize = () => {
  isMobile.value = window.innerWidth < 1024
  if (isMobile.value) {
    isOpen.value = false
  } else {
    isOpen.value = true
  }
}

const toggleCollapse = () => {
  if (!isMobile.value) {
    isCollapsed.value = !isCollapsed.value
    window.dispatchEvent(new CustomEvent('sidebar-width-changed', {
      detail: {
        width: isCollapsed.value ? 80 : 380
      }
    }));
  }
}

const toggleSidebar = () => {
  isOpen.value = !isOpen.value
}

const closeSidebar = () => {
  if (isMobile.value) {
    isOpen.value = false
  }
}

onMounted(() => {
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
  window.dispatchEvent(new CustomEvent('sidebar-width-changed', {
    detail: {
      width: isCollapsed.value ? 80 : 380
    }
  }));
});

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize)
});

watch(currentRoute, () => {
  closeSidebar();
});
</script>

<style scoped>
/* Las variables de ancho ahora están en tu style.css global */

.sidebar {
  width: var(--sidebar-width);
  background-color: #1e1e1e;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease, width 0.3s ease;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 30;
  box-sizing: border-box;
}

.sidebar-collapsed {
  width: var(--sidebar-collapsed-width);
}

@media (max-width: 1023px) {
  .sidebar {
    width: var(--sidebar-width);
    transform: translateX(-100%);
  }
  .sidebar-open-mobile {
    transform: translateX(0);
  }
  .sidebar-closed-mobile {
    transform: translateX(-100%);
  }
  .sidebar-collapsed {
    width: var(--sidebar-width);
  }
  .fixed.top-4.right-4 {
    left: auto !important;
    right: 1rem;
  }
}

@media (min-width: 1024px) {
  .sidebar {
    transform: translateX(0);
  }
}

.sidebar-header {
  display: flex;
  align-items: center;
  /* Justifica al centro cuando está colapsado, y entre los extremos cuando está expandido */
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  height: 73px; /* Altura fija para evitar saltos de layout */
  box-sizing: border-box;
}

.sidebar-collapsed .sidebar-header {
    justify-content: center;
}

.logo {
  height: 40px;
  filter: brightness(0) invert(1);
  transition: all 0.3s ease;
}

/* LIMPIEZA: Se eliminan las reglas de .logo-small que ya no son necesarias */

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

/* El resto del CSS se mantiene igual */
.sidebar-nav {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
}
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
  color: #1e1e1e;
  font-weight: 600;
}
.nav-link.active .icon {
    color: #1e1e1e;
}
.nav-link .icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: inherit;
}
.nav-link span {
  font-size: 0.9375rem;
  white-space: nowrap;
  opacity: 1;
  transition: opacity 0.3s ease;
}
.sidebar-collapsed .nav-link span:not(.no-hide) {
  opacity: 0;
  width: 0;
  overflow: hidden;
  display: none;
}
.mt-auto {
  margin-top: auto;
}
.fixed.top-4.left-4,
.fixed.top-4.right-4 {
    z-index: 50;
}
</style>