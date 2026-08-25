<script setup lang="ts">
const props = defineProps<{ field: string; sort: string; direction: string }>();

const active = computed(() => props.sort === props.field);
</script>

<template>
  <svg
    class="h-3 w-3 transition-opacity"
    :class="active ? 'opacity-100' : 'opacity-25'"
    viewBox="0 0 12 12"
    fill="currentColor"
    aria-hidden="true"
  >
    <path v-if="!active || direction === 'desc'" d="M6 9 2.5 5h7L6 9Z" />
    <path v-else d="M6 3 9.5 7h-7L6 3Z" />
  </svg>
  <span v-if="active" class="sr-only">
    (ordenado por {{ direction === 'asc' ? 'ordem crescente' : 'ordem decrescente' }})
  </span>
</template>
