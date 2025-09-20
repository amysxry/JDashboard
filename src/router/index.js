import { createRouter, createWebHistory } from 'vue-router';
import { supabase } from '@/lib/supabaseClient';

// Vistas
import Login from '@/views/Login.vue';
import Dashboard from '@/views/Dashboard.vue';
import GA4 from '@/views/GA4.vue';
import Ads from '@/views/Ads.vue';
import WordPress from '@/views/WordPress.vue';
import Asana from '@/views/Asana.vue';
import Configuracion from '@/views/Configuracion.vue';

// Layout
import DashboardLayout from '@/components/DashboardLayout.vue';

const routes = [
  // Rutas públicas
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresAuth: false }
  },
  // Rutas protegidas (por autenticación)
  {
    path: '/',
    component: DashboardLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: 'dashboard' },
      { path: 'dashboard', name: 'Dashboard', component: Dashboard, meta: { title: 'ㅤ' } },
      { path: 'analytics', name: 'Analytics', component: GA4, meta: { title: 'Google Analytics 4' } },
      { path: 'ads', name: 'Ads', component: Ads, meta: { title: 'Google Ads' } },
      { path: 'wordpress', name: 'WordPress', component: WordPress, meta: { title: 'WordPress' } },
      { path: 'asana', name: 'Asana', component: Asana, meta: { title: 'Asana' } },
      { path: 'config', name: 'Configuracion', component: Configuracion, meta: { title: 'Configuración' } }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Guard de navegación simple
router.beforeEach(async (to, from, next) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Si la ruta requiere autenticación y no hay sesión, redirigir a login
    if (to.meta.requiresAuth && !session) {
      next('/login');
      return;
    }
    
    // Si hay sesión y trata de ir a login, redirigir a dashboard
    if (to.path === '/login' && session) {
      next('/dashboard');
      return;
    }
    
    // Permitir navegación normal
    next();
  } catch (error) {
    console.error('Error en router guard:', error);
    next();
  }
});

export default router;