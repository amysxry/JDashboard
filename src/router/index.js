import { createRouter, createWebHistory } from 'vue-router'
import Login from '@/views/Login.vue'
import Dashboard from '@/views/Dashboard.vue'
import GA4 from '@/views/GA4.vue'
import Ads from '@/views/Ads.vue'
import WordPress from '@/views/WordPress.vue'
import Asana from '@/views/Asana.vue'
import Configuracion from '@/views/configuracion.vue'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: Login },
  { path: '/dashboard', component: Dashboard },
  { path: '/analytics', component: GA4 },
  { path: '/ads', component: Ads },
  { path: '/wordpress', component: WordPress },
  { path: '/asana', component: Asana },
  { path: '/config', component: Configuracion }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})
