<script setup lang="ts">
definePageMeta({ heroUnderHeader: true });
useSeo({
  title: 'A empresa',
  description:
    'A Alson Sombreiro Consultadoria, Lda é uma empresa angolana constituída em 2019, especializada em mediação imobiliária, gestão de património e registo de imóveis.',
  path: '/sobre',
});

const team = [
  {
    role: 'Steering Committee',
    name: 'Jorge Bento',
    credentials: [
      'Perito Avaliador Imobiliário inscrito na Comissão do Mercado de Capitais sob o n.º 002/PAI/CMC/01-19',
      'Analista de Investimentos Imobiliários certificado pela Academia AFB n.º 2019-1978',
    ],
    body: 'Órgão máximo na prestação dos serviços: gestão estratégica, aprovação dos meios humanos, técnicos e financeiros, e aprovação dos resultados finais.',
  },
  {
    role: 'Quality Assurance',
    name: 'Alfredo Henriques',
    credentials: [
      'Bacharel em Marketing pelo ISP Jean Piaget',
      'Curso técnico-profissional de Navegação Marítima, Instituto Marítimo e Portuário de Angola, cédula 00173',
    ],
    body: 'Acompanhamento sistemático e avaliação dos diferentes aspectos do trabalho, garantindo o cumprimento dos padrões de qualidade definidos.',
  },
];

const specialists = [
  {
    name: 'Dr. Job Bonga Paulo Quibonda',
    items: [
      'Advogado, cédula profissional 3043',
      'Licenciado em Direito, Centro Universitário Maurício de Nassau (Brasil), 2014',
      'Licenciado em Gestão de Recursos Humanos, ISGMA (Brasil), 2013',
    ],
  },
  {
    name: 'Dr. António Vicente Ventura Kativa',
    items: [
      'Licenciado em Direito, Instituto Superior Politécnico Católico de Benguela, 2014',
      'Director do Gabinete Jurídico da Alson Sombreiro Consultadoria, Lda',
    ],
  },
  {
    name: 'Eng.º Jerson Pedrosa Leal',
    items: [
      'Engenheiro Civil n.º 5532',
      'Licenciado em Engenharia Civil, Universidade Jean Piaget, Benguela',
    ],
  },
  {
    name: 'Dr. Helder Carlos Frederico Biriquita',
    items: ['Advogado, cédula 12.832', 'Licenciado em Direito, Universidade Katyavala Bwila, Benguela'],
  },
  {
    name: 'Dr. José Dikito',
    items: ['Contabilista n.º 20180042', 'Licenciado em Contabilidade e Gestão, Universidade Lusíada'],
  },
];

const values = [
  'Ética e transparência',
  'Comprometimento com o Cliente',
  'Foco nos resultados dos projectos e geração de valor',
  'Satisfação e desenvolvimento dos colaboradores',
  'Responsabilidade social e desenvolvimento sustentável',
];
</script>

<template>
  <div>
    <section class="brand-gradient -mt-20 pb-16 pt-36 text-white lg:pb-24 lg:pt-44">
      <div class="container-page max-w-3xl">
        <p class="eyebrow text-graphite-400">A empresa</p>
        <h1 class="display-title mt-4 text-white">
          Especialização ao serviço do património imobiliário angolano.
        </h1>
        <p class="mt-7 text-[16px] leading-[1.85] text-graphite-300">
          A Alson Sombreiro Consultadoria, Lda é uma empresa de direito angolano, constituída em 2019,
          com origem num conjunto de entidades empresariais nacionais especializadas nos vários
          domínios da sua actividade.
        </p>
      </div>
    </section>

    <!-- Missão / Visão -->
    <section class="py-16 lg:py-24">
      <div class="container-page grid gap-px bg-graphite-200 md:grid-cols-3">
        <div class="bg-white p-9">
          <p class="eyebrow">Missão</p>
          <p class="prose-institucional mt-4">
            Oferecer serviços nas áreas da mediação imobiliária, gestão de património e registo de
            imóveis, usando as melhores práticas de planeamento e controlo para criar as condições
            necessárias ao sucesso de cada empreendimento em segurança, qualidade, prazos e custos.
          </p>
        </div>

        <div class="bg-white p-9">
          <p class="eyebrow">Visão</p>
          <p class="prose-institucional mt-4">
            Sermos reconhecidos como uma empresa diferenciada nas áreas da mediação imobiliária, gestão
            de património e registo de imóveis, através do compromisso com os clientes e com os
            colaboradores, contribuindo para o desenvolvimento do país.
          </p>
        </div>

        <div class="bg-white p-9">
          <p class="eyebrow">Valores</p>
          <ul class="mt-4 space-y-2.5">
            <li v-for="value in values" :key="value" class="flex gap-2.5">
              <span class="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-graphite-950" aria-hidden="true" />
              <span class="text-[14px] leading-[1.7] text-graphite-600">{{ value }}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Onde estamos -->
    <section class="border-y border-graphite-200 bg-white py-16 lg:py-24">
      <div class="container-page grid gap-14 lg:grid-cols-12 lg:gap-20">
        <div class="lg:col-span-5">
          <p class="eyebrow">Onde estamos</p>
          <h2 class="section-title mt-4">Presença directa em três províncias</h2>
          <p class="prose-institucional mt-5">
            Com escritórios em Benguela, Luanda e Huambo, e mobilidade em toda a região Centro-Sul do
            país, temos um conhecimento ímpar das realidades locais, uma mais-valia acrescida e de
            enorme assertividade no nosso desempenho.
          </p>
        </div>

        <div class="lg:col-span-7">
          <div class="grid gap-px bg-graphite-200 sm:grid-cols-3">
            <div v-for="office in COMPANY.offices" :key="office.city" class="bg-white p-7">
              <p class="font-display text-2xl text-graphite-950">{{ office.city }}</p>
              <p class="mt-1 text-[11px] uppercase tracking-[0.16em] text-graphite-400">
                {{ office.label }}
              </p>
              <p class="mt-4 text-[14px] leading-relaxed text-graphite-600">{{ office.address }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Quadro técnico -->
    <section class="py-16 lg:py-24">
      <div class="container-page">
        <div class="max-w-2xl">
          <p class="eyebrow">Quadro técnico permanente</p>
          <h2 class="section-title mt-4">Uma equipa pluridisciplinar</h2>
          <p class="prose-institucional mt-5">
            Dispomos de colaboradores regulares em domínios específicos, aptos a intervir sempre que o
            âmbito e a natureza dos trabalhos o determinem, formando equipas de trabalho
            pluridisciplinares.
          </p>
        </div>

        <div class="mt-12 grid gap-px bg-graphite-200 md:grid-cols-2">
          <article v-for="member in team" :key="member.name" class="bg-white p-8">
            <p class="eyebrow">{{ member.role }}</p>
            <h3 class="mt-3 text-[19px] font-medium text-graphite-950">{{ member.name }}</h3>
            <ul class="mt-4 space-y-2">
              <li
                v-for="credential in member.credentials"
                :key="credential"
                class="text-[13px] leading-relaxed text-graphite-500"
              >
                {{ credential }}
              </li>
            </ul>
            <p class="mt-5 border-t border-graphite-100 pt-5 text-[14px] leading-[1.75] text-graphite-600">
              {{ member.body }}
            </p>
          </article>
        </div>

        <div class="mt-14">
          <p class="eyebrow">Painel de especialistas</p>
          <p class="prose-institucional mt-3 max-w-2xl">
            Apoio fundamental para o sucesso e eficiência dos serviços, com largo conhecimento e
            experiência em diversos sectores de actividade.
          </p>

          <div class="mt-8 grid gap-px bg-graphite-200 sm:grid-cols-2 lg:grid-cols-3">
            <article v-for="person in specialists" :key="person.name" class="bg-white p-7">
              <h3 class="text-[15px] font-medium leading-snug text-graphite-950">{{ person.name }}</h3>
              <ul class="mt-3 space-y-1.5">
                <li v-for="item in person.items" :key="item" class="text-[13px] leading-relaxed text-graphite-500">
                  {{ item }}
                </li>
              </ul>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section class="border-t border-graphite-200 bg-white py-16 lg:py-20">
      <div class="container-page text-center">
        <h2 class="section-title">Podemos ajudar no seu processo?</h2>
        <p class="prose-institucional mx-auto mt-3 max-w-xl">
          Escolha o serviço adequado e submeta o pedido online. Respondemos a todos.
        </p>
        <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <NuxtLink to="/servicos" class="btn-primary">Ver serviços</NuxtLink>
          <NuxtLink to="/contacto" class="btn-outline">Contactar</NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
