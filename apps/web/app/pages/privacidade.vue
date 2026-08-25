<script setup lang="ts">
useSeo({
  title: 'Política de Privacidade',
  description:
    'Como a Alson Sombreiro Consultadoria recolhe, trata e protege os dados pessoais submetidos através do site.',
  path: '/privacidade',
});

const sections = [
  {
    title: '1. Responsável pelo tratamento',
    paragraphs: [
      'A Alson Sombreiro Consultadoria, Lda, com sede na Rua Alexandre Herculano n.º 35, Benguela, é a entidade responsável pelo tratamento dos dados pessoais recolhidos através deste site.',
      'Para qualquer questão relacionada com privacidade, contacte-nos através de geral@alsonsombreiro.ao.',
    ],
  },
  {
    title: '2. Dados recolhidos',
    paragraphs: [
      'Recolhemos os dados que nos fornece voluntariamente ao submeter um pedido de serviço ou uma mensagem de contacto: nome, endereço de e-mail, telefone e a informação específica solicitada no formulário do serviço escolhido, incluindo eventuais documentos anexados.',
      'Por motivos de segurança e prevenção de abuso, registamos ainda o endereço IP e o identificador do navegador no momento da submissão.',
    ],
  },
  {
    title: '3. Finalidade e fundamento',
    paragraphs: [
      'Os dados são tratados exclusivamente para analisar e responder ao seu pedido, gerir o processo até à sua conclusão e cumprir obrigações legais aplicáveis à actividade de mediação imobiliária e avaliação.',
      'O fundamento do tratamento é o seu consentimento, prestado no momento da submissão, e a execução de diligências pré-contratuais a seu pedido.',
    ],
  },
  {
    title: '4. Conservação',
    paragraphs: [
      'Os dados associados a um pedido são conservados enquanto o processo estiver activo e, após a sua conclusão, pelo período necessário ao cumprimento das obrigações legais de arquivo aplicáveis.',
      'Findo esse período, os dados são eliminados ou anonimizados.',
    ],
  },
  {
    title: '5. Partilha com terceiros',
    paragraphs: [
      'Não vendemos nem cedemos dados pessoais a terceiros para fins comerciais.',
      'Os dados podem ser partilhados com entidades públicas competentes (conservatórias, administrações municipais, tribunais) quando tal seja necessário à execução do serviço contratado, e com prestadores técnicos que actuam como subcontratantes sob obrigação de confidencialidade.',
    ],
  },
  {
    title: '6. Segurança',
    paragraphs: [
      'Adoptamos medidas técnicas e organizativas adequadas para proteger os dados contra acesso não autorizado, perda ou divulgação indevida, incluindo controlo de acessos por perfil, cifragem das credenciais e registo de auditoria de todas as operações sobre dados sensíveis.',
    ],
  },
  {
    title: '7. Os seus direitos',
    paragraphs: [
      'Pode solicitar, a qualquer momento, o acesso aos seus dados, a sua rectificação, o apagamento, a limitação do tratamento ou a portabilidade, bem como retirar o consentimento prestado.',
      'Para exercer estes direitos, contacte-nos através de geral@alsonsombreiro.ao, indicando o número de referência do processo, se aplicável.',
    ],
  },
  {
    title: '8. Cookies',
    paragraphs: [
      'Este site não utiliza cookies de rastreamento nem ferramentas de publicidade comportamental. São usados apenas os mecanismos técnicos estritamente necessários ao funcionamento das páginas.',
    ],
  },
];
</script>

<template>
  <div>
    <section class="border-b border-graphite-200 bg-white py-16 lg:py-20">
      <div class="container-page max-w-3xl">
        <p class="eyebrow">Informação legal</p>
        <h1 class="display-title mt-4">Política de Privacidade</h1>
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
            Questões sobre esta política? Escreva para
            <a :href="`mailto:${COMPANY.email}`" class="text-graphite-950 underline">{{ COMPANY.email }}</a>
            ou telefone para {{ COMPANY.phones[0] }}.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>
