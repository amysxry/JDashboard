<template>
  <div class="config-layout">
    <SidebarMenu 
      v-model:collapsed="isSidebarCollapsed" 
      :isMobile="isMobile" 
      @update:collapsed="handleSidebarCollapse"
    />

    <div 
      :class="[
        'main-content',
        { 
          'ml-[280px]': !isSidebarCollapsed && !isMobile, /* Sidebar expandido en desktop */
          'ml-[80px]': isSidebarCollapsed && !isMobile,  /* Sidebar colapsado en desktop */
          'ml-0': isMobile /* Sin margen izquierdo en móvil, ya que es un overlay */
        }
      ]"
    >
      <header class="page-header">
        <h1 class="page-title">Configuración</h1>
      </header>
      <main class="config-main">
        <section class="profile-section card-style">
          <h2 class="section-title">Perfil del Cliente</h2>
          <div class="profile-content">
            <div class="profile-photo-container">
              <template v-if="profilePhotoUrl && !uploadingPhoto">
                <img :src="profilePhotoUrl" alt="Foto de perfil" class="profile-photo" />
              </template>
              <template v-else-if="uploadingPhoto">
                <div class="profile-initials uploading">Cargando...</div>
              </template>
              <template v-else>
                <div class="profile-initials">{{ getInitials(clientName) }}</div>
              </template>

              <label class="photo-upload-btn" :class="{ 'uploading-btn': uploadingPhoto }">
                <input 
                  type="file" 
                  accept="image/*" 
                  @change="onPhotoChange" 
                  :disabled="uploadingPhoto" 
                />
                <span v-if="!uploadingPhoto">Cambiar foto</span>
                <span v-else>Subiendo...</span>
              </label>
              <button 
                v-if="profilePhotoUrl && !uploadingPhoto" 
                @click="removePhoto" 
                class="remove-photo-btn"
                :disabled="uploadingPhoto"
              >
                Eliminar foto
              </button>
            </div>
            <div class="profile-details">
              <div class="profile-item">
                <label for="client-name-input" class="detail-label">Nombre de la Empresa</label>
                <input 
                  id="client-name-input"
                  type="text" 
                  v-model="editableClientName" 
                  class="profile-input" 
                  :disabled="savingProfile"
                />
              </div>
              <div class="profile-item">
                <label class="detail-label">Correo Electrónico</label>
                <p class="profile-email">{{ clientEmail }}</p>
              </div>
              <button 
                @click="saveProfile" 
                class="save-profile-btn" 
                :disabled="savingProfile || !isProfileChanged"
              >
                <span v-if="!savingProfile">Guardar Cambios</span>
                <span v-else>Guardando...</span>
              </button>
            </div>
          </div>
        </section>

        <section class="theme-section card-style">
          <h2 class="section-title">Color principal de la aplicación</h2>
          <div class="theme-options">
            <label v-for="color in themeColors" :key="color.value" class="theme-radio">
              <input
                type="radio"
                name="theme"
                :value="color.value"
                v-model="selectedTheme"
                @change="changeTheme"
              />
              <span :style="{ background: color.value }" class="theme-color"></span>
              <span class="theme-label">{{ color.label }}</span>
            </label>
          </div>
        </section>

        <section class="notifications-section card-style">
          <h2 class="section-title">Notificaciones</h2>
          <div class="notification-settings">
            <label class="toggle-switch">
              <input type="checkbox" v-model="receiveEmailNotifications">
              <span class="slider"></span>
            </label>
            <span class="toggle-label">Recibir notificaciones por correo electrónico</span>
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
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed, onUnmounted } from 'vue'
import SidebarMenu from '@/components/SidebarMenu.vue'
import { supabase } from '@/lib/supabaseClient'
import { v4 as uuidv4 } from 'uuid'; // Importar UUID para nombres de archivo únicos

// --- Estado de la aplicación ---
const isSidebarCollapsed = ref(true); // Estado inicial del sidebar (colapsado por defecto)
const isMobile = ref(false); // Estado para detectar si es una pantalla móvil

const clientAuthId = ref(null); // ID de autenticación de Supabase del usuario actual
const clientDbId = ref(null); // ID de la tabla 'clientes' del usuario actual

const clientName = ref('Cargando...'); // Nombre real de la empresa del cliente
const editableClientName = ref(''); // Nombre de la empresa editable en el formulario
const clientEmail = ref(''); // Email del usuario autenticado
const profilePhotoUrl = ref(''); // URL de la foto de perfil en Supabase Storage
const initialProfilePhotoUrl = ref(''); // Para detectar cambios en la foto

const uploadingPhoto = ref(false); // Estado para la subida de foto
const savingProfile = ref(false); // Estado para guardar cambios en el perfil

const selectedTheme = ref(localStorage.getItem('themeColor') || '#92d000');
const themeColors = [
  { label: 'Verde', value: '#92d000' },
  { label: 'Naranja', value: '#fe7529' },
  { label: 'Azul', value: '#3B82F6' },
  { label: 'Morado', value: '#8B5CF6' }
];

const receiveEmailNotifications = ref(true); // Ejemplo de otra configuración

const successMessage = ref('');
const errorMessage = ref('');
let messageTimeout = null;

// --- Propiedades Computadas ---
const isProfileChanged = computed(() => {
  return editableClientName.value !== clientName.value || profilePhotoUrl.value !== initialProfilePhotoUrl.value;
});

// --- Funciones de Utilidad ---
function getInitials(name) {
  if (!name || name.trim() === '' || name === 'Cargando...') return 'CL';
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
  }, 4000); // El mensaje desaparece después de 4 segundos
}

// --- Funciones de Supabase y Lógica de Negocio ---

/**
 * Carga los datos del perfil del cliente desde Supabase.
 * Obtiene el auth_id del usuario y luego busca la empresa y la URL de la foto
 * en la tabla 'clientes'.
 */
async function fetchClientProfile() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Error al obtener usuario autenticado:', userError?.message || userError);
      clientName.value = 'Cliente';
      editableClientName.value = 'Cliente';
      clientEmail.value = '';
      profilePhotoUrl.value = '';
      initialProfilePhotoUrl.value = '';
      return;
    }

    clientAuthId.value = user.id;
    clientEmail.value = user.email || '';

    const { data, error } = await supabase
      .from('clientes')
      .select('id, empresa, avatar_url') // Asegúrate de seleccionar 'id' y 'avatar_url'
      .eq('auth_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means "no rows found" (expected for new users)
      console.error('Error al cargar información del cliente:', error.message);
      showMessage('error', `Error al cargar perfil: ${error.message}`);
      clientName.value = 'Cliente';
      editableClientName.value = 'Cliente';
      profilePhotoUrl.value = '';
      initialProfilePhotoUrl.value = '';
      return;
    }

    if (data) {
      clientDbId.value = data.id; // Guardamos el ID de la tabla clientes
      clientName.value = data.empresa || 'Cliente';
      editableClientName.value = data.empresa || 'Cliente';
      profilePhotoUrl.value = data.avatar_url || '';
      initialProfilePhotoUrl.value = data.avatar_url || '';
    } else {
      // Si no se encuentra un cliente, establecer valores por defecto
      clientName.value = 'Cliente';
      editableClientName.value = 'Cliente';
      profilePhotoUrl.value = '';
      initialProfilePhotoUrl.value = '';
      console.warn('No se encontró un registro de cliente para el usuario actual. Se usará nombre por defecto.');
    }
  } catch (err) {
    console.error('Error inesperado al obtener el perfil:', err);
    showMessage('error', `Error inesperado: ${err.message}`);
    clientName.value = 'Cliente';
    editableClientName.value = 'Cliente';
    profilePhotoUrl.value = '';
    initialProfilePhotoUrl.value = '';
  }
}

/**
 * Maneja el cambio de la foto de perfil: sube la nueva imagen a Supabase Storage
 * y actualiza la URL en la tabla 'clientes'.
 */
async function onPhotoChange(event) {
  const file = event.target.files[0];
  if (!file) return;

  uploadingPhoto.value = true;
  showMessage('success', 'Subiendo foto de perfil...');

  try {
    if (!clientAuthId.value) {
      showMessage('error', 'No se pudo obtener el ID del usuario para subir la foto.');
      return;
    }

    // Opcional: Eliminar foto anterior si existe
    if (profilePhotoUrl.value) {
      const oldFileName = profilePhotoUrl.value.split('/').pop();
      if (oldFileName) {
        // Asumiendo que el nombre del archivo es `${clientAuthId.value}-${uuid}`
        const { error: deleteError } = await supabase.storage
          .from('profile-pictures') // Nombre de tu bucket
          .remove([`${clientAuthId.value}/${oldFileName}`]); // Ruta en el bucket
        if (deleteError) {
          console.warn('Error al intentar eliminar foto anterior (puede que no existiera o no tuviera permisos):', deleteError.message);
          // No mostramos esto como error principal al usuario
        }
      }
    }

    // Generar un nombre de archivo único para evitar conflictos y facilitar la eliminación
    const fileExtension = file.name.split('.').pop();
    const filePath = `${clientAuthId.value}/${uuidv4()}.${fileExtension}`; // Carpeta por usuario_id

    const { data, error } = await supabase.storage
      .from('profile-pictures') // Nombre de tu bucket
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false // No sobrescribir si ya existe (aunque con UUID no debería)
      });

    if (error) {
      throw error;
    }

    // Obtener la URL pública de la imagen
    const { data: publicUrlData } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(filePath);

    if (publicUrlData && publicUrlData.publicUrl) {
      profilePhotoUrl.value = publicUrlData.publicUrl;
      initialProfilePhotoUrl.value = publicUrlData.publicUrl; // Actualizar el valor inicial para el control de cambios

      // Actualizar la URL de la foto en la tabla 'clientes'
      const { error: updateError } = await supabase
        .from('clientes')
        .upsert(
          { auth_id: clientAuthId.value, empresa: editableClientName.value, avatar_url: profilePhotoUrl.value },
          { onConflict: 'auth_id' }
        );

      if (updateError) {
        throw updateError;
      }
      showMessage('success', 'Foto de perfil actualizada con éxito.');
    } else {
      throw new Error('No se pudo obtener la URL pública de la imagen.');
    }

  } catch (error) {
    console.error('Error al subir o guardar la foto:', error.message);
    showMessage('error', `Error al subir la foto: ${error.message}`);
    // Revertir a la URL anterior si falla la subida
    profilePhotoUrl.value = initialProfilePhotoUrl.value; 
  } finally {
    uploadingPhoto.value = false;
  }
}

/**
 * Elimina la foto de perfil actual del Storage y de la base de datos.
 */
async function removePhoto() {
  if (!profilePhotoUrl.value || !clientAuthId.value) return;

  if (!confirm('¿Estás seguro de que quieres eliminar tu foto de perfil?')) {
    return;
  }

  uploadingPhoto.value = true; // Usar el mismo indicador para deshabilitar botones
  showMessage('success', 'Eliminando foto de perfil...');

  try {
    const fileName = profilePhotoUrl.value.split('/').pop(); // Obtener solo el nombre del archivo
    if (!fileName) throw new Error('No se pudo obtener el nombre del archivo de la URL.');

    const { error: deleteError } = await supabase.storage
      .from('profile-pictures') // Nombre de tu bucket
      .remove([`${clientAuthId.value}/${fileName}`]); // Ruta completa en el bucket

    if (deleteError) {
      throw deleteError;
    }

    // Actualizar la URL de la foto a NULL en la tabla 'clientes'
    const { error: updateError } = await supabase
      .from('clientes')
      .upsert(
        { auth_id: clientAuthId.value, avatar_url: null },
        { onConflict: 'auth_id' }
      );

    if (updateError) {
      throw updateError;
    }

    profilePhotoUrl.value = ''; // Limpiar la URL localmente
    initialProfilePhotoUrl.value = ''; // Restablecer el valor inicial
    showMessage('success', 'Foto de perfil eliminada con éxito.');

  } catch (error) {
    console.error('Error al eliminar la foto:', error.message);
    showMessage('error', `Error al eliminar la foto: ${error.message}`);
  } finally {
    uploadingPhoto.value = false;
  }
}


/**
 * Guarda los cambios en el nombre de la empresa en la tabla 'clientes'.
 */
async function saveProfile() {
  if (!clientAuthId.value) {
    showMessage('error', 'No se pudo obtener el ID del usuario para guardar los cambios.');
    return;
  }
  if (!isProfileChanged.value) {
    showMessage('info', 'No hay cambios para guardar.');
    return;
  }

  savingProfile.value = true;
  showMessage('success', 'Guardando cambios...');

  try {
    const { data, error } = await supabase
      .from('clientes')
      .upsert(
        { auth_id: clientAuthId.value, empresa: editableClientName.value },
        { onConflict: 'auth_id', ignoreDuplicates: false } // Para insertar si no existe, actualizar si sí
      );

    if (error) {
      throw error;
    }
    clientName.value = editableClientName.value; // Sincronizar el nombre principal
    showMessage('success', 'Perfil actualizado con éxito.');
  } catch (error) {
    console.error('Error al guardar el perfil:', error.message);
    showMessage('error', `Error al guardar perfil: ${error.message}`);
  } finally {
    savingProfile.value = false;
  }
}

/**
 * Cambia el color principal de la aplicación aplicando una variable CSS.
 */
function changeTheme() {
  document.documentElement.style.setProperty('--main-color', selectedTheme.value);
  localStorage.setItem('themeColor', selectedTheme.value);
  showMessage('success', `Color principal cambiado a ${themeColors.find(c => c.value === selectedTheme.value).label}`);
}

// --- Lógica del Sidebar y Responsive ---
const handleSidebarCollapse = (collapsedState) => {
  isSidebarCollapsed.value = collapsedState;
};

const checkMobile = () => {
  isMobile.value = window.innerWidth < 1024;
};

// --- Ciclo de Vida ---
onMounted(async () => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
  await fetchClientProfile(); // Cargar el perfil al montar el componente
  changeTheme(); // Aplicar el tema guardado o por defecto al montar
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
  clearTimeout(messageTimeout); // Limpiar el timeout si el componente se desmonta
});

// Watcher para cuando editableClientName cambie, actualizar clientName solo al guardar
// No es necesario un watcher si clientName se actualiza en saveProfile
</script>

<style scoped>
/* Variables CSS globales (si no están ya en tu main CSS) */
:root {
  --main-color: #92d000; /* Color principal por defecto */
}

/* Base Layout */
.config-layout {
  min-height: 100vh;
  background-color: #1e1e1e;
  color: #ffffff;
  display: flex; /* Para que el sidebar y el contenido se organicen con flexbox */
}

.main-content {
  flex-grow: 1; /* Permite que el contenido ocupe el espacio restante */
  padding: 2.5rem 2rem 2rem 2rem;
  min-height: 100vh;
  max-width: 900px; /* Un poco más ancho para más espacio */
  margin-right: auto;
  margin-left: auto;
  transition: margin-left 0.3s ease; /* Transición para el margen */
  box-sizing: border-box; /* Asegura que padding no aumente el ancho */
}

/* Media query para pantallas pequeñas (móviles) */
@media (max-width: 1023px) {
  .main-content {
    margin-left: 0 !important; /* Forzar sin margen en móvil */
    width: 100% !important; /* Ocupar todo el ancho disponible */
    padding: 1rem 0.5rem; /* Ajustar padding para pantallas más pequeñas */
  }
}

/* Page Header */
.page-header {
  background-color: #232323;
  border: 1px solid rgba(var(--main-color-rgb, 146, 208, 0), 0.13); /* Usa la variable CSS */
  padding: 2rem 2.5rem 1.5rem 2.5rem;
  margin-bottom: 2.5rem;
  border-radius: 1.25rem;
  box-shadow: 0 6px 24px rgba(0,0,0,0.18);
  display: flex;
  align-items: center;
  justify-content: flex-start;
}
.page-title {
  color: #ffffff;
  font-size: 1.7rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

/* General Section Styling */
.section-title {
  font-size: 1.15rem;
  font-weight: 700;
  margin-bottom: 1.2rem;
  color: var(--main-color, #92d000); /* Usa la variable CSS */
  letter-spacing: -0.01em;
}
.card-style {
  background: #232323;
  border-radius: 1.2rem;
  padding: 2rem 2.5rem;
  box-shadow: 0 2px 12px rgba(var(--main-color-rgb, 146, 208, 0), 0.04); /* Usa la variable CSS */
  border: 1px solid rgba(var(--main-color-rgb, 146, 208, 0), 0.08); /* Usa la variable CSS */
}

/* Profile Section */
.profile-section {
  margin-bottom: 2.5rem;
}
.profile-content {
  display: flex;
  align-items: center;
  gap: 2.5rem;
}
.profile-photo-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}
.profile-photo, .profile-initials {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid var(--main-color, #92d000); /* Usa la variable CSS */
  background: #222;
  box-shadow: 0 2px 8px rgba(var(--main-color-rgb, 146, 208, 0), 0.08); /* Usa la variable CSS */
  display: flex; /* Para centrar iniciales */
  align-items: center;
  justify-content: center;
}
.profile-initials {
  background: var(--main-color, #92d000); /* Usa la variable CSS */
  color: #fff;
  font-size: 2.6rem;
  font-weight: 700;
  letter-spacing: 1px;
}
.profile-initials.uploading {
  font-size: 1.2rem;
  background: #444;
  animation: pulse 1.5s infinite alternate; /* Animación de carga */
}
@keyframes pulse {
  0% { transform: scale(1); opacity: 0.7; }
  100% { transform: scale(1.05); opacity: 1; }
}

.photo-upload-btn, .remove-photo-btn {
  margin-top: 0.5rem;
  background: var(--main-color, #92d000); /* Usa la variable CSS */
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.5rem 1.2rem;
  border-radius: 0.7rem;
  cursor: pointer;
  border: none;
  transition: background 0.2s, opacity 0.2s;
  display: inline-block;
  text-align: center;
  position: relative;
  overflow: hidden;
  white-space: nowrap; /* Evita que el texto se rompa */
}
.photo-upload-btn input[type="file"] {
  opacity: 0;
  position: absolute;
  left: 0; top: 0; width: 100%; height: 100%;
  cursor: pointer;
}
.photo-upload-btn:hover:not([disabled]) {
  background: #7eb300; /* Un verde más oscuro para hover */
}
.photo-upload-btn.uploading-btn {
  background: #4a4a4a; /* Color cuando está subiendo */
  cursor: not-allowed;
  opacity: 0.7;
}
.remove-photo-btn {
  background: #dc3545; /* Rojo para eliminar */
  font-size: 0.85rem;
  padding: 0.4rem 1rem;
}
.remove-photo-btn:hover:not([disabled]) {
  background: #c82333;
}
.remove-photo-btn[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}


.profile-details {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}
.profile-item {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.detail-label {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}
.profile-input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: #1a1a1a;
  border: 1px solid rgba(var(--main-color-rgb, 146, 208, 0), 0.2); /* Usa la variable CSS */
  border-radius: 0.6rem;
  color: #fff;
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.profile-input:focus {
  outline: none;
  border-color: var(--main-color, #92d000); /* Usa la variable CSS */
  box-shadow: 0 0 0 3px rgba(var(--main-color-rgb, 146, 208, 0), 0.2); /* Usa la variable CSS */
}
.profile-input:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  background: #282828;
}
.profile-email {
  font-size: 1.05rem;
  color: var(--main-color, #92d000); /* Usa la variable CSS */
  opacity: 0.85;
  font-weight: 500;
  background: #1a1a1a;
  padding: 0.75rem 1rem;
  border-radius: 0.6rem;
  border: 1px solid transparent; /* Para que se alinee con el input */
}
.save-profile-btn {
  align-self: flex-end; /* Alinea el botón a la derecha */
  background: #92d000;
  color: #fff;
  padding: 0.75rem 1.8rem;
  border-radius: 0.7rem;
  border: none;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.save-profile-btn:hover:not([disabled]) {
  background: #7eb300;
}
.save-profile-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #555;
}

/* Theme Section */
.theme-section {
  margin-bottom: 2.5rem;
}
.theme-options {
  display: flex;
  flex-wrap: wrap; /* Permite que los colores se envuelvan */
  gap: 1.5rem; /* Reducir el espacio entre opciones */
  margin-top: 1rem;
}
.theme-radio {
  display: flex;
  align-items: center;
  gap: 0.6rem; /* Espacio entre el color y la etiqueta */
  cursor: pointer;
  padding: 0.5rem; /* Añadir padding para hacer más clicable */
  border-radius: 0.7rem;
  transition: background-color 0.2s;
}
.theme-radio:hover {
  background-color: rgba(255, 255, 255, 0.05);
}
.theme-radio input[type="radio"] {
  accent-color: var(--main-color, #92d000); /* Usa la variable CSS */
  width: 1.2rem;
  height: 1.2rem;
  margin: 0; /* Eliminar margen predeterminado */
  flex-shrink: 0; /* Evita que el radio se encoja */
}
.theme-color {
  width: 28px; /* Ligeramente más pequeño */
  height: 28px;
  border-radius: 50%;
  border: 2px solid #fff;
  display: inline-block;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  flex-shrink: 0; /* Evita que el color se encoja */
}
.theme-label {
  font-size: 0.95rem; /* Ligeramente más pequeño */
  color: #fff;
  font-weight: 500;
  white-space: nowrap; /* Evita que la etiqueta se rompa */
}


/* Notifications Section (Example) */
.notifications-section {
  margin-bottom: 2.5rem;
}
.notification-settings {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #2a2a2a;
  border-radius: 0.7rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 45px;
  height: 25px;
}
.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  -webkit-transition: .4s;
  transition: .4s;
  border-radius: 34px;
}
.slider:before {
  position: absolute;
  content: "";
  height: 17px;
  width: 17px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  -webkit-transition: .4s;
  transition: .4s;
  border-radius: 50%;
}
input:checked + .slider {
  background-color: var(--main-color, #92d000);
}
input:focus + .slider {
  box-shadow: 0 0 1px var(--main-color, #92d000);
}
input:checked + .slider:before {
  -webkit-transform: translateX(20px);
  -ms-transform: translateX(20px);
  transform: translateX(20px);
}
.toggle-label {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
}


/* Toast Messages */
.toast-message {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 1rem 1.5rem;
  border-radius: 0.75rem;
  font-weight: 600;
  color: #fff;
  z-index: 1000;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  min-width: 250px;
  text-align: center;
  animation: fadeInOut 4.5s forwards; /* Duración más larga para mejor lectura */
}
.toast-message.success {
  background-color: #28a745; /* Verde éxito */
  border: 1px solid rgba(40, 167, 69, 0.5);
}
.toast-message.error {
  background-color: #dc3545; /* Rojo error */
  border: 1px solid rgba(220, 53, 69, 0.5);
}
.toast-message.info {
  background-color: #007bff; /* Azul info */
  border: 1px solid rgba(0, 123, 255, 0.5);
}

@keyframes fadeInOut {
  0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
  10% { opacity: 1; transform: translateX(-50%) translateY(0); }
  90% { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(20px); }
}


/* Responsive adjustments for profile card */
@media (max-width: 768px) {
  .profile-content {
    flex-direction: column;
    align-items: flex-start; /* Alinea los elementos a la izquierda en móvil */
    gap: 1.5rem;
  }
  .profile-details {
    width: 100%;
  }
  .save-profile-btn {
    align-self: stretch; /* Estira el botón para ocupar todo el ancho */
  }
  .profile-card, .card-style {
    padding: 1.5rem 1.5rem;
  }
  .theme-options {
    flex-direction: column; /* Apila las opciones de tema en móvil */
    gap: 1rem;
  }
  .theme-radio {
    width: 100%; /* Ocupa todo el ancho */
  }
}

@media (max-width: 480px) {
  .page-header {
    padding: 1.5rem 1.5rem 1rem 1.5rem;
  }
  .page-title {
    font-size: 1.5rem;
  }
  .profile-photo-container {
    width: 100%; /* Centra la foto en móvil */
    align-items: center;
  }
  .photo-upload-btn, .remove-photo-btn {
    width: 80%; /* Botones un poco más anchos */
    max-width: 200px;
  }
  .toast-message {
    left: 10px;
    right: 10px;
    transform: none;
    width: auto;
  }
}
</style>