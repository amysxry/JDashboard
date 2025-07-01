import { createApp } from 'vue'
import App from './App.vue'
// --- CORRECCIÓN ---
// Volvemos a la importación "nombrada" usando llaves {}, como lo tenías originalmente.
import { router } from './router'
// --- FIN DE LA CORRECCIÓN ---
import { MotionPlugin } from '@vueuse/motion'
import './style.css'

// 1. Crear la instancia de la aplicación.
const app = createApp(App)

// 2. Usar los plugins.
app.use(router)
app.use(MotionPlugin)

// 3. Montar la aplicación.
app.mount('#app')

// Los console.log para depuración
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_KEY)