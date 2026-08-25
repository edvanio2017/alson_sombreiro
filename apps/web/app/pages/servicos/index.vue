<script setup lang="ts">
import type { ServiceSummaryDto } from '@alson/shared';

const { data: services } = await useApiData<ServiceSummaryDto[]>('/public/services', {
  key: 'services-index',
  default: () => [],
});

useSeo({
  title: 'Serviços',
  description:
    'Avaliação imobiliária, avaliação patrimonial, mediação, angariação, gestão de arrendamento, inventariação e legalização de imóveis em Angola.',
  path: '/servicos',
});
</script>

<template>
  <div>
    <section class="border-b border-graphite-200 bg-white py-16 lg:py-24">
      <div class="container-page">
        <nav aria-label="Trilho de navegação">
          <ol class="flex items-center gap-2 text-[12px] text-graphite-400">
            <li><NuxtLink to="/" class="hover:text-graphite-950">Início</NuxtLink></li>
            <li aria-hidden="true">/</li>
            <li class="text-graphite-950" aria-current="page">Serviços</li>
          </ol>
        </nav>

        <div class="mt-8 max-w-3xl">
          <p class="eyebrow">Domínios de actuação</p>
          <h1 class="display-title mt-4">Os nossos serviços</h1>
          <p class="prose-institucional mt-6">
            Cada serviço tem o seu formulário de pedido próprio, definido pela nossa equipa e adaptado
            à informação necessária para responder com rigor. Submeta o pedido online e receba um
            número de referência para acompanhar todo o processo.
          </p>
        </div>
      </div>
    </section>

    <section class="py-16 lg:py-20">
      <div class="container-page">
        <p class="text-[13px] text-graphite-400">
          {{ services?.length ?? 0 }} serviço(s) disponível(eis)
        </p>

        <div class="mt-6 grid gap-px bg-graphite-200 sm:grid-cols-2 lg:grid-cols-3">
          <ServiceCard
            v-for="(service, index) in services"
            :key="service.id"
            :service="service"
            :index="index"
          />
        </div>

        <div v-if="!services?.length" class="surface-card mt-6 p-14 text-center">
          <p class="text-[15px] text-graphite-500">
            Não há serviços publicados neste momento. Contacte-nos através de
            <a :href="`mailto:${COMPANY.email}`" class="text-graphite-950 underline">{{ COMPANY.email }}</a>
            ou pelo telefone {{ COMPANY.phones[0] }}.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>
