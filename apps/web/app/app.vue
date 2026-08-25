<script setup lang="ts">
useOrganizationSchema();
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <!-- WCAG 2.4.1: permite saltar a navegação com o teclado. -->
    <a href="#conteudo-principal" class="sr-only-focusable">Saltar para o conteúdo principal</a>

    <AppHeader />

    <main id="conteudo-principal" class="flex-1 pt-20">
      <NuxtPage />
    </main>

    <AppFooter />
  </div>
</template>
