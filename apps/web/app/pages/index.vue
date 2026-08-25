<script setup lang="ts">
import type { ServiceSummaryDto } from '@alson/shared';

// O hero escuro passa por baixo do cabeçalho fixo, que fica em versão clara.
definePageMeta({ heroUnderHeader: true });

const { data: services } = await useApiData<ServiceSummaryDto[]>('/public/services', {
  key: 'home-services',
  default: () => [],
});

const featured = computed(() => services.value?.filter((service) => service.featured) ?? []);

useSeo({
  title: 'Consultoria Imobiliária em Angola',
  description:
    'Avaliação imobiliária, mediação, gestão de património e legalização de imóveis em Angola. Perito avaliador inscrito na CMC, com escritórios em Benguela, Luanda e Huambo.',
  path: '/',
});

const pillars = [
  {
    title: 'Ética e transparência',
    body: 'Cada processo é conduzido com regras claras e informação completa em todas as fases.',
  },
  {
    title: 'Rigor técnico',
    body: 'Equipa pluridisciplinar de engenharia, direito e contabilidade, com credenciais reconhecidas.',
  },
  {
    title: 'Conhecimento local',
    body: 'Presença directa em três províncias e mobilidade em toda a região Centro-Sul do país.',
  },
  {
    title: 'Foco no resultado',
    body: 'O sucesso mede-se pelos objectivos do cliente concretizados, não pelo processo iniciado.',
  },
];

const numbers = [
  { value: '2019', label: 'Ano de constituição' },
  { value: '03', label: 'Províncias com escritório' },
  { value: '09', label: 'Domínios de actuação' },
  { value: '20+', label: 'Processos de referência' },
];
</script>

<template>
  <div>
    <!-- ------------------------------- Hero -------------------------------- -->
    <section class="relative -mt-20 flex min-h-[92vh] items-center overflow-hidden brand-gradient">
      <!-- Malha geométrica que ecoa o símbolo da marca -->
      <div class="pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden="true">
        <svg class="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="malha" width="72" height="72" patternUnits="userSpaceOnUse">
              <path d="M0 72 L36 36 L72 72" fill="none" stroke="white" stroke-width="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#malha)" />
        </svg>
      </div>

      <div class="container-page relative pt-32 pb-24">
        <div class="max-w-3xl">
          <p class="eyebrow text-graphite-400">Alson Sombreiro Consultadoria · Angola</p>

          <h1 class="display-title mt-6 text-white">
            Segurança jurídica e valor real para o seu património imobiliário.
          </h1>

          <p class="mt-8 max-w-xl text-[16px] leading-[1.85] text-graphite-300">
            Avaliamos, legalizamos e gerimos imóveis em Angola com rigor técnico e conhecimento
            profundo do mercado local. Da avaliação certificada à regularização documental, conduzimos
            cada processo até ao fim.
          </p>

          <div class="mt-11 flex flex-col gap-4 sm:flex-row">
            <NuxtLink to="/servicos" class="btn-primary border-white bg-white text-graphite-950 hover:bg-graphite-100 hover:border-graphite-100">
              Ver os nossos serviços
            </NuxtLink>
            <NuxtLink to="/contacto" class="btn-ghost-light">Falar com um consultor</NuxtLink>
          </div>

          <dl class="mt-20 grid max-w-2xl grid-cols-2 gap-8 border-t border-white/10 pt-10 sm:grid-cols-4">
            <div v-for="item in numbers" :key="item.label">
              <dt class="sr-only">{{ item.label }}</dt>
              <dd>
                <span class="block font-display text-3xl text-white">{{ item.value }}</span>
                <span class="mt-1.5 block text-[11px] uppercase tracking-[0.14em] text-graphite-400">
                  {{ item.label }}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>

    <!-- ------------------------------- Sobre ------------------------------- -->
    <section class="py-24 lg:py-32">
      <div class="container-page grid gap-14 lg:grid-cols-12 lg:gap-20">
        <div class="lg:col-span-5">
          <p class="eyebrow">Quem somos</p>
          <h2 class="section-title mt-4">
            Uma consultoria angolana construída sobre especialização.
          </h2>
        </div>

        <div class="lg:col-span-7">
          <div class="prose-institucional">
            <p>
              A Alson Sombreiro Consultadoria é uma empresa de direito angolano, constituída em 2019,
              com origem num conjunto de entidades empresariais nacionais com vasto conhecimento da
              realidade do País e especializadas nos vários domínios da sua actividade.
            </p>
            <p>
              A sua criação resultou do crescente volume de trabalho registado nessas entidades na
              área do imobiliário e da importância que a especialização representa neste sector no
              panorama nacional.
            </p>
            <p>
              É nosso principal desígnio contribuir para o desenvolvimento e fortalecimento do País,
              transmitindo e capacitando os quadros nacionais nas melhores práticas de gestão,
              adaptadas às especificidades da economia, sociedade e cultura angolanas.
            </p>
          </div>

          <NuxtLink
            to="/sobre"
            class="mt-8 inline-flex items-center gap-2 border-b border-graphite-950 pb-1 text-[12px] font-medium uppercase tracking-[0.16em] text-graphite-950"
          >
            Conhecer a empresa
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ------------------------------ Valores ------------------------------ -->
    <section class="border-y border-graphite-200 bg-white py-20">
      <div class="container-page">
        <div class="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="pillar in pillars" :key="pillar.title">
            <div class="h-px w-10 bg-graphite-950" aria-hidden="true" />
            <h3 class="mt-5 text-[15px] font-medium tracking-wide text-graphite-950">
              {{ pillar.title }}
            </h3>
            <p class="mt-3 text-[14px] leading-[1.8] text-graphite-500">{{ pillar.body }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ------------------------------ Serviços ----------------------------- -->
    <section id="servicos" class="py-24 lg:py-32">
      <div class="container-page">
        <div class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div class="max-w-2xl">
            <p class="eyebrow">O que fazemos</p>
            <h2 class="section-title mt-4">Todos os serviços prestados</h2>
            <p class="prose-institucional mt-4">
              Cada serviço tem o seu próprio formulário de pedido. Submeta online e receba um número de
              referência para acompanhar o processo do início ao fim.
            </p>
          </div>
          <NuxtLink to="/servicos" class="btn-outline shrink-0">Ver todos</NuxtLink>
        </div>

        <div class="mt-14 grid gap-px bg-graphite-200 sm:grid-cols-2 lg:grid-cols-3">
          <ServiceCard
            v-for="(service, index) in services"
            :key="service.id"
            :service="service"
            :index="index"
          />
        </div>

        <p v-if="!services?.length" class="mt-14 text-center text-[15px] text-graphite-400">
          Os serviços estão a ser actualizados. Contacte-nos directamente através de
          <a :href="`mailto:${COMPANY.email}`" class="underline">{{ COMPANY.email }}</a
          >.
        </p>
      </div>
    </section>

    <!-- ---------------------------- Prova social --------------------------- -->
    <section class="border-t border-graphite-200 bg-white py-24 lg:py-32">
      <div class="container-page">
        <div class="max-w-2xl">
          <p class="eyebrow">Experiência comprovada</p>
          <h2 class="section-title mt-4">Processos que conduzimos</h2>
          <p class="prose-institucional mt-4">
            Uma amostra dos trabalhos realizados em avaliação patrimonial, legalização e intermediação
            imobiliária, para empresas e instituições em várias províncias.
          </p>
        </div>

        <div class="mt-14 grid gap-px bg-graphite-200 md:grid-cols-2">
          <article
            v-for="item in [
              {
                client: 'Sinfic',
                work: 'Legalização do património imobiliário',
                place: 'Benguela',
                year: '2020',
              },
              {
                client: 'Silva & Silva, Lda',
                work: 'Avaliação patrimonial da fábrica de corte e polimento de mármores e granito',
                place: 'Namibe',
                year: '2020',
              },
              {
                client: 'CGEN (Centro de Multiplicação Genética)',
                work: 'Avaliação imobiliária',
                place: 'Huambo',
                year: '2020',
              },
              {
                client: 'EFCU, EP (Empresa Fabril de Calçados e Uniformes)',
                work: 'Avaliação do património imobiliário',
                place: 'Luanda',
                year: '2018',
              },
              {
                client: 'Fazenda Agro-Pecuária Kizuze',
                work: 'Avaliação do património, Planalto de Camabatela',
                place: 'Cuanza Norte',
                year: '2019',
              },
              {
                client: 'PEA (Projectos Educativos de Angola)',
                work: 'Avaliação do património imobiliário',
                place: 'Benguela',
                year: '2017',
              },
            ]"
            :key="item.client"
            class="bg-white p-8"
          >
            <div class="flex items-baseline justify-between gap-4">
              <h3 class="text-[15px] font-medium text-graphite-950">{{ item.client }}</h3>
              <span class="shrink-0 font-mono text-[12px] text-graphite-400">{{ item.year }}</span>
            </div>
            <p class="mt-2.5 text-[14px] leading-relaxed text-graphite-500">{{ item.work }}</p>
            <p class="mt-4 text-[11px] uppercase tracking-[0.16em] text-graphite-400">
              {{ item.place }}
            </p>
          </article>
        </div>
      </div>
    </section>

    <!-- ------------------------------- FESADA ------------------------------ -->
    <section v-if="featured.length" class="brand-gradient py-24 text-white lg:py-32">
      <div class="container-page grid gap-14 lg:grid-cols-12 lg:gap-20">
        <div class="lg:col-span-5">
          <p class="eyebrow text-graphite-400">Em destaque</p>
          <h2 class="section-title mt-4 text-white">
            O seu imóvel na centralidade, finalmente regularizado.
          </h2>
          <p class="mt-6 text-[15px] leading-[1.85] text-graphite-300">
            Angola conta com mais de vinte centralidades habitacionais e cerca de 85 mil habitações
            comercializadas, muitas delas ainda por regularizar. Sem registo, o proprietário vê
            limitado o direito de vender, arrendar, hipotecar ou transmitir por herança.
          </p>
          <NuxtLink to="/servicos/fesada-centralidades" class="btn-ghost-light mt-9">
            Conhecer o pacote FESADA
          </NuxtLink>
        </div>

        <div class="lg:col-span-7">
          <ul class="grid gap-px bg-white/10 sm:grid-cols-2">
            <li
              v-for="benefit in [
                'Regularização, legalização e transmissão num único processo',
                'Segurança jurídica, sem risco de reivindicações',
                'Acesso facilitado a crédito bancário',
                'Trespasse sem entraves em cartório',
                'Valorização imediata no mercado formal',
                'Condições especiais para imóveis das centralidades',
              ]"
              :key="benefit"
              class="brand-gradient p-7"
            >
              <svg
                class="h-5 w-5 text-white/40"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <p class="mt-4 text-[14px] leading-relaxed text-graphite-200">{{ benefit }}</p>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ------------------------------- Contacto ---------------------------- -->
    <section class="py-24 lg:py-28">
      <div class="container-page">
        <div class="surface-card flex flex-col items-center gap-8 p-10 text-center lg:flex-row lg:justify-between lg:p-14 lg:text-left">
          <div class="max-w-xl">
            <h2 class="section-title">Tem um imóvel ou património a tratar?</h2>
            <p class="prose-institucional mt-3">
              Escolha o serviço, preencha o formulário e receba um número de referência. Respondemos a
              todos os pedidos.
            </p>
          </div>
          <div class="flex shrink-0 flex-col gap-3 sm:flex-row">
            <NuxtLink to="/servicos" class="btn-primary">Submeter pedido</NuxtLink>
            <NuxtLink to="/acompanhar" class="btn-outline">Acompanhar pedido</NuxtLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
