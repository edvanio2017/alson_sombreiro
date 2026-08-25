<script setup lang="ts">
const { toasts, dismiss } = useToast();

const styles: Record<string, string> = {
  success: 'border-l-emerald-500',
  error: 'border-l-red-500',
  info: 'border-l-graphite-900',
};
</script>

<template>
  <!-- `aria-live` faz o leitor de ecrã anunciar cada notificação sem roubar o foco. -->
  <div class="fixed bottom-5 right-5 z-50 w-80 space-y-2" role="status" aria-live="polite">
    <TransitionGroup
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-x-6 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="flex items-start gap-3 rounded-sm border border-l-4 border-graphite-200 bg-white p-3.5 shadow-[var(--shadow-panel)]"
        :class="styles[toast.type]"
      >
        <p class="flex-1 text-[13px] leading-relaxed text-graphite-700">{{ toast.message }}</p>
        <button
          type="button"
          class="shrink-0 text-graphite-300 transition-colors hover:text-graphite-700"
          aria-label="Fechar notificação"
          @click="dismiss(toast.id)"
        >
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
