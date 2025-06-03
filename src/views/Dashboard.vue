<template>
  <div class="min-h-screen bg-[#f4f4f4] text-[#1e1e1e]">
    <header class="bg-[#92d000] p-4 shadow-md flex justify-between items-center">
      <h1 class="text-xl font-bold">JDashboard</h1>
      <button @click="logout" class="bg-[#fe7529] text-white px-4 py-2 rounded-lg hover:bg-[#d85e20] transition">Salir</button>
    </header>

    <main class="p-6">
      <h2 class="text-2xl mb-4">¡Bienvenido al panel!</h2>
      <p>Este es tu dashboard inicial. Pronto verás aquí tus KPIs y módulos activos.</p>
    </main>
  </div>
</template>

<script setup>
import { supabase } from '@/supabase.js'
import { useRouter } from 'vue-router'

const router = useRouter()

const logout = async () => {
  await supabase.auth.signOut()
  router.push('/login')
}
</script>
