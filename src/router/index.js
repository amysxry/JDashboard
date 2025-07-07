import { createRouter, createWebHistory } from 'vue-router';
import { supabase } from '@/lib/supabaseClient'; // Asegúrate que la ruta a tu cliente de supabase sea correcta

// Vistas
import Login from '@/views/Login.vue'
import Dashboard from '@/views/Dashboard.vue'
import GA4 from '@/views/GA4.vue'
import Ads from '@/views/Ads.vue'
import WordPress from '@/views/WordPress.vue'
import Asana from '@/views/Asana.vue'
import Configuracion from '@/views/Configuracion.vue'
import Reports from '@/views/Reports.vue';

// Layout
import DashboardLayout from '@/components/DashboardLayout.vue';

const routes = [
  // Ruta de Login (pública)
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresAuth: false } // No requiere autenticación
  },
  // Rutas del Dashboard (protegidas)
  {
    path: '/',
    component: DashboardLayout, // El layout es el componente padre
    meta: { requiresAuth: true }, // ESTO PROTEGE A TODAS LAS RUTAS HIJAS
    children: [
      { path: 'dashboard', name: 'Dashboard', component: Dashboard, meta: { title: 'Dashboard Principal' } },
      { path: 'analytics', name: 'Analytics', component: GA4, meta: { title: 'Google Analytics 4' } },
      { path: 'ads', name: 'Ads', component: Ads, meta: { title: 'Google Ads' } },
      { path: 'wordpress', name: 'WordPress', component: WordPress, meta: { title: 'WordPress' } },
      { path: 'asana', name: 'Asana', component: Asana, meta: { title: 'Asana' } },
      { path: 'reports', name: 'Reports', component: Reports, meta: { title: 'Reportes' } },
      { path: 'config', name: 'Configuracion', component: Configuracion, meta: { title: 'Configuración' } },
      // Redirección por defecto: si alguien va a "/", lo mandas a "/login"
      { path: '', redirect: '/login' }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// --- GUARDIA DE NAVEGACIÓN GLOBAL ---
router.beforeEach(async (to, from, next) => {
  const { data: { session } } = await supabase.auth.getSession();
  const requiresAuth = to.meta.requiresAuth;

  // Si la ruta requiere autenticación y no hay sesión, redirige a login
  if (requiresAuth && !session) {
    next('/login');
  } 
  // Si el usuario intenta ir a login pero ya tiene sesión, redirige al dashboard
  else if (to.path === '/login' && session) {
    next('/dashboard');
  } 
  // En cualquier otro caso, permite la navegación
  else {
    next();
  }
});


export default router;