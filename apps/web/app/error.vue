<script setup lang="ts">
import type { NuxtError } from '#app';

const props = defineProps<{ error: NuxtError }>();

const isNotFound = computed(() => props.error.statusCode === 404);

useHead({
  title: isNotFound.value ? 'Página não encontrada' : 'Ocorreu um erro',
  meta: [{ name: 'robots', content: 'noindex' }],
});
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <AppHeader />

    <main class="flex flex-1 items-center pt-20">
      <div class="container-page max-w-2xl py-24 text-center">
        <p class="font-display text-7xl text-graphite-200">{{ error.statusCode }}</p>

        <h1 class="section-title mt-4">
          {{ isNotFound ? 'Página não encontrada' : 'Ocorreu um erro inesperado' }}
        </h1>

        <p class="prose-institucional mx-auto mt-4 max-w-md">
          {{
            isNotFound
              ? 'A página que procura pode ter sido removida ou o endereço está incorrecto.'
              : 'Já registámos o problema. Tente novamente dentro de instantes ou contacte-nos directamente.'
          }}
        </p>

        <div class="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <NuxtLink to="/" class="btn-primary" @click="clearError">Voltar ao início</NuxtLink>
          <NuxtLink to="/servicos" class="btn-outline" @click="clearError">Ver serviços</NuxtLink>
        </div>

        <p class="mt-10 text-[13px] text-graphite-400">
          Precisa de ajuda? {{ COMPANY.phones[0] }} ·
          <a :href="`mailto:${COMPANY.email}`" class="underline">{{ COMPANY.email }}</a>
        </p>
      </div>
    </main>

    <AppFooter />
  </div>
</template>
