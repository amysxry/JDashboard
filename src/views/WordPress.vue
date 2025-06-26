<template>
  <div class="wp-layout">
    <SidebarMenu />
    <div class="main-content">
      <header class="page-header">
        <h1 class="page-title">WordPress</h1>
        <div class="header-actions">
          <button class="refresh-btn">
            <RefreshCw class="h-4 w-4" />
            <span>Actualizar datos</span>
          </button>
        </div>
      </header>
      <main class="wp-main">
        <!-- Contenido principal aquí -->
      </main>
    </div>
  </div>
</template>

<script setup>
import SidebarMenu from '@/components/SidebarMenu.vue'
import { RefreshCw } from 'lucide-vue-next'
</script>

<style scoped>
.wp-layout {
  min-height: 100vh;
  background-color: #1e1e1e;
  color: #ffffff;
}
.main-content {
  margin-left: 80px;
  padding: 1rem 2rem;
  min-height: 100vh;
}
.page-header {
  background-color: #2a2a2a;
  border: 1px solid rgba(146, 208, 0, 0.1);
  padding: 1.5rem 2rem;
  margin-bottom: 1.5rem;
  border-radius: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.page-title {
  color: #ffffff;
  font-size: 1.5rem;
  font-weight: 600;
}
.refresh-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background-color: #92d000;
  color: #ffffff;
  border-radius: 0.75rem;
  transition: all 0.2s ease;
}
.refresh-btn:hover {
  background-color: #7eb300;
  transform: translateY(-1px);
}
</style>
