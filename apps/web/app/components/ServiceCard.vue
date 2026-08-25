<script setup lang="ts">
import type { ServiceSummaryDto } from '@alson/shared';

defineProps<{ service: ServiceSummaryDto; index?: number }>();
</script>

<template>
  <NuxtLink
    :to="`/servicos/${service.slug}`"
    class="group relative flex flex-col border border-graphite-200 bg-white p-7 transition-all duration-300 hover:border-graphite-950 hover:shadow-[var(--shadow-elevated)]"
  >
    <div class="flex items-start justify-between gap-4">
      <span class="font-mono text-[11px] tracking-widest text-graphite-300">
        {{ String((index ?? 0) + 1).padStart(2, '0') }}
      </span>
      <span
        v-if="service.featured"
        class="border border-graphite-900 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-graphite-900"
      >
        Destaque
      </span>
    </div>

    <h3
      class="mt-6 text-[19px] font-medium leading-snug text-graphite-950 transition-colors group-hover:text-graphite-700"
    >
      {{ service.name }}
    </h3>

    <p class="mt-3 flex-1 text-[14px] leading-[1.75] text-graphite-500">
      {{ service.shortDescription }}
    </p>

    <span
      class="mt-7 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-graphite-950"
    >
      Ver detalhes
      <svg
        class="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="2"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
      </svg>
    </span>
  </NuxtLink>
</template>
