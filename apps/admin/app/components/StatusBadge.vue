<script setup lang="ts">
import type { RequestStatusDto } from '@alson/shared';

const props = defineProps<{ status: Pick<RequestStatusDto, 'name' | 'color'> }>();

/**
 * O estado é definido no backoffice com uma cor livre, pelo que o texto tem de
 * se adaptar: calcula-se a luminância para escolher entre preto e branco e
 * garantir contraste suficiente (WCAG 1.4.3).
 */
const textColor = computed(() => {
  const hex = props.status.color.replace('#', '');
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#18181b' : '#ffffff';
});
</script>

<template>
  <span
    class="badge"
    :style="{ backgroundColor: status.color, color: textColor }"
  >
    {{ status.name }}
  </span>
</template>
