<script setup lang="ts">
import type { NuxtError } from '#app';

const props = defineProps<{ error: NuxtError }>();
const isNotFound = computed(() => props.error.statusCode === 404);
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-graphite-50 p-6">
    <div class="w-full max-w-md text-center">
      <img src="/logos/logo-dark.png" alt="Alson Sombreiro" class="mx-auto h-8 w-auto" />

      <p class="mt-10 text-5xl font-semibold text-graphite-200">{{ error.statusCode }}</p>

      <h1 class="mt-3 text-lg font-semibold text-graphite-950">
        {{ isNotFound ? 'Página não encontrada' : 'Ocorreu um erro' }}
      </h1>

      <p class="mt-2 text-[13px] leading-relaxed text-graphite-500">
        {{
          isNotFound
            ? 'O recurso que procura não existe ou foi removido.'
            : 'Não foi possível concluir a operação. Tente novamente dentro de instantes.'
        }}
      </p>

      <NuxtLink to="/" class="btn-primary mt-8" @click="clearError">Voltar ao dashboard</NuxtLink>
    </div>
  </div>
</template>
