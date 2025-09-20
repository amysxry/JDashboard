<template>
  <header class="top-navbar">
    <div class="navbar-left">
      <button @click="toggleMobileSidebar" class="hamburger-btn">
        <Menu class="h-6 w-6" />
      </button>
      <h1 class="page-title">{{ title }}</h1>
    </div>

    <div class="navbar-right">
      <div class="user-profile">
        <span class="user-name">{{ userStore.name }}</span>
        
        <img v-if="userStore.avatarUrl" :src="userStore.avatarUrl" alt="Avatar" class="user-avatar-img">
        <div v-else class="user-avatar-initials">{{ userStore.initials }}</div>
      </div>
      
      <div class="status-indicator">
        <div class="status-dot"></div>
        <span class="status-text">En línea</span>
      </div>
    </div>
  </header>
</template>

<script setup>
import { Menu } from 'lucide-vue-next';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();

defineProps({
  title: {
    type: String,
    required: true,
  },
});

const toggleMobileSidebar = () => {
  window.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'));
};
</script>

<style scoped>
.top-navbar {
  display: flex;
  align-items: center;
  height: var(--header-height, 69px); /* <-- AÑADIDO: Altura fija */
  flex-shrink: 0; /* <-- AÑADIDO: Evita que se encoja verticalmente */
  padding: 0 1.5rem;
  background-color: var(--color-bg-accent);
  border-bottom: 1px solid var(--color-border);
  width: 100%;
  box-sizing: border-box;
}

.navbar-left, .navbar-right {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.navbar-left {
  flex-shrink: 1; /* Permitimos que se encoja */
  min-width: 0;   /* Requerido para que text-overflow funcione en un flex item */
}

/* CAMBIO CLAVE: Esta es la nueva estrategia. */
.navbar-right {
  margin-left: auto;   /* <-- EMPUJA ESTE BLOQUE HACIA LA DERECHA */
  padding-left: 1rem;   /* <-- Añade un poco de espacio para que no se pegue al título */
  flex-shrink: 0;       /* Se asegura de que los íconos nunca se encojan */
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #f0f0f0;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: var(--border-radius-md);
  transition: background-color 0.2s ease;
}
.user-profile:hover {
  background-color: var(--color-bg-dark);
}

.user-name {
  color: var(--color-text-primary);
  font-weight: 500;
  font-size: 0.9rem;
  white-space: nowrap;
}

.user-avatar-img, .user-avatar-initials {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  border: 2px solid var(--color-bg-dark);
  background-color: var(--color-bg-dark);
  flex-shrink: 0;
}

.user-avatar-initials {
  background-color: var(--color-secondary);
  color: #fff;
  font-size: 0.9rem;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: linear-gradient(135deg, rgba(146, 208, 0, 0.1), rgba(146, 208, 0, 0.05));
  border: 1px solid rgba(146, 208, 0, 0.2);
  border-radius: var(--border-radius-md);
  transition: all 0.2s ease;
}

.status-indicator:hover {
  background: linear-gradient(135deg, rgba(146, 208, 0, 0.15), rgba(146, 208, 0, 0.08));
  border-color: rgba(146, 208, 0, 0.3);
  transform: translateY(-1px);
}

.status-dot {
  width: 8px;
  height: 8px;
  background-color: #92d000;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(146, 208, 0, 0.6);
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { 
    opacity: 1; 
    transform: scale(1);
  }
  50% { 
    opacity: 0.7; 
    transform: scale(1.1);
  }
}

.status-text {
  color: var(--color-text-primary);
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;
}

.hamburger-btn { display: none; }

/* --- ZONA RESPONSIVA --- */
@media (max-width: 1024px) {
  .user-name {
    display: none;
  }
  
  .status-text {
    display: none;
  }
  
  .status-indicator {
    padding: 0.5rem;
    background: transparent;
    border: none;
  }
  
  .status-indicator:hover {
    background: transparent;
    transform: none;
  }
}

@media (max-width: 767px) {
  .top-navbar {
    padding: 0 1rem;
  }
  .hamburger-btn {
    display: flex;
    border: none;
    background: none;
    color: var(--color-text-primary);
    margin-right: 0.5rem;
  }
  .page-title {
    font-size: 1.2rem;
  }
  .navbar-right {
    gap: 0.75rem; /* Mantenemos el espacio reducido en móvil */
  }
  
  .status-indicator {
    display: none; /* Ocultamos completamente en móvil */
  }
}
</style>