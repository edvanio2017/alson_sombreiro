<script setup lang="ts">
const props = withDefaults(
  defineProps<{ modelValue: boolean; title: string; wide?: boolean }>(),
  { wide: false },
);

const emit = defineEmits<{ 'update:modelValue': [boolean] }>();

const panel = ref<HTMLElement | null>(null);

function close(): void {
  emit('update:modelValue', false);
}

/** Fecha com Escape, comportamento esperado de qualquer diálogo. */
function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.modelValue) close();
}

// Impede o scroll da página por trás e leva o foco para o diálogo.
watch(
  () => props.modelValue,
  async (open) => {
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      await nextTick();
      panel.value?.querySelector<HTMLElement>('input, textarea, select, button')?.focus();
    }
  },
);

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0"
    >
      <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
        <div class="fixed inset-0 bg-graphite-950/50" aria-hidden="true" @click="close" />

        <div
          ref="panel"
          class="relative w-full rounded-sm bg-white shadow-[var(--shadow-panel)]"
          :class="wide ? 'max-w-3xl' : 'max-w-lg'"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
        >
          <div class="flex items-center justify-between gap-4 border-b border-graphite-200 px-5 py-3.5">
            <h2 class="text-[14px] font-semibold text-graphite-900">{{ title }}</h2>
            <button
              type="button"
              class="p-1 text-graphite-400 transition-colors hover:text-graphite-900"
              aria-label="Fechar"
              @click="close"
            >
              <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>

          <div class="p-5">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
