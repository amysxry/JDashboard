<template>
  <span>{{ displayValue }}</span>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';

const props = defineProps<{
  value: number;
  duration?: number;
  format?: (value: number) => string;
}>();

const displayValue = ref('0');
const startValue = ref(0);
const endValue = ref(0);
const animationStartTime = ref(0);

const animate = (timestamp: number) => {
  if (!animationStartTime.value) {
    animationStartTime.value = timestamp;
  }

  const progress = timestamp - animationStartTime.value;
  const duration = props.duration || 1000;
  const percent = Math.min(progress / duration, 1);

  // Función de easing para una animación más suave
  const easeOutQuart = (x: number): number => 1 - Math.pow(1 - x, 4);
  const easedProgress = easeOutQuart(percent);

  const currentValue = startValue.value + (endValue.value - startValue.value) * easedProgress;
  
  // Aplicar formato si se proporciona, si no, redondear a 2 decimales
  displayValue.value = props.format 
    ? props.format(currentValue)
    : currentValue.toFixed(2);

  if (progress < duration) {
    requestAnimationFrame(animate);
  }
};

const startAnimation = () => {
  startValue.value = parseFloat(displayValue.value.replace(/[^0-9.-]+/g, ''));
  endValue.value = props.value;
  animationStartTime.value = 0;
  requestAnimationFrame(animate);
};

watch(() => props.value, (newValue) => {
  if (newValue !== undefined) {
    startAnimation();
  }
});

onMounted(() => {
  if (props.value !== undefined) {
    displayValue.value = props.format 
      ? props.format(props.value)
      : props.value.toFixed(2);
  }
});
</script>

<style scoped>
span {
  display: inline-block;
  font-variant-numeric: tabular-nums;
}
</style>
