<template>
  <div class="reset-page">
    <div class="reset-container">
      <div class="reset-header">
        <img src="/logo-jdashboard.png" alt="JDashboard Logo" class="logo" />
        <h1 class="reset-title">Restablecer Contraseña</h1>
        <p class="reset-subtitle">Ingresa tu nueva contraseña para acceder a tu cuenta.</p>
      </div>

      <div v-if="!passwordUpdated" class="reset-form-container">
        <form @submit.prevent="handlePasswordUpdate" class="reset-form">
          <div class="input-group">
            <label for="new-password" class="input-label">Nueva Contraseña</label>
            <div class="password-wrapper">
              <input 
                id="new-password" 
                v-model="newPassword" 
                :type="passwordFieldType" 
                class="form-input" 
                placeholder="Mínimo 8 caracteres"
                minlength="8"
                required 
              />
              <button type="button" @click="togglePasswordVisibility" class="password-toggle-btn">
                <EyeOff v-if="passwordFieldType === 'password'" class="toggle-icon" />
                <Eye v-else class="toggle-icon" />
              </button>
            </div>
          </div>

          <div class="input-group">
            <label for="confirm-password" class="input-label">Confirmar Contraseña</label>
            <div class="password-wrapper">
              <input 
                id="confirm-password" 
                v-model="confirmPassword" 
                :type="confirmFieldType" 
                class="form-input" 
                placeholder="Repite tu nueva contraseña"
                minlength="8"
                required 
              />
              <button type="button" @click="toggleConfirmVisibility" class="password-toggle-btn">
                <EyeOff v-if="confirmFieldType === 'password'" class="toggle-icon" />
                <Eye v-else class="toggle-icon" />
              </button>
            </div>
          </div>
          
          <p v-if="error" class="error-message">{{ error }}</p>

          <button type="submit" class="reset-button" :disabled="loading">
            <span v-if="!loading">Actualizar Contraseña</span>
            <div v-else class="spinner"></div>
          </button>
        </form>
      </div>

      <div v-else class="success-container">
        <div class="success-icon">✅</div>
        <h2 class="success-title">¡Contraseña Actualizada!</h2>
        <p class="success-description">
          Tu contraseña ha sido cambiada exitosamente. 
          Ahora puedes iniciar sesión con tu nueva contraseña.
        </p>
        <button @click="goToLogin" class="login-redirect-btn">
          Ir al Inicio de Sesión
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useRoute } from 'vue-router';
import { Eye, EyeOff } from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();

const newPassword = ref('');
const confirmPassword = ref('');
const error = ref('');
const loading = ref(false);
const passwordUpdated = ref(false);
const passwordFieldType = ref('password');
const confirmFieldType = ref('password');

const togglePasswordVisibility = () => {
  passwordFieldType.value = passwordFieldType.value === 'password' ? 'text' : 'password';
};

const toggleConfirmVisibility = () => {
  confirmFieldType.value = confirmFieldType.value === 'password' ? 'text' : 'password';
};

const handlePasswordUpdate = async () => {
  error.value = '';

  // Validaciones
  if (newPassword.value.length < 8) {
    error.value = 'La contraseña debe tener al menos 8 caracteres.';
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Las contraseñas no coinciden.';
    return;
  }

  loading.value = true;

  try {
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword.value
    });

    if (updateError) {
      throw updateError;
    }

    passwordUpdated.value = true;
  } catch (err) {
    console.error('Error updating password:', err);
    
    if (err.message?.includes('session_not_found')) {
      error.value = 'Sesión expirada. Por favor, solicita un nuevo enlace de recuperación.';
    } else if (err.message?.includes('same_password')) {
      error.value = 'La nueva contraseña debe ser diferente a la anterior.';
    } else {
      error.value = 'Error al actualizar la contraseña. Intenta nuevamente.';
    }
  } finally {
    loading.value = false;
  }
};

const goToLogin = () => {
  router.push('/login');
};

// Verificar si el usuario tiene una sesión válida para cambiar contraseña
onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    // Si no hay sesión, redirigir al login
    router.push('/login');
  }
});
</script>

<style scoped>
/* Variables de Diseño */
:root {
  --color-primary: #92d000;
  --color-bg: #121212;
  --color-bg-panel: #1C1C1E;
  --color-border: #333333;
  --color-border-focus: var(--color-primary);
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #A0A0A0;
  --color-error: #E5484D;
  --color-success: #22c55e;
}

.reset-page {
  min-height: 100vh;
  background-color: var(--color-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--color-text-primary);
}

.reset-container {
  background-color: var(--color-bg-panel);
  border-radius: 16px;
  border: 1px solid var(--color-border);
  padding: 3rem;
  width: 100%;
  max-width: 450px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

/* --- Header --- */
.reset-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.logo {
  width: 60px;
  height: auto;
  margin-bottom: 1.5rem;
}

.reset-title {
  font-size: 2rem;
  font-weight: 600;
  margin: 0;
  color: var(--color-text-primary);
}

.reset-subtitle {
  color: var(--color-text-secondary);
  margin-top: 0.5rem;
  line-height: 1.5;
}

/* --- Formulario --- */
.reset-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.input-group {
  display: flex;
  flex-direction: column;
}

.input-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-input {
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.85rem 1rem;
  font-size: 1rem;
  color: var(--color-text-primary);
  width: 100%;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px rgba(146, 208, 0, 0.15);
}

.password-wrapper {
  position: relative;
}

.password-wrapper .form-input {
  padding-right: 3rem;
}

.password-toggle-btn {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  width: 3rem;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-icon {
  width: 20px;
  height: 20px;
  color: var(--color-text-secondary);
  transition: color 0.2s ease;
}

.password-toggle-btn:hover .toggle-icon {
  color: var(--color-text-primary);
}

/* --- Botón --- */
.reset-button {
  background-color: var(--color-primary);
  color: #000;
  font-weight: 600;
  padding: 0.85rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 1rem;
  transition: background-color 0.2s ease, transform 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
}

.reset-button:hover:not(:disabled) {
  background-color: #A8F000;
  transform: translateY(-2px);
}

.reset-button:disabled {
  background-color: var(--color-border);
  cursor: not-allowed;
  transform: none;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0, 0, 0, 0.3);
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* --- Mensajes --- */
.error-message {
  color: var(--color-error);
  text-align: center;
  font-size: 0.9rem;
  background-color: rgba(229, 72, 77, 0.1);
  border: 1px solid rgba(229, 72, 77, 0.3);
  border-radius: 8px;
  padding: 0.75rem;
  margin: -0.5rem 0;
}

/* --- Pantalla de Éxito --- */
.success-container {
  text-align: center;
}

.success-icon {
  font-size: 4rem;
  margin-bottom: 1.5rem;
}

.success-title {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--color-success);
  margin: 0 0 1rem 0;
}

.success-description {
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin-bottom: 2rem;
}

.login-redirect-btn {
  background-color: var(--color-primary);
  color: #000;
  font-weight: 600;
  padding: 0.85rem 2rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.login-redirect-btn:hover {
  background-color: #A8F000;
  transform: translateY(-2px);
}

/* --- Diseño Responsivo --- */
@media (max-width: 768px) {
  .reset-page {
    padding: 1rem;
  }
  
  .reset-container {
    padding: 2rem 1.5rem;
  }
  
  .reset-title {
    font-size: 1.6rem;
  }
}
</style>