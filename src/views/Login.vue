<template>
  <div class="login-page">
    <div class="branding-panel">
      <div class="branding-content">
        <img src="/logo-jdashboard.png" alt="JDashboard Logo" class="logo" />
        <h1 class="brand-title">JDashboard</h1>
        <p class="brand-subtitle">Tu centro de control digital</p>
      </div>
    </div>

    <div class="form-panel">
      <div class="form-container">
        <!-- Branding móvil -->
        <div class="mobile-branding">
          <img src="/logo-jdashboard.png" alt="JDashboard Logo" class="mobile-logo" />
          <h1 class="mobile-brand-title">JDashboard</h1>
        </div>
        
        <div class="form-header">
          <h2 class="form-title">Iniciar Sesión</h2>
          <p class="form-subtitle">Ingresa tus credenciales para acceder a tu panel.</p>
        </div>

        <form @submit.prevent="handleLogin" class="login-form">
          <div class="input-group">
            <label for="email" class="input-label">Correo Electrónico</label>
            <input 
              id="email" 
              v-model="email" 
              type="email" 
              class="form-input" 
              required 
            />
          </div>
          
          <div class="input-group">
            <label for="password" class="input-label">Contraseña</label>
            <div class="password-wrapper">
              <input 
                id="password" 
                v-model="password" 
                :type="passwordFieldType" 
                class="form-input" 
                required 
              />
              <button type="button" @click="togglePasswordVisibility" class="password-toggle-btn">
                <EyeOff v-if="passwordFieldType === 'password'" class="toggle-icon" />
                <Eye v-else class="toggle-icon" />
              </button>
            </div>
          </div>
          
          <p v-if="error" class="error-message">{{ error }}</p>

          <button type="submit" class="login-button" :disabled="loading">
            <span v-if="!loading">Acceder</span>
            <div v-else class="spinner"></div>
          </button>
        </form>

        <div class="recovery-link">
          <button 
            type="button" 
            @click="showPasswordRecovery" 
            class="forgot-password-btn"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de Recuperación de Contraseña -->
    <div v-if="showRecoveryForm" class="recovery-modal-overlay" @click="hidePasswordRecovery">
      <div class="recovery-modal" @click.stop>
        <div class="recovery-header">
          <h3 class="recovery-title">Recuperar Contraseña</h3>
          <button @click="hidePasswordRecovery" class="close-btn">
            ✕
          </button>
        </div>

        <div class="recovery-content">
          <p class="recovery-description">
            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
          </p>

          <form @submit.prevent="handlePasswordRecovery" class="recovery-form">
            <div class="input-group">
              <label for="recovery-email" class="input-label">Correo Electrónico</label>
              <input 
                id="recovery-email"
                v-model="emailRecovery" 
                type="email" 
                class="form-input" 
                placeholder="tu@email.com"
                required 
              />
            </div>
            
            <p v-if="recoveryError" class="error-message">{{ recoveryError }}</p>
            
            <div v-if="recoverySuccess" class="success-message">
              ✅ Se ha enviado un enlace de recuperación a tu correo electrónico. 
              Revisa tu bandeja de entrada y sigue las instrucciones.
            </div>

            <button 
              type="submit" 
              class="recovery-button" 
              :disabled="recoveryLoading || recoverySuccess"
            >
              <span v-if="!recoveryLoading">{{ recoverySuccess ? 'Enlace Enviado' : 'Enviar Enlace' }}</span>
              <div v-else class="spinner"></div>
            </button>
          </form>

          <div class="recovery-footer">
            <button @click="hidePasswordRecovery" class="back-to-login-btn">
              Volver al inicio de sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'vue-router';
import { Eye, EyeOff } from 'lucide-vue-next';

// La lógica del script no cambia, es la misma que ya tenías.
const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);
const router = useRouter();
const passwordFieldType = ref('password');

// Estados para recuperación de contraseña
const showRecoveryForm = ref(false);
const emailRecovery = ref('');
const recoveryError = ref('');
const recoveryLoading = ref(false);
const recoverySuccess = ref(false);

const togglePasswordVisibility = () => {
  passwordFieldType.value = passwordFieldType.value === 'password' ? 'text' : 'password';
};

const showPasswordRecovery = () => {
  showRecoveryForm.value = true;
  recoveryError.value = '';
  recoverySuccess.value = false;
  emailRecovery.value = '';
};

const hidePasswordRecovery = () => {
  showRecoveryForm.value = false;
  recoveryError.value = '';
  recoverySuccess.value = false;
  emailRecovery.value = '';
};

const handleLogin = async () => {
  error.value = '';
  loading.value = true;
  try {
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    });
    if (loginError) throw loginError;
    router.push('/dashboard');
  } catch (err) {
    error.value = 'Las credenciales no son correctas.';
  } finally {
    loading.value = false;
  }
};

const handlePasswordRecovery = async () => {
  if (!emailRecovery.value) {
    recoveryError.value = 'Por favor, ingresa tu correo electrónico.';
    return;
  }

  recoveryError.value = '';
  recoveryLoading.value = true;
  recoverySuccess.value = false;

  try {
    const redirectUrl = `${window.location.origin}/reset-password`;
    
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      emailRecovery.value,
      {
        redirectTo: redirectUrl
      }
    );

    if (resetError) {
      throw resetError;
    }

    recoverySuccess.value = true;
    recoveryError.value = '';
  } catch (err) {
    console.error('Error al enviar correo de recuperación:', err);
    
    if (err.message?.includes('Email not confirmed')) {
      recoveryError.value = 'El correo electrónico no ha sido confirmado. Verifica tu bandeja de entrada.';
    } else if (err.message?.includes('User not found')) {
      recoveryError.value = 'No existe una cuenta asociada a este correo electrónico.';
    } else {
      recoveryError.value = 'Error al enviar el correo. Por favor, intenta nuevamente.';
    }
  } finally {
    recoveryLoading.value = false;
  }
};
</script>

<style scoped>
/* Variables de Diseño Minimalista */
:root {
  --color-primary: #92d000;
  --color-bg: #121212;
  --color-bg-panel: #1C1C1E;
  --color-border: #333333;
  --color-border-focus: var(--color-primary);
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #A0A0A0;
  --color-error: #E5484D;
}

.login-page {
  display: flex;
  width: 100vw;
  height: 100vh;
  background-color: var(--color-bg);
  color: var(--color-text-primary);
}

/* --- Panel de Branding (Izquierda) --- */
.branding-panel {
  width: 45%;
  background-color: var(--color-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
}

.branding-content {
  text-align: center;
}

.logo {
  width: 80px;
  height: auto;
  margin-bottom: 1.5rem;
}

.brand-title {
  font-size: 2.5rem;
  font-weight: 600;
  margin: 0;
}

.brand-subtitle {
  font-size: 1.1rem;
  color: var(--color-text-secondary);
  margin-top: 0.5rem;
  font-weight: 300;
}

/* --- Panel del Formulario (Derecha) --- */
.form-panel {
  width: 55%;
  background-color: var(--color-bg-panel);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
}

.form-container {
  width: 100%;
  max-width: 400px;
}

.form-header {
  margin-bottom: 2.5rem;
}

.form-title {
  font-size: 2rem;
  font-weight: 600;
  margin: 0;
}

.form-subtitle {
  color: var(--color-text-secondary);
  margin-top: 0.5rem;
}

/* --- Formulario --- */
.login-form {
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
  padding-right: 3rem; /* Espacio para el botón */
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

/* --- Botón de Login --- */
.login-button {
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
  min-height: 48px; /* Altura fija para evitar saltos con el spinner */
}

.login-button:hover:not(:disabled) {
  background-color: #A8F000; /* Un verde un poco más brillante */
  transform: translateY(-2px);
}

.login-button:disabled {
  background-color: var(--color-border);
  cursor: not-allowed;
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

/* --- Mensaje de Error --- */
.error-message {
  color: var(--color-error);
  text-align: center;
  font-size: 0.9rem;
  margin-top: -0.5rem; /* Lo coloca entre los campos y el botón */
  margin-bottom: -0.5rem;
}

/* --- Mensaje de Éxito --- */
.success-message {
  background-color: rgba(146, 208, 0, 0.1);
  color: var(--color-primary);
  border: 1px solid rgba(146, 208, 0, 0.3);
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  font-size: 0.9rem;
  line-height: 1.4;
  margin: 0.5rem 0;
}

/* --- Enlace de Recuperación --- */
.recovery-link {
  text-align: center;
  margin-top: 1.5rem;
}

.forgot-password-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: 0.9rem;
  cursor: pointer;
  text-decoration: underline;
  transition: color 0.2s ease;
}

.forgot-password-btn:hover {
  color: #A8F000;
}

/* --- Modal de Recuperación de Contraseña --- */
.recovery-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.recovery-modal {
  background-color: var(--color-bg-panel);
  border-radius: 12px;
  border: 1px solid var(--color-border);
  width: 100%;
  max-width: 450px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.recovery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 1.5rem 0 1.5rem;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 1.5rem;
}

.recovery-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.close-btn:hover {
  background-color: var(--color-border);
  color: var(--color-text-primary);
}

.recovery-content {
  padding: 0 1.5rem 1.5rem 1.5rem;
}

.recovery-description {
  color: var(--color-text-secondary);
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.recovery-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.recovery-button {
  background-color: var(--color-primary);
  color: #000;
  font-weight: 600;
  padding: 0.85rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
}

.recovery-button:hover:not(:disabled) {
  background-color: #A8F000;
  transform: translateY(-1px);
}

.recovery-button:disabled {
  background-color: var(--color-border);
  cursor: not-allowed;
  transform: none;
}

.recovery-footer {
  text-align: center;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.back-to-login-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0.5rem;
  transition: color 0.2s ease;
}

.back-to-login-btn:hover {
  color: var(--color-text-primary);
}

/* --- Branding Móvil --- */
.mobile-branding {
  display: none;
  text-align: center;
  margin-bottom: 2.5rem;
}

.mobile-logo {
  width: 70px;
  height: auto;
  margin-bottom: 1rem;
}

.mobile-brand-title {
  font-size: 2.2rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

/* --- Diseño Responsivo --- */
@media (max-width: 768px) {
  .login-page {
    flex-direction: column;
  }
  .branding-panel {
    display: none;
  }
  .mobile-branding {
    display: block;
  }
  .form-panel {
    width: 100%;
    height: 100vh;
    justify-content: center;
    padding: 2rem 1rem;
  }
  
  .recovery-modal {
    margin: 1rem;
    max-width: none;
  }
  
  .recovery-header,
  .recovery-content {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}

</style>