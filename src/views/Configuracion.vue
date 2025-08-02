<template>
  <div class="settings-page-content">
    <main class="config-main">
      <section class="profile-card">
        <div class="card-header">
          <div class="card-title-container">
            <div class="title-section">
              <h2 class="card-title">Perfil</h2>
              <div class="title-underline"></div>
            </div>
          </div>
        </div>

        <div class="card-body">
          <div class="avatar-column">
            <div class="avatar-container">
              <div class="avatar-ring">
                <template v-if="profilePhotoUrl && !uploadingPhoto">
                  <img :src="profilePhotoUrl" alt="Foto de perfil" class="profile-photo" />
                </template>
                <template v-else-if="uploadingPhoto">
                  <div class="profile-initials uploading">
                    <div class="spinner"></div>
                  </div>
                </template>
                <template v-else>
                  <div class="profile-initials">{{ getInitials(clientName) }}</div>
                </template>
              </div>
            </div>
            <div class="avatar-actions">
              <label class="action-btn primary-action" :class="{ 'disabled': uploadingPhoto }">
                <Upload class="icon" />
                <input 
                  type="file" 
                  accept="image/*" 
                  @change="onPhotoChange" 
                  :disabled="uploadingPhoto" 
                />
                <span>{{ uploadingPhoto ? 'Subiendo...' : 'Cambiar foto' }}</span>
              </label>
              <button 
                v-if="profilePhotoUrl && !uploadingPhoto" 
                @click="removePhoto" 
                class="action-btn danger-action"
                :disabled="uploadingPhoto"
              >
                <Trash2 class="icon" />
                <span>Eliminar</span>
              </button>
            </div>
          </div>

          <div class="form-column">
            <div class="form-item">
              <div class="label-container">
                <label for="client-name-input" class="detail-label">Nombre de la Empresa</label>
              </div>
              <div class="input-wrapper">
                <input 
                  id="client-name-input"
                  type="text" 
                  v-model="editableClientName" 
                  class="profile-input" 
                  :disabled="savingProfile"
                  placeholder="Escribe el nombre de tu empresa"
                />
                <div class="input-focus-line"></div>
              </div>
            </div>
            <div class="form-item">
              <div class="label-container">
                <label class="detail-label">Correo Electrónico</label>
              </div>
              <div class="profile-input-static">
                <span class="email-text">{{ clientEmail }}</span>
                <div class="locked-badge">
                  <svg class="lock-icon" viewBox="0 0 24 24" fill="none">
                    <path d="M6 10V8C6 5.79086 7.79086 4 10 4H14C16.2091 4 18 5.79086 18 8V10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card-footer">
          <div class="save-section">
            <button 
              @click="saveProfile" 
              class="save-profile-btn" 
              :disabled="savingProfile || !isProfileChanged"
            >
              <span v-if="!savingProfile" class="btn-content">
                <svg class="save-icon" viewBox="0 0 24 24" fill="none">
                  <path d="M19 21H5C4.44772 21 4 20.5523 4 20V4C4 3.44772 4.44772 3 5 3H16L20 7V20C20 20.5523 19.5523 21 19 21Z" stroke="currentColor" stroke-width="2"/>
                  <path d="M7 3V8H15" stroke="currentColor" stroke-width="2"/>
                  <path d="M7 13H17" stroke="currentColor" stroke-width="2"/>
                </svg>
                Guardar Cambios
              </span>
              <span v-else class="btn-content">
                <div class="save-spinner"></div>
                Guardando...
              </span>
            </button>
          </div>
        </div>
      </section>

      <div v-if="successMessage" class="toast-message success">
        {{ successMessage }}
      </div>
      <div v-if="errorMessage" class="toast-message error">
        {{ errorMessage }}
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
// --- ÍCONOS PARA UNA MEJOR UI ---
import { Upload, Trash2 } from 'lucide-vue-next';

// --- El resto del script es idéntico, ya que la lógica no necesita cambios ---
const clientAuthId = ref(null);
const clientDbId = ref(null);
const clientName = ref('Cargando...');
const editableClientName = ref('');
const clientEmail = ref('');
const profilePhotoUrl = ref('');
const initialProfilePhotoUrl = ref('');
const uploadingPhoto = ref(false);
const savingProfile = ref(false);
const successMessage = ref('');
const errorMessage = ref('');
let messageTimeout = null;

const isProfileChanged = computed(() => {
  return editableClientName.value !== clientName.value || profilePhotoUrl.value !== initialProfilePhotoUrl.value;
});

function getInitials(name) {
  if (!name || name.trim() === '' || name === 'Cargando...') return '...';
  return name
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function showMessage(type, message) {
  clearTimeout(messageTimeout);
  if (type === 'success') {
    successMessage.value = message;
    errorMessage.value = '';
  } else {
    errorMessage.value = message;
    successMessage.value = '';
  }
  messageTimeout = setTimeout(() => {
    successMessage.value = '';
    errorMessage.value = '';
  }, 4000);
}

async function fetchClientProfile() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      clientName.value = 'Cliente';
      return;
    }
    clientAuthId.value = user.id;
    clientEmail.value = user.email || '';
    const { data, error } = await supabase.from('clientes').select('id, empresa, avatar_url').eq('auth_id', user.id).single();
    if (error && error.code !== 'PGRST116') throw error;
    if (data) {
      clientDbId.value = data.id;
      clientName.value = data.empresa || 'Cliente';
      editableClientName.value = data.empresa || 'Cliente';
      profilePhotoUrl.value = data.avatar_url || '';
      initialProfilePhotoUrl.value = data.avatar_url || '';
    }
  } catch (err) {
    showMessage('error', `Error al cargar perfil: ${err.message}`);
  }
}

async function onPhotoChange(event) {
  const file = event.target.files[0];
  if (!file) return;

  uploadingPhoto.value = true;
  try {
    if (!clientAuthId.value) throw new Error('ID de usuario no encontrado.');
    if (profilePhotoUrl.value) {
      const oldFilePath = profilePhotoUrl.value.split('/profile-pictures/')[1];
      if (oldFilePath) await supabase.storage.from('profile-pictures').remove([oldFilePath]);
    }
    const filePath = `${clientAuthId.value}/${uuidv4()}.${file.name.split('.').pop()}`;
    const { error: uploadError } = await supabase.storage.from('profile-pictures').upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from('profile-pictures').getPublicUrl(filePath);
    if (!publicUrl) throw new Error('No se pudo obtener la URL pública.');
    profilePhotoUrl.value = publicUrl;
    const { error: updateError } = await supabase.from('clientes').update({ avatar_url: publicUrl }).eq('auth_id', clientAuthId.value);
    if (updateError) throw updateError;
    initialProfilePhotoUrl.value = publicUrl;
    showMessage('success', 'Foto actualizada.');
  } catch (error) {
    showMessage('error', `Error al subir foto: ${error.message}`);
    profilePhotoUrl.value = initialProfilePhotoUrl.value;
  } finally {
    uploadingPhoto.value = false;
  }
}

async function removePhoto() {
  if (!confirm('¿Seguro que quieres eliminar tu foto de perfil?')) return;
  uploadingPhoto.value = true; // Re-utilizamos el estado para deshabilitar botones
  try {
    const filePath = profilePhotoUrl.value.split('/profile-pictures/')[1];
    if (filePath) await supabase.storage.from('profile-pictures').remove([filePath]);
    const { error } = await supabase.from('clientes').update({ avatar_url: null }).eq('auth_id', clientAuthId.value);
    if (error) throw error;
    profilePhotoUrl.value = '';
    initialProfilePhotoUrl.value = '';
    showMessage('success', 'Foto eliminada.');
  } catch (error) {
    showMessage('error', `Error al eliminar foto: ${error.message}`);
  } finally {
    uploadingPhoto.value = false;
  }
}

async function saveProfile() {
  if (!isProfileChanged.value) return;
  savingProfile.value = true;
  try {
    const { error } = await supabase.from('clientes').update({ empresa: editableClientName.value }).eq('auth_id', clientAuthId.value);
    if (error) throw error;
    clientName.value = editableClientName.value;
    showMessage('success', 'Perfil actualizado.');
  } catch (error) {
    showMessage('error', `Error al guardar: ${error.message}`);
  } finally {
    savingProfile.value = false;
  }
}

onMounted(fetchClientProfile);
onUnmounted(() => clearTimeout(messageTimeout));

</script>

<style scoped>
/* Variables de Diseño (ajusta estos colores para que coincidan con tu paleta) */
:root {
  --color-primary: #92d000;
  --color-primary-rgb: 146, 208, 0;
  --color-bg-main: #121212;
  --color-bg-card: #1C1C1E;
  --color-border: #2D2D2F;
  --color-text-primary: #EAEAEA;
  --color-text-secondary: #A0A0A0;
  --color-text-placeholder: #6E6E73;
  --color-danger: #FF453A;
}

.settings-page-content {
  padding: 1.5rem;
  width: 100%;
  box-sizing: border-box;
  background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
  min-height: 100vh;
}

.config-main {
  width: 100%;
}

/* Diseño de la Tarjeta de Perfil */
.profile-card {
  background: linear-gradient(135deg, #2a2a2a 0%, #323232 100%);
  border-radius: 1.5rem;
  border: 1px solid #404040;
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(10px);
}

.card-header {
  padding: 2rem 2.5rem 1.5rem 2.5rem;
  border-bottom: 1px solid #404040;
  background: linear-gradient(135deg, rgba(146, 208, 0, 0.05) 0%, transparent 100%);
}

.card-title-container {
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
}

.title-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.card-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
  letter-spacing: -0.025em;
}

.title-underline {
  width: 40px;
  height: 3px;
  background: linear-gradient(90deg, #92d000, #7bb500);
  border-radius: 2px;
}

.card-body {
  display: flex;
  gap: 4rem;
  padding: 2.5rem;
}

.avatar-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  flex-shrink: 0;
}

.avatar-container {
  position: relative;
  width: 140px;
  height: 140px;
}

.avatar-ring {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  padding: 4px;
  background: linear-gradient(45deg, white, white, white);
  background-size: 200% 200%;
  animation: gradientShift 3s ease-in-out infinite;
  position: relative;
}

@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.profile-photo, .profile-initials {
  width: calc(100% - 8px);
  height: calc(100% - 8px);
  border-radius: 50%;
  position: absolute;
  top: 4px;
  left: 4px;
  object-fit: cover;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.profile-initials {
  background: linear-gradient(135deg, #92d000, #7bb500);
  color: #1a1a1a;
  font-size: 2.75rem;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.profile-initials.uploading {
  background: linear-gradient(135deg, #404040, #4a4a4a);
}

.spinner {
  width: 36px;
  height: 36px;
  border: 4px solid #606060;
  border-top-color: #92d000;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.avatar-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 200px;
}

.form-column {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.label-container {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.detail-label {
  font-size: 0.95rem;
  font-weight: 600;
  color: #b3b3b3;
  letter-spacing: 0.025em;
}

.input-wrapper {
  position: relative;
}

.profile-input {
  width: 100%;
  padding: 1rem 1.25rem;
  background: linear-gradient(135deg, #3a3a3a 0%, #404040 100%);
  border: 2px solid #505050;
  border-radius: 0.75rem;
  color: #ffffff;
  font-size: 1.05rem;
  transition: all 0.3s ease;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

.profile-input::placeholder {
  color: #909090;
}

.profile-input:focus {
  outline: none;
  border-color: #92d000;
  box-shadow: 
    0 0 0 4px rgba(146, 208, 0, 0.2),
    inset 0 2px 4px rgba(0, 0, 0, 0.2);
  transform: translateY(-1px);
}

.input-focus-line {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, #92d000, #7bb500);
  transform: scaleX(0);
  transition: transform 0.3s ease;
  border-radius: 0 0 0.75rem 0.75rem;
}

.profile-input:focus + .input-focus-line {
  transform: scaleX(1);
}

.profile-input-static {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background: linear-gradient(135deg, #353535 0%, #3a3a3a 100%);
  border: 2px solid #454545;
  border-radius: 0.75rem;
  color: #b3b3b3;
  font-size: 1.05rem;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
}

.email-text {
  flex-grow: 1;
}

.locked-badge {
  display: flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 0.375rem;
  color: #909090;
}

.lock-icon {
  width: 14px;
  height: 14px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.75rem 1.25rem;
  border-radius: 0.75rem;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.action-btn input[type="file"] {
  position: absolute;
  top: 0; 
  left: 0; 
  width: 100%; 
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.action-btn .icon {
  width: 18px;
  height: 18px;
}

.action-btn.primary-action {
  background: linear-gradient(135deg, #404040 0%, #4a4a4a 100%);
  color: #ffffff;
  border: 2px solid #505050;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.action-btn.primary-action:hover:not(.disabled) {
  border-color: #92d000;
  background: linear-gradient(135deg, #4a4a4a 0%, #525252 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(146, 208, 0, 0.3);
}

.action-btn.danger-action {
  background: linear-gradient(135deg, rgba(255, 107, 107, 0.1) 0%, rgba(255, 107, 107, 0.05) 100%);
  color: #ff6b6b;
  border: 2px solid #ff6b6b;
}

.action-btn.danger-action:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(255, 107, 107, 0.2) 0%, rgba(255, 107, 107, 0.1) 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 107, 107, 0.3);
}

.card-footer {
  background: linear-gradient(135deg, #353535 0%, #3a3a3a 100%);
  border-top: 1px solid #454545;
  padding: 2rem 2.5rem;
}

.save-section {
  display: flex;
  justify-content: flex-end;
}

.save-profile-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  font-size: 1rem;
  font-weight: 700;
  padding: 1rem 2.5rem;
  border-radius: 0.875rem;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #92d000 0%, #7bb500 100%);
  color: #1a1a1a;
  box-shadow: 
    0 8px 24px rgba(146, 208, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  letter-spacing: 0.025em;
}

.btn-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.save-icon {
  width: 18px;
  height: 18px;
}

.save-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #1a1a1a;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.save-profile-btn:hover:not([disabled]) {
  background: linear-gradient(135deg, #7bb500 0%, #6aa000 100%);
  transform: translateY(-3px);
  box-shadow: 
    0 12px 32px rgba(146, 208, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.save-profile-btn:disabled {
  background: linear-gradient(135deg, #505050 0%, #555555 100%);
  color: #909090;
  cursor: not-allowed;
  box-shadow: none;
}

/* Mensajes Toast (sin cambios en la lógica) */
.toast-message {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 1.25rem 2rem;
  border-radius: 0.875rem;
  font-weight: 600;
  color: #fff;
  z-index: 1000;
  min-width: 300px;
  text-align: center;
  animation: toastSlideIn 0.5s ease-out;
  backdrop-filter: blur(10px);
}
.toast-message.success { 
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  box-shadow: 0 8px 24px rgba(34, 197, 94, 0.4);
}
.toast-message.error { 
  background: linear-gradient(135deg, #ff6b6b 0%, #ef4444 100%);
  box-shadow: 0 8px 24px rgba(255, 107, 107, 0.4);
}
@keyframes toastSlideIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(100px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
@keyframes spin { 
  to { transform: rotate(360deg); } 
}

/* --- ZONA RESPONSIVA --- */
@media (max-width: 768px) {
  .settings-page-content {
    padding: 1rem;
  }
  
  .card-header, .card-body, .card-footer {
    padding: 1.5rem;
  }
  
  .card-body {
    flex-direction: column;
    align-items: center;
    gap: 2.5rem;
  }
  
  .form-column {
    width: 100%;
  }
  
  .avatar-container {
    width: 120px;
    height: 120px;
  }
  
  .profile-initials {
    font-size: 2.25rem;
  }
  
  .page-title {
    font-size: 1.5rem;
  }
  
  .card-title {
    font-size: 1.25rem;
  }
}
</style>