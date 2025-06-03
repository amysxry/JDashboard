<template>
  <div class="login-page">
    <div class="background-design"></div>
    <div class="login-container">
      <div class="login-box">
        <div class="logo-container">
          <img src="@/assets/Logo-JDigital-black.png" alt="JDigital" class="logo" />
        </div>
        <form @submit.prevent="handleLogin" class="login-form">
          <div class="form-group">
            <label for="email" class="form-label">Correo electrónico</label>
            <input 
              id="email"
              v-model="email" 
              type="email" 
              placeholder="nombre@empresa.com" 
              required 
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label for="password" class="form-label">Contraseña</label>
            <input 
              id="password"
              v-model="password" 
              type="password" 
              placeholder="••••••••" 
              required 
              class="form-input"
            />
          </div>
          <button type="submit" class="login-button">
            Iniciar Sesión
          </button>
        </form>
        <p v-if="error" class="error">{{ error }}</p>
      </div>
    </div>
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
.login-page {
  position: fixed; /* para que siempre esté pegado y cubra todo */
  top: 0; 
  left: 0; 
  width: 100vw; 
  height: 100vh; 
  background-color: #1e1e1e;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  z-index: 0;
}
.background-design {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 20% 20%, rgba(90, 125, 22, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(146, 208, 0, 0.1) 0%, transparent 50%);
  z-index: 0;
}

.login-container {
  width: 100%;
  max-width: 460px;
  margin: 2rem auto;
  position: relative;
  z-index: 1;
  padding: 0 1rem; /* Padding para que el login no pegue a los bordes */
  box-sizing: border-box;
}


.login-box {
  background: rgba(255, 255, 255, 0.02);
  padding: 3rem;
  border-radius: 24px;
  box-shadow: 
    0 4px 24px -1px rgba(0, 0, 0, 0.2),
    0 0 1px 0 rgba(255, 255, 255, 0.1) inset;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.logo-container {
  text-align: center;
  margin-bottom: 3rem;
  position: relative;
}

.logo {
  max-width: 180px;
  height: auto;
  filter: brightness(0) invert(1);
  opacity: 0.95;
  transition: all 0.3s ease;
}

.logo:hover {
  opacity: 1;
  transform: scale(1.02);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  position: relative;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.875rem;
  font-weight: 500;
}

.form-input {
  width: 100%;
  padding: 0.875rem 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  font-size: 1rem;
  color: #ffffff;
  transition: all 0.3s ease;
}

.form-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.form-input:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(146, 208, 0, 0.3);
}

.form-input:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.07);
  border-color: #92d000;
  box-shadow: 0 0 0 4px rgba(146, 208, 0, 0.15);
}

.login-button {
  background: #92d000;
  color: #ffffff;
  padding: 1rem;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  margin-top: 0.5rem;
}

.login-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.1), transparent);
  transform: translateX(-100%);
  transition: transform 0.6s ease;
}

.login-button:hover {
  background: #5a7d16;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(146, 208, 0, 0.2);
}

.login-button:hover::before {
  transform: translateX(100%);
}

.login-button:active {
  transform: translateY(0);
}

.error {
  color: #ff4444;
  text-align: center;
  margin-top: 1rem;
  font-size: 0.875rem;
  padding: 0.75rem;
  background: rgba(255, 68, 68, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

/* Responsive */

@media (max-width: 640px) {
  .login-container {
    margin: 1rem auto;
    padding: 0 1rem;
  }

  .login-box {
    padding: 2rem;
    border-radius: 20px;
  }
  
  .logo {
    max-width: 140px;
  }
  
  .form-input, .login-button {
    padding: 0.75rem;
  }
}

@media (max-width: 380px) {
  .login-box {
    padding: 1.5rem;
  }
  
  .logo {
    max-width: 120px;
  }
}

/* Para pantallas muy pequeñas */
@media (max-width: 320px) {
  .login-box {
    padding: 1rem 1.25rem;
    border-radius: 16px;
  }
  
  .form-label {
    font-size: 0.8rem;
  }
  
  .form-input {
    font-size: 0.9rem;
    padding: 0.65rem 0.8rem;
  }
  
  .login-button {
    font-size: 0.9rem;
    padding: 0.85rem;
  }
}

/* Desktop ancho mayor */
@media (min-width: 1024px) {
  .login-container {
    max-width: 460px;
    margin: 3rem auto;
  }
}

/* Logo más pequeño en móvil */
@media (max-width: 640px) {
  .logo {
    max-width: 120px;
  }
}
</style>
