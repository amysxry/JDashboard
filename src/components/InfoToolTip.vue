<template>
  <div class="tooltip-wrapper" @mouseenter="show" @mouseleave="hide" @click="toggle">
    <slot>
      <HelpCircle class="default-icon" />
    </slot>
    <Transition name="tooltip-fade">
      <div v-if="isVisible" class="tooltip-box" :style="tooltipStyle">
        <div class="tooltip-content">
          {{ text }}
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue';
import { HelpCircle } from 'lucide-vue-next';

const props = defineProps({
  text: {
    type: String,
    required: true,
  },
});

const isVisible = ref(false);
const tooltipStyle = ref({});

const calculatePosition = (event) => {
  const triggerElement = event.currentTarget;
  const tooltipElement = triggerElement.querySelector('.tooltip-box');
  
  if (!tooltipElement) return;

  const rect = triggerElement.getBoundingClientRect();
  const tooltipRect = tooltipElement.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let top = rect.top - tooltipRect.height - 10; // Posición por defecto: arriba
  let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

  // Ajustar si se sale por arriba
  if (top < 0) {
    top = rect.bottom + 10;
  }
  // Ajustar si se sale por la izquierda
  if (left < 0) {
    left = 5;
  }
  // Ajustar si se sale por la derecha
  if (left + tooltipRect.width > viewportWidth) {
    left = viewportWidth - tooltipRect.width - 5;
  }

  tooltipStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
  };
};

const show = async (event) => {
  isVisible.value = true;
  await nextTick(); // Esperar a que el DOM se actualice
  calculatePosition(event);
};

const hide = () => {
  isVisible.value = false;
};

const toggle = (event) => {
  if (isVisible.value) {
    hide();
  } else {
    show(event);
  }
};
</script>

<style scoped>
.tooltip-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: help;
}

.default-icon {
  width: 1rem;
  height: 1rem;
  color: var(--color-text-secondary);
}

.tooltip-box {
  position: fixed; /* Usamos fixed para posicionarnos respecto al viewport */
  z-index: 100;
  width: 240px;
  background-color: #333;
  color: #fff;
  text-align: left;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.5;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  pointer-events: none; /* Evita que el tooltip interfiera con el mouse */
}

.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
  transform: translateY(5px);
}
</style>