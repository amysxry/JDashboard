<template>
  <div class="info-tooltip-container">
    <div 
      class="info-tooltip-trigger"
      @mouseenter="showTooltip = true"
      @mouseleave="showTooltip = false"
      @focus="showTooltip = true"
      @blur="showTooltip = false"
      tabindex="0"
    >
      <HelpCircle class="info-icon" />
    </div>
    <div 
      v-if="showTooltip" 
      class="info-tooltip-content"
      :class="{ 'show': showTooltip }"
    >
      {{ text }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { HelpCircle } from 'lucide-vue-next';

defineProps({
  text: {
    type: String,
    required: true
  }
});

const showTooltip = ref(false);
</script>

<style scoped>
.info-tooltip-container {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.info-tooltip-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: help;
  border-radius: 50%;
  padding: 2px;
  transition: all 0.2s ease;
  outline: none;
}

.info-tooltip-trigger:hover,
.info-tooltip-trigger:focus {
  background-color: rgba(146, 208, 0, 0.1);
}

.info-icon {
  width: 16px;
  height: 16px;
  color: #92d000;
  transition: color 0.2s ease;
}

.info-tooltip-trigger:hover .info-icon,
.info-tooltip-trigger:focus .info-icon {
  color: #7bb500;
}

.info-tooltip-content {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(-8px);
  background: linear-gradient(135deg, #2a2a2a 0%, #323232 100%);
  color: #ffffff;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  max-width: 200px;
  white-space: normal;
  text-align: center;
  line-height: 1.4;
  box-shadow: 
    0 8px 16px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(146, 208, 0, 0.2);
  z-index: 1000;
  opacity: 0;
  animation: tooltipFadeIn 0.2s ease-out forwards;
  backdrop-filter: blur(10px);
}

.info-tooltip-content::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: #2a2a2a;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.info-tooltip-content.show {
  opacity: 1;
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(-8px);
  }
}

@media (max-width: 768px) {
  .info-tooltip-content {
    position: fixed;
    bottom: auto;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    max-width: 280px;
    padding: 1rem 1.25rem;
    font-size: 0.9rem;
  }
  
  .info-tooltip-content::after {
    display: none;
  }
}
</style>
