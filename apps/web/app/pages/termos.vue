<script setup lang="ts">
useSeo({
  title: 'Termos de Utilização',
  description:
    'Condições de utilização do site institucional da Alson Sombreiro Consultadoria, Lda e do serviço de submissão de pedidos online.',
  path: '/termos',
});

const sections = [
  {
    title: '1. Objecto',
    paragraphs: [
      'Estes termos regulam o acesso e a utilização do site institucional da Alson Sombreiro Consultadoria, Lda, incluindo o serviço de submissão de pedidos de serviço em linha.',
      'A utilização do site implica a aceitação integral destas condições.',
    ],
  },
  {
    title: '2. Natureza da informação',
    paragraphs: [
      'A informação disponibilizada tem carácter meramente informativo e não constitui, por si só, uma proposta contratual, um parecer técnico ou uma avaliação.',
      'Qualquer avaliação, parecer ou relatório só produz efeitos quando emitido por escrito, assinado por técnico habilitado e no âmbito de um serviço formalmente contratado.',
    ],
  },
  {
    title: '3. Submissão de pedidos',
    paragraphs: [
      'A submissão de um pedido através do site não constitui aceitação do serviço nem vincula a Alson Sombreiro à sua prestação. O pedido é analisado e o cliente é contactado com a proposta aplicável.',
      'O utilizador compromete-se a fornecer informação verdadeira, completa e actualizada. A prestação de informação falsa pode inviabilizar o processo e implicar responsabilidade nos termos da lei.',
      'O número de referência atribuído destina-se exclusivamente ao acompanhamento do processo e deve ser conservado pelo requerente.',
    ],
  },
  {
    title: '4. Documentos anexados',
    paragraphs: [
      'Os documentos carregados através dos formulários devem respeitar os formatos e limites de dimensão indicados em cada campo.',
      'O utilizador garante que detém os direitos ou a legitimidade necessários para partilhar os documentos submetidos.',
    ],
  },
  {
    title: '5. Propriedade intelectual',
    paragraphs: [
      'A marca, o logótipo, os textos e os demais elementos do site são propriedade da Alson Sombreiro Consultadoria, Lda ou usados com autorização, não podendo ser reproduzidos sem consentimento escrito.',
    ],
  },
  {
    title: '6. Disponibilidade',
    paragraphs: [
      'Envidamos os melhores esforços para manter o site disponível e funcional, sem contudo garantir a inexistência de interrupções por motivos técnicos, de manutenção ou alheios ao nosso controlo.',
    ],
  },
  {
    title: '7. Lei aplicável',
    paragraphs: [
      'Estes termos regem-se pela lei angolana. Para a resolução de qualquer litígio emergente da sua interpretação ou execução é competente o foro da Comarca de Benguela, com renúncia expressa a qualquer outro.',
    ],
  },
];
</script>

<template>
  <div>
    <section class="border-b border-graphite-200 bg-white py-16 lg:py-20">
      <div class="container-page max-w-3xl">
        <p class="eyebrow">Informação legal</p>
        <h1 class="display-title mt-4">Termos de Utilização</h1>
        <p class="mt-5 text-[14px] text-graphite-400">
          Última actualização: {{ new Date().toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }) }}
        </p>
      </div>
    </section>

    <section class="py-14 lg:py-20">
      <div class="container-page max-w-3xl">
        <article v-for="section in sections" :key="section.title" class="mb-11">
          <h2 class="text-[17px] font-medium tracking-wide text-graphite-950">{{ section.title }}</h2>
          <div class="prose-institucional mt-4">
            <p v-for="(paragraph, index) in section.paragraphs" :key="index">{{ paragraph }}</p>
          </div>
        </article>

        <div class="border-l-2 border-graphite-950 bg-white p-6">
          <p class="text-[14px] leading-relaxed text-graphite-600">
            {{ COMPANY.legalName }} · Sede: {{ COMPANY.offices[0].address }}, {{ COMPANY.offices[0].city }}
          </p>
        </div>
      </div>
    </section>
  </div>
</template>
