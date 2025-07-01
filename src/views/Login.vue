<template>
  <div class="login-page">
    <div class="background-design"></div>

    <div class="login-container">

      <div class="login-box" v-motion="'popVisible'">
        <div class="logo-container">
          <img src="@/assets/logo-jdashboard.png" alt="JDashboard Logo" class="logo" />
        </div>
        
        <h2 class="form-title">Acceso al Panel</h2>
        <p class="form-subtitle">Bienvenido. Ingresa tus credenciales para continuar.</p>

        <form @submit.prevent="handleLogin" class="login-form">
          <div class="form-group" v-motion :initial="{ opacity: 0, y: 20 }" :enter="{ opacity: 1, y: 0, transition: { delay: 200 } }">
            <label for="email" class="form-label">Correo electrónico</label>
            <input id="email" v-model="email" type="email" placeholder="nombre@empresa.com" required class="form-input" />
          </div>
          <div class="form-group" v-motion :initial="{ opacity: 0, y: 20 }" :enter="{ opacity: 1, y: 0, transition: { delay: 300 } }">
            <label for="password" class="form-label">Contraseña</label>
            <input id="password" v-model="password" type="password" placeholder="••••••••" required class="form-input" />
          </div>
          <button type="submit" class="login-button" :disabled="loading" v-motion :initial="{ opacity: 0, y: 20 }" :enter="{ opacity: 1, y: 0, transition: { delay: 400 } }">
            <span v-if="!loading">Iniciar Sesión</span>
            <span v-else>Verificando...</span>
          </button>
        </form>
        
        <p v-if="error" class="error-message">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'vue-router';

// SE HA ELIMINADO POR COMPLETO Y PARA SIEMPRE CUALQUIER IMPORT DE @vueuse/motion.
// Esta era la causa del error. No se necesita.

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);
const router = useRouter();

const handleLogin = async () => {
  error.value = '';
  loading.value = true;
  try {
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    });
    if (loginError) throw loginError;
    router.push('/dashboard');
  } catch (err) {
    error.value = 'Correo o contraseña incorrectos.';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
@keyframes subtle-gradient-move {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.login-page {
  position: fixed; top: 0; left: 0; 
  width: 100vw; height: 100vh; 
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-dark);
  overflow: hidden;
}

.background-design {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: 
    radial-gradient(circle at 15% 25%, hsla(81, 100%, 50%, 0.1), transparent 35%),
    radial-gradient(circle at 85% 75%, hsla(24, 99%, 57%, 0.08), transparent 40%);
  animation: subtle-gradient-move 25s ease-in-out infinite;
}

.login-container {
  width: 100%;
  max-width: 480px;
  padding: 1rem;
  box-sizing: border-box;
  position: relative;
  z-index: 1;
}

.login-box {
  background: rgba(30, 30, 30, 0.6);
  padding: 2.5rem 3rem;
  border-radius: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.37);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.logo-container {
  text-align: center;
  margin-bottom: 1.5rem;
}

.logo {
  max-width: 160px;
  height: auto;
  filter: brightness(0) invert(1);
}

.form-title {
  text-align: center;
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 0.5rem;
}

.form-subtitle {
  text-align: center;
  font-size: 1rem;
  color: var(--color-text-secondary);
  margin-bottom: 2.5rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
}

.form-input {
  width: 100%;
  padding: 0.875rem 1rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-md);
  font-size: 1rem;
  color: #ffffff;
  transition: var(--transition-fast);
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(146, 208, 0, 0.25);
}

.login-button {
  background: var(--color-primary);
  color: var(--color-bg-dark);
  padding: 1rem;
  border: none;
  border-radius: var(--border-radius-md);
  font-size: 1rem;
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  transition: var(--transition-fast);
  margin-top: 1rem;
}

.login-button:hover:not(:disabled) {
  background: var(--color-primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(146, 208, 0, 0.2);
}

.login-button:disabled {
  background: #555;
  cursor: not-allowed;
  opacity: 0.8;
}

.error-message {
  color: var(--color-error);
  text-align: center;
  margin-top: 1.5rem;
  font-size: 0.9rem;
  padding: 0.75rem;
  background: rgba(229, 62, 62, 0.1);
  border-radius: var(--border-radius-md);
}

@media (max-width: 480px) {
  .login-box {
    padding: 2rem 1.5rem;
  }
}
</style>