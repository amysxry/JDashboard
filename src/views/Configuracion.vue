<template>
  <div class="settings-page-content">
    <main class="config-main">
      <section class="profile-card">
        
        <div class="card-header">
          <h2 class="card-title">Perfil de la Empresa</h2>
          <p class="card-subtitle">Actualiza la información y apariencia de tu perfil público.</p>
        </div>

        <div class="card-body">
          <div class="avatar-column">
            <div class="avatar-container">
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
              <label for="client-name-input" class="detail-label">Nombre de la Empresa</label>
              <input 
                id="client-name-input"
                type="text" 
                v-model="editableClientName" 
                class="profile-input" 
                :disabled="savingProfile"
                placeholder="Escribe el nombre de tu empresa"
              />
            </div>
            <div class="form-item">
              <label class="detail-label">Correo Electrónico</label>
              <p class="profile-input-static">{{ clientEmail }}</p>
            </div>
          </div>
        </div>

        <div class="card-footer">
          <button 
            @click="saveProfile" 
            class="save-profile-btn" 
            :disabled="savingProfile || !isProfileChanged"
          >
            <span v-if="!savingProfile">Guardar Cambios</span>
            <span v-else>Guardando...</span>
          </button>
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
  max-width: 1000px; /* Un poco más de espacio */
  margin: 0 auto;
  box-sizing: border-box;
}

.config-main {
  width: 100%;
}

/* Diseño de la Tarjeta de Perfil */
.profile-card {
  background: var(--color-bg-card);
  border-radius: 16px; /* Bordes más redondeados */
  border: 1px solid var(--color-border);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  overflow: hidden; /* Para que los bordes redondeados afecten a los hijos */
  display: flex;
  flex-direction: column;
}

.card-header, .card-body, .card-footer {
  padding: 2rem 2.5rem;
}

.card-header {
  border-bottom: 1px solid var(--color-border);
}
.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 0.25rem 0;
}
.card-subtitle {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.card-body {
  display: flex;
  gap: 3rem;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  background-color: rgba(0,0,0,0.1);
  border-top: 1px solid var(--color-border);
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
}

/* Columna del Avatar */
.avatar-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  flex-shrink: 0;
}
.avatar-container {
  width: 150px;
  height: 150px;
  position: relative;
}
.profile-photo, .profile-initials {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-main);
  border: 2px solid var(--color-border);
  box-shadow: 0 0 0 4px var(--color-bg-card); /* Efecto de separación */
  transition: all 0.3s ease;
}
.profile-initials {
  background-image: linear-gradient(45deg, var(--color-primary), #6aa800);
  color: #fff;
  font-size: 3.5rem;
  font-weight: 500;
}
.profile-initials.uploading {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-main);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.avatar-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
}

/* Columna del Formulario */
.form-column {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.form-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.detail-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}
.profile-input, .profile-input-static {
  width: 100%;
  padding: 0.8rem 1rem;
  background: var(--color-bg-main);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-primary);
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.profile-input::placeholder {
  color: var(--color-text-placeholder);
}
.profile-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.2);
}
.profile-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #222;
}
.profile-input-static {
  color: var(--color-text-secondary);
  cursor: not-allowed;
}

/* Botones */
.action-btn, .save-profile-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  font-size: 0.9rem;
  font-weight: 600;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative; /* Para el input de archivo */
}
.action-btn input[type="file"] {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  opacity: 0;
  cursor: pointer;
}
.action-btn .icon {
  width: 16px;
  height: 16px;
}

.action-btn.primary-action {
  background-color: var(--color-bg-main);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}
.action-btn.primary-action:hover:not(.disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.action-btn.danger-action {
  background-color: transparent;
  color: var(--color-danger);
}
.action-btn.danger-action:hover:not(:disabled) {
  background-color: rgba(255, 69, 58, 0.1);
}
.action-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}


.save-profile-btn {
  background-color: var(--color-primary);
  color: #000;
  padding: 0.75rem 2rem;
}
.save-profile-btn:hover:not([disabled]) {
  filter: brightness(1.1);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.2);
}
.save-profile-btn:disabled {
  background-color: var(--color-border);
  color: var(--color-text-placeholder);
  cursor: not-allowed;
}


/* Mensajes Toast (sin cambios en la lógica) */
.toast-message {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 1rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  color: #fff;
  z-index: 1000;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  min-width: 250px;
  text-align: center;
  animation: fadeInOut 4.5s forwards;
}
.toast-message.success { background-color: #34C759; }
.toast-message.error { background-color: var(--color-danger); }
@keyframes fadeInOut {
  0%, 100% { opacity: 0; transform: translateX(-50%) translateY(20px); }
  10%, 90% { opacity: 1; transform: translateX(-50%) translateY(0); }
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
    gap: 2rem;
  }
  .form-column {
    width: 100%;
  }
}

</style>