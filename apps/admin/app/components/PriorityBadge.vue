<script setup lang="ts">
import { PRIORITY_LABELS, type Priority } from '@alson/shared';

defineProps<{ priority: Priority }>();

/** Escala visual crescente: só a urgência justifica cor saturada. */
const styles: Record<Priority, string> = {
  BAIXA: 'bg-graphite-100 text-graphite-500',
  NORMAL: 'bg-graphite-100 text-graphite-700',
  ALTA: 'bg-amber-100 text-amber-800',
  URGENTE: 'bg-red-100 text-red-700',
};
</script>

<template>
  <span class="badge" :class="styles[priority]">
    <span
      v-if="priority === 'URGENTE' || priority === 'ALTA'"
      class="h-1.5 w-1.5 rounded-full bg-current"
      aria-hidden="true"
    />
    {{ PRIORITY_LABELS[priority] }}
  </span>
</template>
