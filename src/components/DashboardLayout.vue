<template>
  <div class="dashboard-layout">
    <SidebarMenu />

    <div class="page-container" :style="mainContentStyle">
      <TopBarMenu :title="pageTitle" />
      <main class="main-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/stores/user'
import SidebarMenu from '@/components/SidebarMenu.vue';
import TopBarMenu from '@/components/TopBarMenu.vue';

const userStore = useUserStore()
const isCollapsed = ref(false);
const isMobile = ref(false);
const route = useRoute();

const pageTitle = computed(() => route.meta.title || 'Dashboard');

const checkScreenSize = () => {
  isMobile.value = window.innerWidth < 1024;
};

const mainContentStyle = computed(() => {
  if (isMobile.value) {
    return { marginLeft: '0px' };
  }
  return {
    marginLeft: isCollapsed.value ? '100px' : '280px'
  };
});

const handleSidebarToggle = (event) => {
  isCollapsed.value = event.detail;
};

onMounted(() => {
  checkScreenSize();
  userStore.fetchProfile();
  window.addEventListener('sidebar-toggled', handleSidebarToggle);
  window.addEventListener('resize', checkScreenSize);
});

onUnmounted(() => {
  window.removeEventListener('sidebar-toggled', handleSidebarToggle);
  window.removeEventListener('resize', checkScreenSize);
});
</script>

<style scoped>
.dashboard-layout {
  display: flex;
  background-color: var(--color-bg-dark);
  height: 100vh;
}

.page-container {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  height: 100vh;
  transition: margin-left 0.3s ease-in-out;
}

.main-content {
  flex-grow: 1;
  overflow-y: auto;
}

/* Reglas para ocultar el scrollbar */
.main-content::-webkit-scrollbar {
  display: none;
}
.main-content {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>