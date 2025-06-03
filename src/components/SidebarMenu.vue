<template>
  <div>
    <!-- Overlay para móviles -->
    <div 
      v-if="isMobile && isOpen" 
      class="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
      @click="closeSidebar"
    ></div>

    <!-- Botón hamburguesa para móviles -->
    <button 
      v-if="isMobile"
      @click="toggleSidebar"
      class="fixed top-4 left-4 z-30 lg:hidden text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
    >
      <Menu class="h-6 w-6" />
    </button>

    <!-- Botón de notificaciones -->
    <button 
      class="fixed top-4 right-4 z-30 text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
    >
      <Bell class="h-6 w-6" />
    </button>

    <!-- Sidebar -->
    <aside 
      ref="sidebarRef"
      :class="[
        'sidebar', 
        { 
          'sidebar-collapsed': isCollapsed && !isMobile,
          '-translate-x-full': isMobile && !isOpen,
          'lg:translate-x-0': !isMobile
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
            <RouterLink to="/dashboard" class="nav-link" :class="{ active: currentRoute === '/dashboard' }">
              <LayoutDashboard class="icon" />
              <span v-show="!isCollapsed || isMobile">Dashboard</span>
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/analytics" class="nav-link" :class="{ active: currentRoute === '/analytics' }">
              <BarChart3 class="icon" />
              <span v-show="!isCollapsed || isMobile">Google Analytics</span>
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/ads" class="nav-link" :class="{ active: currentRoute === '/ads' }">
              <Target class="icon" />
              <span v-show="!isCollapsed || isMobile">Google Ads</span>
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/wordpress" class="nav-link" :class="{ active: currentRoute === '/wordpress' }">
              <Globe class="icon" />
              <span v-show="!isCollapsed || isMobile">WordPress</span>
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/asana" class="nav-link" :class="{ active: currentRoute === '/asana' }">
              <CheckSquare class="icon" />
              <span v-show="!isCollapsed || isMobile">Asana</span>
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/reports" class="nav-link" :class="{ active: currentRoute === '/reports' }">
              <FileText class="icon" />
              <span v-show="!isCollapsed || isMobile">Reportes</span>
            </RouterLink>
          </li>
          <li class="mt-auto">
            <RouterLink to="/config" class="nav-link" :class="{ active: currentRoute === '/config' }">
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
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
const isOpen = ref(false)
const isMobile = ref(false)

const currentRoute = computed(() => route.path)

const checkScreenSize = () => {
  isMobile.value = window.innerWidth < 1024
  // En móvil, el sidebar inicia cerrado
  if (isMobile.value) {
    isOpen.value = false
  } else {
    isOpen.value = true
  }
}

const toggleCollapse = () => {
  if (!isMobile.value) {
    isCollapsed.value = !isCollapsed.value
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
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize)
})
</script>

<style scoped>
.sidebar {
  width: 280px;
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
  transform: translateX(0);
}

.sidebar-collapsed {
  width: 80px;
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
}

.logo-small {
  height: 30px;
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
  overflow-y: auto;
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
  color: #ffffff;
}

.nav-link .icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.nav-link span {
  font-size: 0.9375rem;
  white-space: nowrap;
}

.mt-auto {
  margin-top: auto;
}

/* Responsive styles */
@media (max-width: 1024px) {
  .sidebar {
    transform: translateX(-100%);
    z-index: 40;
  }
  
  .sidebar.-translate-x-full {
    transform: translateX(-100%);
  }
  
  .sidebar:not(.-translate-x-full) {
    transform: translateX(0);
  }
  
  .sidebar-collapsed {
    width: 280px;
  }
  
  .main-content {
    padding-top: 4rem;
  }
}

@media (min-width: 1024px) {
  .main-content {
    padding-top: 0;
  }
}
</style>