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
import Reports from '@/views/Reports.vue';
import AdminPanel from '@/views/AdminPanel.vue';

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
      { path: 'reports', name: 'Reports', component: Reports, meta: { title: 'Reportes' } },
      { path: 'config', name: 'Configuracion', component: Configuracion, meta: { title: 'Configuración' } },
      { path: 'admin', name: 'AdminPanel', component: AdminPanel, meta: { title: 'Admin' } }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// --- GUARDIA DE NAVEGACIÓN CORREGIDA ---
router.beforeEach(async (to, from, next) => {
  const { data: { session, user } } = await supabase.auth.getSession();
  const adminEmail = 'amysaraimr@gmail.com';

  // Regla 1: Si un usuario autenticado intenta ir a /login, lo redirige.
  if (to.path === '/login' && session) {
    // Si el usuario es el admin, lo envía a /admin.
    if (user && user.email === adminEmail) {
      next('/admin');
    } else {
      // Si no es el admin, lo envía a su dashboard.
      next('/dashboard');
    }
    return;
  }

  // Regla 2: Proteger las rutas que requieren autenticación.
  if (to.meta.requiresAuth && !session) {
    next('/login');
    return;
  }

  // Regla 3: Permitir el acceso al panel de administración solo al admin.
  if (to.name === 'AdminPanel') {
    if (user && user.email === adminEmail) {
      next(); // Permite el acceso.
    } else {
      next('/dashboard'); // Si no es admin, lo redirige.
    }
    return;
  }

  // Permitir la navegación si ninguna de las reglas anteriores aplica.
  next();
});

export default router;