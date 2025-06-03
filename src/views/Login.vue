<template>
  <div class="login-container">
    <h1>JDashboard</h1>
    <form @submit.prevent="handleLogin">
      <input v-model="email" type="email" placeholder="Correo" required />
      <input v-model="password" type="password" placeholder="Contraseña" required />
      <button type="submit">Ingresar</button>
    </form>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '@/supabase'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const error = ref('')
const router = useRouter()

const handleLogin = async () => {
  error.value = ''
  const { data, error: loginError } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value
  })
  if (loginError) {
    error.value = loginError.message
  } else {
    router.push('/dashboard')
  }
}
</script>

<style scoped>
.login-container {
  max-width: 400px;
  margin: auto;
  padding: 2rem;
  text-align: center;
}
input, button {
  display: block;
  width: 100%;
  margin: 1rem 0;
  padding: 0.5rem;
  border-radius: 0.5rem;
}
button {
  background-color: #92d000;
  color: #fff;
  border: none;
}
.error {
  color: red;
}
</style>
