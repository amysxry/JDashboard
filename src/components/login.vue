<template>
  <div class="min-h-screen flex items-center justify-center bg-[#1e1e1e] text-white">
    <div class="bg-[#5a7d16] p-8 rounded-2xl shadow-xl w-full max-w-md">
      <h2 class="text-2xl font-bold mb-6 text-center text-white">Iniciar sesión</h2>
      <form @submit.prevent="handleLogin">
        <input v-model="email" type="email" placeholder="Correo electrónico" class="input" />
        <button type="submit" class="btn">Entrar</button>
      </form>
      <p v-if="error" class="text-red-400 mt-2">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '@/supabase.js'
import { useRouter } from 'vue-router'

const email = ref('')
const error = ref(null)
const router = useRouter()

const handleLogin = async () => {
  error.value = null
  const { data, error: loginError } = await supabase.auth.signInWithOtp({ email: email.value })
  if (loginError) {
    error.value = 'Error al enviar el link de acceso.'
  } else {
    alert('Revisa tu correo y haz clic en el enlace para continuar.')
  }
}
</script>

<style scoped>
.input {
  @apply w-full p-2 mb-4 rounded bg-white text-black focus:outline-none;
}
.btn {
  @apply w-full bg-[#92d000] text-black font-semibold py-2 rounded hover:bg-[#5a7d16] transition;
}
</style>
