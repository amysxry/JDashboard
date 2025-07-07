<template>
  <header class="top-navbar">
    <div class="navbar-left">
      <button @click="toggleMobileSidebar" class="hamburger-btn">
        <Menu class="h-6 w-6" />
      </button>
      <h1 class="page-title">{{ title }}</h1>
    </div>

    <div class="navbar-right">
      <button class="action-btn">
        <Bell class="h-6 w-6" />
      </button>
    </div>
  </header>
</template>

<script setup>
import { Bell, Menu } from 'lucide-vue-next';

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
  justify-content: space-between;
  align-items: center;
  /* CAMBIO: Ajustamos padding y altura para alinear con el sidebar-header */
  padding: 1rem 2rem;
  height: 69px; 
  background-color: var(--color-bg-accent);
  width: 100%;
  box-sizing: border-box;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.page-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: #f0f0f0;
  margin: 0;
}

.navbar-left, .navbar-right {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.hamburger-btn {
  display: none;
  background: transparent;
  border: none;
  color: #f0f0f0;
  padding: 0.5rem;
  margin-left: -0.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}
.hamburger-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.action-btn {
  background: transparent;
  border: none;
  color: #f0f0f0;
  padding: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}
.action-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

@media (max-width: 1023px) {
  .top-navbar {
    padding: 0.75rem 1rem;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .hamburger-btn { display: flex; }
  .page-title { font-size: 1.2rem; }
}
</style>