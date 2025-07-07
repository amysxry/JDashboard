<template>
  <div>
    <div
      v-if="isMobileOpen"
      class="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
      @click="closeMobileMenu"
    ></div>

    <aside
      :class="['sidebar', {
        'sidebar-collapsed': isCollapsed,
        'sidebar-open-mobile': isMobileOpen,
      }]"
    >
      <div class="sidebar-header">
        <template v-if="!isCollapsed">
          <img src="@/assets/Logo-JDigital-black1.png" class="logo" alt="JDigital"/>
          <button @click="toggleCollapse" class="collapse-btn">
            <ChevronLeft />
          </button>
        </template>
        <template v-else>
          <button @click="toggleCollapse" class="collapse-btn mx-auto">
            <Menu class="h-6 w-6" />
          </button>
        </template>
      </div>

      <nav class="sidebar-nav">
        <ul>
          <li>
            <RouterLink to="/dashboard" @click="closeMobileMenu" class="nav-link" :class="{ active: currentRoute === '/dashboard' }">
              <LayoutDashboard class="icon" />
              <span v-show="!isCollapsed">Dashboard</span>
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/analytics" @click="closeMobileMenu" class="nav-link" :class="{ active: currentRoute === '/analytics' }">
              <BarChart3 class="icon" />
              <span v-show="!isCollapsed">Google Analytics</span>
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/ads" @click="closeMobileMenu" class="nav-link" :class="{ active: currentRoute === '/ads' }">
              <Target class="icon" />
              <span v-show="!isCollapsed">Google Ads</span>
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/wordpress" @click="closeMobileMenu" class="nav-link" :class="{ active: currentRoute === '/wordpress' }">
              <Globe class="icon" />
              <span v-show="!isCollapsed">WordPress</span>
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/asana" @click="closeMobileMenu" class="nav-link" :class="{ active: currentRoute === '/asana' }">
              <CheckSquare class="icon" />
              <span v-show="!isCollapsed">Asana</span>
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/reports" @click="closeMobileMenu" class="nav-link" :class="{ active: currentRoute === '/reports' }">
              <FileText class="icon" />
              <span v-show="!isCollapsed">Reportes</span>
            </RouterLink>
          </li>
          
          <li class="mt-auto">
            <RouterLink to="/config" @click="closeMobileMenu" class="nav-link" :class="{ active: currentRoute === '/config' }">
              <Settings class="icon" />
              <span v-show="!isCollapsed">Configuración</span>
            </RouterLink>
          </li>

          <li>
            <button @click="handleLogout" class="nav-link logout-btn">
              <LogOut class="icon" />
              <span v-show="!isCollapsed">Cerrar Sesión</span>
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { supabase } from '@/lib/supabaseClient';
import {
  LayoutDashboard, BarChart3, Target, Globe, CheckSquare,
  FileText, Settings, ChevronLeft, Menu, LogOut
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

const isCollapsed = ref(false);
const isMobileOpen = ref(false);

const currentRoute = computed(() => route.path);

const handleLogout = async () => {
  await supabase.auth.signOut();
  router.push('/login');
};

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
  window.dispatchEvent(new CustomEvent('sidebar-toggled', { detail: isCollapsed.value }));
};

const handleToggleMobile = () => {
  isMobileOpen.value = !isMobileOpen.value;
};

const closeMobileMenu = () => {
  isMobileOpen.value = false;
};

onMounted(() => {
  window.addEventListener('toggle-mobile-sidebar', handleToggleMobile);
});

onUnmounted(() => {
  window.removeEventListener('toggle-mobile-sidebar', handleToggleMobile);
});
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  background-color: var(--color-bg-dark); /* Fondo principal del sidebar */
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease-in-out, transform 0.3s ease-in-out;
  z-index: 30;
  box-sizing: border-box;
  /* CAMBIO: quitamos el borde derecho de todo el sidebar */
}

.sidebar-collapsed {
  width: var(--sidebar-collapsed-width);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  /* CAMBIO: Mismo color de fondo que el TopBar para unificar */
  background-color: var(--color-bg-accent); 
  height: 69px; /* Mantenemos una altura fija y consistente */
  box-sizing: border-box;
  flex-shrink: 0;
  /* CAMBIO: Borde inferior que se alinea con el del TopBar */
  border-bottom: 1px solid var(--color-border);
}

.sidebar-collapsed .sidebar-header {
  justify-content: center;
  padding: 1rem;
}

.logo {
  height: 36px;
  transition: all 0.3s ease;
  /* CAMBIO: No se necesita filtro si usas un logo blanco */
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
  -ms-overflow-style: none;
  scrollbar-width: none;
  /* CAMBIO: El borde derecho ahora está solo en la navegación, no en el header */
  border-right: 1px solid var(--color-border);
}

.sidebar-nav::-webkit-scrollbar { display: none; }
.sidebar-nav ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; height: 100%; }

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
  width: 100%;
  box-sizing: border-box;
  background-color: transparent;
  border: none;
  font-family: inherit;
  font-size: 0.9375rem;
  cursor: pointer;
  position: relative;
}

.nav-link:hover {
  background: rgba(146, 208, 0, 0.1);
  color: #ffffff;
}

/* CAMBIO: Nuevo estilo para el link activo (más sutil) */
.nav-link.active {
  background: linear-gradient(90deg, rgba(146, 208, 0, 0.2), rgba(146, 208, 0, 0.05));
  color: #ffffff;
  font-weight: 600;
}
.nav-link.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: 60%;
    background-color: var(--color-primary);
    border-radius: 0 4px 4px 0;
}

.nav-link .icon { width: 20px; height: 20px; flex-shrink: 0; }
.nav-link span { white-space: nowrap; }
.logout-btn { text-align: left; font-weight: normal; }
.logout-btn:hover { background: rgba(254, 117, 41, 0.1); color: #fe7529; }
.mt-auto { margin-top: auto; }

@media (max-width: 1023px) {
  .collapse-btn { display: flex; }
  .sidebar { transform: translateX(-100%); width: 100vw; max-width: 320px; border-right: none; }
  .sidebar-open-mobile { transform: translateX(0); }
  .sidebar-header .collapse-btn { display: none; }
  .sidebar-header { justify-content: flex-start; }
  .nav-link span { display: inline-block !important; }
  /* CAMBIO: En móvil el borde de la navegación desaparece */
  .sidebar-nav { border-right: none; }
}
</style>