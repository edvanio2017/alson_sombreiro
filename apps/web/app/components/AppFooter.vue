<script setup lang="ts">
import type { ServiceSummaryDto } from '@alson/shared';

// Os serviços do rodapé vêm da API: publicar um serviço novo actualiza-o
// automaticamente, sem tocar em código.
const { data: services } = await useApiData<ServiceSummaryDto[]>('/public/services', {
  key: 'footer-services',
  default: () => [],
});

const year = new Date().getFullYear();
</script>

<template>
  <footer class="brand-gradient text-white">
    <div class="container-page py-16 lg:py-20">
      <div class="grid gap-12 lg:grid-cols-12">
        <!-- Marca -->
        <div class="lg:col-span-4">
          <img src="/logos/logo-light.png" alt="Alson Sombreiro Imobiliária" class="h-10 w-auto" />
          <p class="mt-6 max-w-sm text-[14px] leading-[1.8] text-graphite-300">
            Consultoria angolana especializada em mediação imobiliária, gestão de património e registo
            de imóveis. Constituída em {{ COMPANY.foundedYear }}, com presença directa em Luanda,
            Benguela e Huambo.
          </p>
          <ul class="mt-6 space-y-1.5">
            <li v-for="credential in COMPANY.credentials" :key="credential" class="text-[12px] text-graphite-400">
              {{ credential }}
            </li>
          </ul>
        </div>

        <!-- Serviços -->
        <nav class="lg:col-span-3" aria-labelledby="rodape-servicos">
          <h2 id="rodape-servicos" class="text-[11px] font-medium uppercase tracking-[0.28em] text-graphite-400">
            Serviços
          </h2>
          <ul class="mt-5 space-y-3">
            <li v-for="service in services?.slice(0, 7)" :key="service.id">
              <NuxtLink
                :to="`/servicos/${service.slug}`"
                class="text-[14px] text-graphite-300 transition-colors hover:text-white"
              >
                {{ service.name }}
              </NuxtLink>
            </li>
          </ul>
        </nav>

        <!-- Escritórios -->
        <div class="lg:col-span-3">
          <h2 class="text-[11px] font-medium uppercase tracking-[0.28em] text-graphite-400">
            Escritórios
          </h2>
          <ul class="mt-5 space-y-4">
            <li v-for="office in COMPANY.offices" :key="office.city">
              <p class="text-[13px] font-medium text-white">
                {{ office.city }}
                <span class="ml-1 text-[11px] font-normal uppercase tracking-wider text-graphite-400">
                  {{ office.label }}
                </span>
              </p>
              <p class="mt-1 text-[13px] leading-relaxed text-graphite-400">{{ office.address }}</p>
            </li>
          </ul>
        </div>

        <!-- Contactos -->
        <div class="lg:col-span-2">
          <h2 class="text-[11px] font-medium uppercase tracking-[0.28em] text-graphite-400">Contactos</h2>
          <ul class="mt-5 space-y-2.5">
            <li v-for="phone in COMPANY.phones" :key="phone">
              <a
                :href="`tel:${phone.replace(/\s/g, '')}`"
                class="text-[14px] text-graphite-300 transition-colors hover:text-white"
              >
                {{ phone }}
              </a>
            </li>
            <li>
              <a
                :href="`mailto:${COMPANY.email}`"
                class="break-all text-[14px] text-graphite-300 transition-colors hover:text-white"
              >
                {{ COMPANY.email }}
              </a>
            </li>
          </ul>
          <NuxtLink to="/contacto" class="btn-ghost-light btn-sm mt-6 w-full">Fale connosco</NuxtLink>
        </div>
      </div>

      <div
        class="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row"
      >
        <p class="text-[12px] text-graphite-400">
          © {{ year }} {{ COMPANY.legalName }}. Todos os direitos reservados.
        </p>
        <nav class="flex gap-6" aria-label="Ligações institucionais">
          <NuxtLink to="/privacidade" class="text-[12px] text-graphite-400 transition-colors hover:text-white">
            Política de Privacidade
          </NuxtLink>
          <NuxtLink to="/termos" class="text-[12px] text-graphite-400 transition-colors hover:text-white">
            Termos de Utilização
          </NuxtLink>
        </nav>
      </div>
    </div>
  </footer>
</template>
