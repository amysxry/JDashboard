import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_KEY)

createApp(App).mount('#app')
