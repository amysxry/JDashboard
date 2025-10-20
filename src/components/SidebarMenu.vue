<template>
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
        <img v-if="!isCollapsed || isMobileView" src="@/assets/Logo-JDigital-black1.png" class="logo" alt="JDigital"/>

        <button v-if="isMobileView" @click="closeMobileMenu" class="collapse-btn">
          <X class="h-6 w-6" />
        </button>
        
        <template v-else>
          <button v-if="!isCollapsed" @click="toggleCollapse" class="collapse-btn">
            <ChevronLeft />
          </button>
          <button v-else @click="toggleCollapse" class="collapse-btn mx-auto">
            <Menu class="h-6 w-6" />
          </button>
        </template>
      </div>

      <nav class="sidebar-nav">
        <ul>
          <li>
            <RouterLink to="/dashboard" @click="closeMobileMenu" class="nav-link" :class="{ active: currentRoute === '/dashboard' }">
              <LayoutDashboard class="icon" />
              <span v-show="!isCollapsed || isMobileView">Inicio</span>
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/analytics" @click="closeMobileMenu" class="nav-link" :class="{ active: currentRoute === '/analytics' }">
              <BarChart3 class="icon" />
              <span v-show="!isCollapsed || isMobileView">Google Analytics</span>
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/ranking-seo" @click="closeMobileMenu" class="nav-link" :class="{ active: currentRoute === '/ranking-seo' }">
              <Search class="icon" />
              <span v-show="!isCollapsed || isMobileView">Ranking SEO</span>
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/ads" @click="closeMobileMenu" class="nav-link" :class="{ active: currentRoute === '/ads' }">
              <Target class="icon" />
              <span v-show="!isCollapsed || isMobileView">Google Ads</span>
            </RouterLink>
          </li>
          <li v-if="hasEcommerce">
            <RouterLink to="/wordpress" @click="closeMobileMenu" class="nav-link" :class="{ active: currentRoute === '/wordpress' }">
              <Globe class="icon" />
              <span v-show="!isCollapsed || isMobileView">Tienda en línea</span>
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/asana" @click="closeMobileMenu" class="nav-link" :class="{ active: currentRoute === '/asana' }">
              <CheckSquare class="icon" />
              <span v-show="!isCollapsed || isMobileView">Asana</span>
            </RouterLink>
          </li>
          
          <li class="mt-auto">
            <RouterLink to="/config" @click="closeMobileMenu" class="nav-link" :class="{ active: currentRoute === '/config' }">
              <Settings class="icon" />
              <span v-show="!isCollapsed || isMobileView">Configuración</span>
            </RouterLink>
          </li>

          <li>
            <button @click="handleLogout" class="nav-link logout-btn">
              <LogOut class="icon" />
              <span v-show="!isCollapsed || isMobileView">Cerrar Sesión</span>
            </button>
          </li>
        </ul>
      </nav>
    </aside>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { supabase } from '@/lib/supabaseClient';
import {
  LayoutDashboard, BarChart3, Target, Globe, CheckSquare,
  Settings, ChevronLeft, Menu, LogOut, X, Search
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

const isCollapsed = ref(false);
const isMobileOpen = ref(false);
const isMobileView = ref(window.innerWidth < 1024);
const hasEcommerce = ref(false);

const checkScreenSize = () => {
  isMobileView.value = window.innerWidth < 1024;
  if (!isMobileView.value) {
    isMobileOpen.value = false;
  }
};

const currentRoute = computed(() => route.path);

const handleLogout = async () => {
  await supabase.auth.signOut();
  isMobileOpen.value = false;
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

const fetchClientData = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            const { data, error } = await supabase
                .from('clientes')
                .select('has_ecommerce')
                .eq('auth_id', user.id)
                .single();

            if (error) {
                console.error("Error al obtener los datos del cliente:", error);
                hasEcommerce.value = false;
                return;
            }

            if (data) {
                hasEcommerce.value = data.has_ecommerce || false;
            } else {
                hasEcommerce.value = false;
            }
        } else {
            hasEcommerce.value = false;
        }
    } catch (error) {
        console.error("Error en la autenticación o al buscar datos:", error.message);
        hasEcommerce.value = false;
    }
};

onMounted(() => {
  window.addEventListener('toggle-mobile-sidebar', handleToggleMobile);
  window.addEventListener('resize', checkScreenSize);
  fetchClientData();
});

onUnmounted(() => {
  window.removeEventListener('toggle-mobile-sidebar', handleToggleMobile);
  window.removeEventListener('resize', checkScreenSize);
});
</script>

<style scoped>
/* No se necesitan cambios en el CSS */
.sidebar { 
  width: var(--sidebar-width);
  background-color: var(--color-bg-dark); 
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease-in-out, transform 0.3s ease-in-out;
  z-index: 30;
  box-sizing: border-box;
}

.sidebar-collapsed {
  width: var(--sidebar-collapsed-width);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3rem 0.75rem;
  background-color: var(--color-bg-accent); 
  height: var(--header-height); 
  box-sizing: border-box;
  flex-shrink: 0;
  border-bottom: 0px solid var(--color-border);
}

.sidebar-collapsed .sidebar-header {
  justify-content: center;
  padding: 1rem;
}

.logo {
  width: 230px;
  height: auto !important;
  transition: all 0.3s ease;
}

.collapse-btn {
  background: transparent;
  border: none;
  color: #ffffff;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0px;
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
  border-right: 0px solid var(--color-border);
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
  .sidebar { 
    transform: translateX(-100%); 
    width: 100vw; 
    max-width: 320px; 
    border-right: none; 
  }
  .sidebar-open-mobile { 
    transform: translateX(0); 
  }
  .sidebar-nav { 
    border-right: none; 
  }
}
</style>