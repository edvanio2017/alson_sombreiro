<script setup lang="ts">
import type { ServiceDetailDto } from '@alson/shared';

// O hero escuro passa por baixo do cabeçalho fixo, que fica em versão clara.
definePageMeta({ heroUnderHeader: true });

const route = useRoute();
const slug = computed(() => String(route.params.slug));

const { data: service, error } = await useApiData<ServiceDetailDto>(
  () => `/public/services/${slug.value}`,
  { key: () => `service-${slug.value}` },
);

// Um slug inexistente devolve 404 real, o que é importante para SEO.
if (error.value || !service.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Serviço não encontrado',
    fatal: true,
  });
}

const detail = computed(() => service.value!);

useSeo({
  title: detail.value.metaTitle || detail.value.name,
  description: detail.value.metaDescription || detail.value.shortDescription,
  path: `/servicos/${detail.value.slug}`,
  image: detail.value.ogImage,
  type: 'article',
});

// Dados estruturados do serviço, que enriquecem o resultado nos motores de busca.
const config = useRuntimeConfig();
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: detail.value.name,
        description: detail.value.shortDescription,
        serviceType: detail.value.name,
        areaServed: { '@type': 'Country', name: 'Angola' },
        provider: {
          '@type': 'RealEstateAgent',
          name: COMPANY.legalName,
          url: config.public.siteUrl,
        },
        url: `${config.public.siteUrl}/servicos/${detail.value.slug}`,
      }),
    },
  ],
});

/** A descrição vem do backoffice com parágrafos separados por linha em branco. */
const paragraphs = computed(() =>
  detail.value.description
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean),
);
</script>

<template>
  <div v-if="service">
    <!-- Cabeçalho -->
    <section class="brand-gradient -mt-20 pb-16 pt-36 text-white lg:pb-24 lg:pt-44">
      <div class="container-page">
        <nav aria-label="Trilho de navegação">
          <ol class="flex flex-wrap items-center gap-2 text-[12px] text-graphite-400">
            <li><NuxtLink to="/" class="transition-colors hover:text-white">Início</NuxtLink></li>
            <li aria-hidden="true">/</li>
            <li><NuxtLink to="/servicos" class="transition-colors hover:text-white">Serviços</NuxtLink></li>
            <li aria-hidden="true">/</li>
            <li class="text-white" aria-current="page">{{ service.name }}</li>
          </ol>
        </nav>

        <div class="mt-8 max-w-3xl">
          <p v-if="service.featured" class="eyebrow text-graphite-400">Serviço em destaque</p>
          <h1 class="display-title mt-4 text-white">{{ service.name }}</h1>
          <p class="mt-6 max-w-2xl text-[16px] leading-[1.85] text-graphite-300">
            {{ service.shortDescription }}
          </p>
          <a href="#pedido" class="btn-primary mt-9 border-white bg-white text-graphite-950 hover:bg-graphite-100 hover:border-graphite-100">
            Submeter pedido
          </a>
        </div>
      </div>
    </section>

    <!-- Descrição + benefícios -->
    <section class="py-16 lg:py-24">
      <div class="container-page grid gap-14 lg:grid-cols-12 lg:gap-20">
        <div class="lg:col-span-7">
          <p class="eyebrow">Sobre o serviço</p>
          <div class="prose-institucional mt-6">
            <p v-for="(paragraph, index) in paragraphs" :key="index">{{ paragraph }}</p>
            <p v-if="!paragraphs.length">{{ service.shortDescription }}</p>
          </div>
        </div>

        <aside v-if="service.benefits.length" class="lg:col-span-5">
          <div class="surface-card p-8">
            <p class="eyebrow">Porquê connosco</p>
            <ul class="mt-6 space-y-4">
              <li v-for="benefit in service.benefits" :key="benefit" class="flex gap-3">
                <svg
                  class="mt-0.5 h-4 w-4 shrink-0 text-graphite-950"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                <span class="text-[14px] leading-[1.75] text-graphite-600">{{ benefit }}</span>
              </li>
            </ul>

            <div class="mt-8 border-t border-graphite-200 pt-6">
              <p class="text-[13px] text-graphite-500">Prefere falar connosco primeiro?</p>
              <a
                :href="`tel:${COMPANY.phones[0].replace(/\s/g, '')}`"
                class="mt-1.5 block text-[16px] font-medium text-graphite-950"
              >
                {{ COMPANY.phones[0] }}
              </a>
            </div>
          </div>
        </aside>
      </div>
    </section>

    <!-- Formulário dinâmico -->
    <section id="pedido" class="border-t border-graphite-200 bg-white py-16 lg:py-24">
      <div class="container-page">
        <div class="mx-auto max-w-3xl">
          <DynamicForm :service="service" />
        </div>
      </div>
    </section>

    <!-- Outros serviços -->
    <section class="py-16 lg:py-20">
      <div class="container-page text-center">
        <p class="text-[14px] text-graphite-500">Procura outro serviço?</p>
        <NuxtLink to="/servicos" class="btn-outline mt-5">Ver todos os serviços</NuxtLink>
      </div>
    </section>
  </div>
</template>
