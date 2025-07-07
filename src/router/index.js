import { createRouter, createWebHistory } from 'vue-router'

// Vistas
import Login from '@/views/Login.vue'
import Dashboard from '@/views/Dashboard.vue'
import GA4 from '@/views/GA4.vue'
import Ads from '@/views/Ads.vue'
import WordPress from '@/views/WordPress.vue'
import Asana from '@/views/Asana.vue'
import Configuracion from '@/views/Configuracion.vue'
import Reports from '@/views/Reports.vue'; // Asumo que tienes esta vista

// Layout
import DashboardLayout from '@/components/DashboardLayout.vue';

const routes = [
  // Ruta de Login (sin layout)
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  // Rutas del Dashboard (con layout)
  {
    path: '/',
    component: DashboardLayout, // El layout es el componente padre
    children: [
      { path: 'dashboard', name: 'Dashboard', component: Dashboard, meta: { title: 'Dashboard Principal' } },
      { path: 'analytics', name: 'Analytics', component: GA4, meta: { title: 'Google Analytics 4' } },
      { path: 'ads', name: 'Ads', component: Ads, meta: { title: 'Google Ads' } },
      { path: 'wordpress', name: 'WordPress', component: WordPress, meta: { title: 'WordPress' } },
      { path: 'asana', name: 'Asana', component: Asana, meta: { title: 'Asana' } },
      { path: 'reports', name: 'Reports', component: Reports, meta: { title: 'Reportes' } }, // Su
      { path: 'config', name: 'Configuracion', component: Configuracion, meta: { title: 'Configuración' } },
      // Redirección por defecto: si alguien va a "/", lo mandas a "/dashboard"
      { path: '', redirect: '/dashboard' }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;