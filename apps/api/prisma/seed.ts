/**
 * Seed da base de dados.
 *
 * Popula perfis, utilizadores de demonstração, o pipeline de estados e o
 * catálogo real de serviços da Alson Sombreiro Consultadoria, cada um com o
 * seu formulário já configurado, e cria alguns pedidos de exemplo para que o
 * dashboard e o Kanban tenham conteúdo ao primeiro arranque.
 *
 * É idempotente: pode ser executado repetidamente sem duplicar dados.
 */
import { PrismaClient, type FieldType, type Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Alson@2026';

/* -------------------------------------------------------------------------- */
/*  Perfis e utilizadores                                                     */
/* -------------------------------------------------------------------------- */

const ROLES = [
  {
    name: 'ADMIN' as const,
    label: 'Administrador',
    description: 'Acesso total: utilizadores, serviços, pipeline e auditoria.',
    permissions: ['*'],
  },
  {
    name: 'GESTOR' as const,
    label: 'Gestor',
    description: 'Gere serviços, formulários e todo o ciclo de vida dos pedidos.',
    permissions: [
      'services:read',
      'services:write',
      'requests:read',
      'requests:write',
      'requests:assign',
      'notes:write',
    ],
  },
  {
    name: 'AGENTE' as const,
    label: 'Agente',
    description: 'Trata os pedidos que lhe são atribuídos e regista notas internas.',
    permissions: ['services:read', 'requests:read', 'requests:write', 'notes:write'],
  },
];

const USERS = [
  { name: 'Jorge Bento', email: 'admin@alsonsombreiro.ao', role: 'ADMIN' as const, phone: '+244 923 075 864' },
  { name: 'Alfredo Henriques', email: 'gestor@alsonsombreiro.ao', role: 'GESTOR' as const, phone: '+244 924 938 576' },
  { name: 'António Kativa', email: 'agente@alsonsombreiro.ao', role: 'AGENTE' as const, phone: '+244 921 025 514' },
];

/* -------------------------------------------------------------------------- */
/*  Pipeline                                                                  */
/* -------------------------------------------------------------------------- */

const STATUSES = [
  { key: 'novo', name: 'Novo', color: '#3F3F46', order: 0, isInitial: true, isFinal: false, notifyRequester: false },
  { key: 'em_triagem', name: 'Em triagem', color: '#6366F1', order: 1, isInitial: false, isFinal: false, notifyRequester: true },
  { key: 'em_analise', name: 'Em análise', color: '#0EA5E9', order: 2, isInitial: false, isFinal: false, notifyRequester: true },
  { key: 'proposta_enviada', name: 'Proposta enviada', color: '#F59E0B', order: 3, isInitial: false, isFinal: false, notifyRequester: true },
  { key: 'em_execucao', name: 'Em execução', color: '#8B5CF6', order: 4, isInitial: false, isFinal: false, notifyRequester: true },
  { key: 'concluido', name: 'Concluído', color: '#10B981', order: 5, isInitial: false, isFinal: true, notifyRequester: true },
  { key: 'cancelado', name: 'Cancelado', color: '#EF4444', order: 6, isInitial: false, isFinal: true, notifyRequester: true },
];

/* -------------------------------------------------------------------------- */
/*  Campos reutilizados entre formulários                                     */
/* -------------------------------------------------------------------------- */

interface SeedField {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  width?: 1 | 2;
  options?: Array<{ label: string; value: string }>;
  validation?: Record<string, unknown>;
}

const PROVINCIAS = [
  'Bengo', 'Benguela', 'Bié', 'Cabinda', 'Cuando', 'Cuando Cubango', 'Cuanza Norte',
  'Cuanza Sul', 'Cunene', 'Huambo', 'Huíla', 'Icolo e Bengo', 'Luanda', 'Lunda Norte',
  'Lunda Sul', 'Malanje', 'Moxico', 'Moxico Leste', 'Namibe', 'Uíge', 'Zaire',
].map((nome) => ({ label: nome, value: nome.toLowerCase().replace(/\s+/g, '-') }));

const campoProvincia = (required = true): SeedField => ({
  key: 'provincia',
  label: 'Província do imóvel',
  type: 'SELECT',
  required,
  width: 1,
  options: PROVINCIAS,
  helpText: 'A Alson Sombreiro actua directamente em Luanda, Benguela e Huambo.',
});

const campoMunicipio: SeedField = {
  key: 'municipio',
  label: 'Município / Bairro',
  type: 'TEXT',
  placeholder: 'Ex.: Lobito, Bairro da Restinga',
  required: true,
  width: 1,
  validation: { min: 3, max: 120 },
};

const campoEndereco: SeedField = {
  key: 'endereco',
  label: 'Endereço completo do imóvel',
  type: 'TEXT',
  placeholder: 'Rua, número, ponto de referência',
  required: true,
  width: 2,
  validation: { min: 5, max: 240 },
};

const campoTipoImovel = (required = true): SeedField => ({
  key: 'tipo_imovel',
  label: 'Tipo de imóvel',
  type: 'SELECT',
  required,
  width: 1,
  options: [
    { label: 'Apartamento', value: 'apartamento' },
    { label: 'Moradia / Vivenda', value: 'moradia' },
    { label: 'Terreno', value: 'terreno' },
    { label: 'Loja / Espaço comercial', value: 'loja' },
    { label: 'Armazém', value: 'armazem' },
    { label: 'Escritório', value: 'escritorio' },
    { label: 'Fazenda / Propriedade rural', value: 'fazenda' },
    { label: 'Edifício completo', value: 'edificio' },
  ],
});

const campoArea: SeedField = {
  key: 'area_m2',
  label: 'Área aproximada (m²)',
  type: 'NUMBER',
  placeholder: '120',
  required: true,
  width: 1,
  validation: { min: 1, max: 10_000_000, decimals: 2 },
};

const campoDocumentos = (
  label = 'Documentos do imóvel',
  required = false,
  helpText = 'Anexe título de propriedade, planta, contrato de compra e venda ou outros documentos relevantes.',
): SeedField => ({
  key: 'documentos',
  label,
  type: 'FILE',
  required,
  width: 2,
  helpText,
  validation: {
    maxItems: 5,
    maxFileSize: 10 * 1024 * 1024,
    acceptedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
  },
});

const campoObservacoes: SeedField = {
  key: 'observacoes',
  label: 'Observações adicionais',
  type: 'TEXTAREA',
  placeholder: 'Descreva qualquer informação que considere relevante para o seu processo.',
  required: false,
  width: 2,
  validation: { max: 2000 },
};

const campoPrazo: SeedField = {
  key: 'prazo_pretendido',
  label: 'Data limite pretendida',
  type: 'DATE',
  required: false,
  width: 1,
  helpText: 'Indique até quando precisa do serviço concluído, se aplicável.',
};

/* -------------------------------------------------------------------------- */
/*  Catálogo de serviços                                                      */
/* -------------------------------------------------------------------------- */

interface SeedService {
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  benefits: string[];
  icon: string;
  featured?: boolean;
  order: number;
  metaTitle: string;
  metaDescription: string;
  fields: SeedField[];
}

const SERVICES: SeedService[] = [
  {
    slug: 'fesada-centralidades',
    name: 'FESADA: Regularização de Imóveis nas Centralidades',
    shortDescription:
      'Pacote completo que agrupa regularização, legalização e compra e venda de imóveis das centralidades habitacionais, com condições especiais.',
    description:
      'Angola conta com mais de vinte centralidades habitacionais e cerca de 85 mil habitações comercializadas. Muitas destas moradias continuam por regularizar, o que reduz as garantias jurídicas do titular, dificulta o trespasse e desvaloriza o imóvel.\n\nA FESADA é a resposta da Alson Sombreiro: um pacote desburocratizado que reúne, num único processo e com condições especiais, a regularização, a legalização e a intermediação na compra e venda de imóveis das centralidades.\n\nCom o imóvel regularizado, o proprietário passa a poder vender, arrendar, hipotecar ou transmitir por herança de forma simples e segura, e os bancos concedem crédito com muito maior facilidade.',
    benefits: [
      'Processo único: regularização, legalização e transmissão',
      'Segurança jurídica, sem risco de reivindicações ou disputas',
      'Facilidade acrescida na obtenção de crédito bancário',
      'Trespasse e transferência sem entraves em cartório',
      'Valorização imediata do imóvel no mercado formal',
    ],
    icon: 'shield-check',
    featured: true,
    order: 0,
    metaTitle: 'FESADA: Regularização de Imóveis nas Centralidades | Alson Sombreiro',
    metaDescription:
      'Pacote FESADA: regularização, legalização e compra e venda de imóveis das centralidades habitacionais em Angola, com segurança jurídica e condições especiais.',
    fields: [
      {
        key: 'centralidade',
        label: 'Centralidade onde se situa o imóvel',
        type: 'TEXT',
        placeholder: 'Ex.: Centralidade do Kilamba',
        required: true,
        width: 1,
        validation: { min: 3, max: 120 },
      },
      campoProvincia(),
      {
        key: 'tipologia',
        label: 'Tipologia da habitação',
        type: 'SELECT',
        required: true,
        width: 1,
        options: [
          { label: 'T1', value: 't1' },
          { label: 'T2', value: 't2' },
          { label: 'T3', value: 't3' },
          { label: 'T4 ou superior', value: 't4' },
          { label: 'Loja / Espaço comercial', value: 'loja' },
        ],
      },
      {
        key: 'situacao_pagamento',
        label: 'Situação do pagamento',
        type: 'SELECT',
        required: true,
        width: 1,
        helpText: 'O promitente comprador só é proprietário oficial após a liquidação total das prestações.',
        options: [
          { label: 'Totalmente liquidado', value: 'liquidado' },
          { label: 'Em prestações (em dia)', value: 'prestacoes_em_dia' },
          { label: 'Em prestações (com atraso)', value: 'prestacoes_atraso' },
          { label: 'Pretendo fazer trespasse', value: 'trespasse' },
        ],
      },
      {
        key: 'servicos_pretendidos',
        label: 'Serviços pretendidos',
        type: 'MULTISELECT',
        required: true,
        width: 2,
        options: [
          { label: 'Regularização documental', value: 'regularizacao' },
          { label: 'Legalização e registo predial', value: 'legalizacao' },
          { label: 'Intermediação na compra', value: 'compra' },
          { label: 'Intermediação na venda', value: 'venda' },
          { label: 'Trespasse a terceiro', value: 'trespasse' },
        ],
        validation: { minItems: 1 },
      },
      {
        key: 'numero_bi',
        label: 'Número do Bilhete de Identidade',
        type: 'TEXT',
        placeholder: '000000000LA000',
        required: true,
        width: 1,
        helpText: 'Conforme consta no documento de identificação.',
        validation: {
          pattern: '^[0-9]{9}[A-Za-z]{2}[0-9]{3}$',
          patternMessage: 'Formato esperado: 9 algarismos, 2 letras e 3 algarismos (ex.: 000000000LA000).',
        },
      },
      campoDocumentos(
        'Contrato de compra e venda e comprovativos',
        false,
        'Anexe o contrato-promessa, comprovativos de pagamento e cópia do BI.',
      ),
      campoObservacoes,
    ],
  },
  {
    slug: 'avaliacao-imobiliaria',
    name: 'Avaliação Imobiliária',
    shortDescription:
      'Determinação rigorosa do valor de mercado do seu imóvel por perito avaliador inscrito na Comissão do Mercado de Capitais.',
    description:
      'A avaliação imobiliária estabelece, com fundamentação técnica, o valor de mercado de um imóvel numa data determinada.\n\nOs nossos relatórios são elaborados por perito avaliador imobiliário inscrito na Comissão do Mercado de Capitais (n.º 002/PAI/CMC/01-19) e seguem as melhores práticas internacionais adaptadas à realidade angolana, sendo aceites por instituições bancárias, tribunais e entidades públicas.',
    benefits: [
      'Perito avaliador inscrito na CMC sob o n.º 002/PAI/CMC/01-19',
      'Relatório aceite por bancos, tribunais e entidades públicas',
      'Conhecimento profundo dos mercados de Luanda, Benguela e Huambo',
      'Fundamentação técnica detalhada e comparáveis de mercado',
    ],
    icon: 'chart-bar',
    featured: true,
    order: 1,
    metaTitle: 'Avaliação Imobiliária em Angola | Alson Sombreiro Consultadoria',
    metaDescription:
      'Avaliação imobiliária por perito inscrito na CMC. Relatórios aceites por bancos e tribunais, em Luanda, Benguela e Huambo.',
    fields: [
      campoTipoImovel(),
      campoProvincia(),
      campoMunicipio,
      campoArea,
      campoEndereco,
      {
        key: 'finalidade',
        label: 'Finalidade da avaliação',
        type: 'SELECT',
        required: true,
        width: 1,
        options: [
          { label: 'Garantia bancária / crédito', value: 'credito' },
          { label: 'Compra ou venda', value: 'transaccao' },
          { label: 'Partilha ou herança', value: 'partilha' },
          { label: 'Processo judicial', value: 'judicial' },
          { label: 'Registo contabilístico', value: 'contabilistico' },
          { label: 'Seguro', value: 'seguro' },
        ],
      },
      {
        key: 'estado_conservacao',
        label: 'Estado de conservação',
        type: 'SELECT',
        required: false,
        width: 1,
        options: [
          { label: 'Novo', value: 'novo' },
          { label: 'Bom', value: 'bom' },
          { label: 'Razoável', value: 'razoavel' },
          { label: 'A necessitar de obras', value: 'obras' },
          { label: 'Em construção', value: 'construcao' },
        ],
      },
      campoPrazo,
      campoDocumentos(),
      campoObservacoes,
    ],
  },
  {
    slug: 'registo-legalizacao-imoveis',
    name: 'Registo e Legalização de Imóveis',
    shortDescription:
      'Tratamos de todo o processo de registo predial e legalização, do levantamento documental à emissão do título.',
    description:
      'A falta de registo ou de regularização jurídica de um imóvel reduz as garantias do seu titular, limita o direito de o transmitir a terceiros e desvaloriza-o no mercado.\n\nA Alson Sombreiro conduz o processo de ponta a ponta: levantamento e análise da documentação existente, identificação de irregularidades, articulação com as conservatórias e entidades competentes e acompanhamento até à emissão do título definitivo.',
    benefits: [
      'Processo acompanhado do início ao fim por gabinete jurídico próprio',
      'Experiência comprovada em legalizações empresariais e particulares',
      'Articulação directa com conservatórias e administrações municipais',
      'Relatório periódico do ponto de situação',
    ],
    icon: 'document-check',
    order: 2,
    metaTitle: 'Registo e Legalização de Imóveis em Angola | Alson Sombreiro',
    metaDescription:
      'Registo predial e legalização de imóveis em Angola com acompanhamento jurídico integral, em Benguela, Luanda e Huambo.',
    fields: [
      campoTipoImovel(),
      campoProvincia(),
      campoEndereco,
      {
        key: 'situacao_actual',
        label: 'Situação documental actual',
        type: 'SELECT',
        required: true,
        width: 2,
        options: [
          { label: 'Sem qualquer documentação', value: 'sem_documentos' },
          { label: 'Apenas contrato de compra e venda', value: 'contrato' },
          { label: 'Título de concessão / direito de superfície', value: 'concessao' },
          { label: 'Documentação incompleta', value: 'incompleta' },
          { label: 'Registo desactualizado (herança, divórcio, etc.)', value: 'desactualizado' },
        ],
      },
      {
        key: 'titular_actual',
        label: 'Nome do titular actual',
        type: 'TEXT',
        required: true,
        width: 1,
        validation: { min: 3, max: 160 },
      },
      {
        key: 'e_proprietario',
        label: 'Declaro ser o proprietário ou legítimo representante do imóvel',
        type: 'CHECKBOX',
        required: true,
        width: 2,
      },
      campoDocumentos('Documentação disponível', false),
      campoObservacoes,
    ],
  },
  {
    slug: 'mediacao-imobiliaria',
    name: 'Mediação na Compra, Venda e Arrendamento',
    shortDescription:
      'Intermediação profissional em transacções imobiliárias, da angariação de interessados à assinatura do contrato.',
    description:
      'Colocamos o seu imóvel no mercado com a avaliação correcta, divulgação dirigida e triagem rigorosa dos interessados, ou encontramos o imóvel que procura.\n\nAcompanhamos a negociação, a preparação documental e a formalização contratual, assegurando que a transacção é concluída com segurança jurídica para ambas as partes.',
    benefits: [
      'Avaliação prévia incluída na angariação',
      'Triagem e qualificação dos interessados',
      'Preparação e verificação documental completa',
      'Acompanhamento até à escritura',
    ],
    icon: 'handshake',
    featured: true,
    order: 3,
    metaTitle: 'Mediação Imobiliária em Angola | Alson Sombreiro Consultadoria',
    metaDescription:
      'Compra, venda e arrendamento de imóveis com mediação profissional em Luanda, Benguela e Huambo.',
    fields: [
      {
        key: 'pretendo',
        label: 'Pretendo',
        type: 'SELECT',
        required: true,
        width: 1,
        options: [
          { label: 'Vender um imóvel', value: 'vender' },
          { label: 'Comprar um imóvel', value: 'comprar' },
          { label: 'Arrendar (proprietário)', value: 'arrendar_proprietario' },
          { label: 'Arrendar (inquilino)', value: 'arrendar_inquilino' },
        ],
      },
      campoTipoImovel(),
      campoProvincia(),
      campoMunicipio,
      {
        key: 'valor_pretendido',
        label: 'Valor pretendido (Kz)',
        type: 'NUMBER',
        placeholder: '25000000',
        required: false,
        width: 1,
        helpText: 'Indicativo. A avaliação técnica pode sugerir um ajuste.',
        validation: { min: 0, decimals: 2 },
      },
      campoArea,
      {
        key: 'caracteristicas',
        label: 'Características do imóvel',
        type: 'MULTISELECT',
        required: false,
        width: 2,
        options: [
          { label: 'Garagem', value: 'garagem' },
          { label: 'Quintal / Jardim', value: 'quintal' },
          { label: 'Piscina', value: 'piscina' },
          { label: 'Mobilado', value: 'mobilado' },
          { label: 'Condomínio fechado', value: 'condominio' },
          { label: 'Gerador', value: 'gerador' },
          { label: 'Furo de água', value: 'furo' },
        ],
      },
      campoDocumentos('Fotografias e documentos do imóvel', false, 'Fotografias ajudam a acelerar a angariação de interessados.'),
      campoObservacoes,
    ],
  },
  {
    slug: 'avaliacao-patrimonial',
    name: 'Avaliação Patrimonial',
    shortDescription:
      'Avaliação do património imobiliário de empresas e instituições para fins contabilísticos, de reestruturação ou de garantia.',
    description:
      'Avaliamos carteiras completas de activos imobiliários de empresas e instituições públicas, produzindo relatórios que suportam decisões de reestruturação, registo contabilístico, obtenção de financiamento ou alienação.\n\nEntre os trabalhos realizados contam-se a avaliação do património imobiliário da EFCU – Empresa Fabril de Calçados e Uniformes (Luanda), da Fábrica de Corte e Polimento de Mármores e Granito Silva & Silva (Namibe) e do CGEN – Centro de Multiplicação Genética (Huambo).',
    benefits: [
      'Equipa pluridisciplinar: engenharia, direito e contabilidade',
      'Experiência com empresas públicas e privadas de grande dimensão',
      'Relatórios compatíveis com as normas contabilísticas em vigor',
      'Cobertura nacional com mobilidade na região Centro-Sul',
    ],
    icon: 'building-office',
    order: 4,
    metaTitle: 'Avaliação Patrimonial de Empresas | Alson Sombreiro Consultadoria',
    metaDescription:
      'Avaliação do património imobiliário de empresas e instituições em Angola, com equipa pluridisciplinar e relatórios técnicos fundamentados.',
    fields: [
      {
        key: 'nome_entidade',
        label: 'Nome da entidade',
        type: 'TEXT',
        required: true,
        width: 2,
        validation: { min: 3, max: 200 },
      },
      {
        key: 'nif',
        label: 'NIF da entidade',
        type: 'TEXT',
        placeholder: '5417000000',
        required: true,
        width: 1,
        validation: { pattern: '^[0-9]{9,10}$', patternMessage: 'O NIF deve ter 9 ou 10 algarismos.' },
      },
      {
        key: 'numero_activos',
        label: 'Número aproximado de activos a avaliar',
        type: 'NUMBER',
        required: true,
        width: 1,
        validation: { min: 1, max: 100_000, decimals: 0 },
      },
      {
        key: 'provincias_activos',
        label: 'Províncias onde se localizam os activos',
        type: 'MULTISELECT',
        required: true,
        width: 2,
        options: PROVINCIAS,
        validation: { minItems: 1 },
      },
      {
        key: 'finalidade_avaliacao',
        label: 'Finalidade da avaliação',
        type: 'SELECT',
        required: true,
        width: 1,
        options: [
          { label: 'Registo contabilístico', value: 'contabilistico' },
          { label: 'Reestruturação empresarial', value: 'reestruturacao' },
          { label: 'Garantia bancária', value: 'garantia' },
          { label: 'Privatização / alienação', value: 'alienacao' },
          { label: 'Auditoria', value: 'auditoria' },
        ],
      },
      campoPrazo,
      {
        key: 'responsavel_contacto',
        label: 'E-mail do responsável técnico da entidade',
        type: 'EMAIL',
        required: false,
        width: 1,
      },
      campoDocumentos('Listagem de activos e documentação de suporte', false),
      campoObservacoes,
    ],
  },
  {
    slug: 'analise-investimentos-imobiliarios',
    name: 'Análise de Investimentos Imobiliários',
    shortDescription:
      'Estudos de viabilidade e análise de rendibilidade para decisões de investimento imobiliário fundamentadas.',
    description:
      'Analisamos a viabilidade económica e financeira de projectos imobiliários, produzindo estudos que suportam a decisão de investir: análise de mercado, projecção de custos e receitas, indicadores de rendibilidade e análise de sensibilidade aos principais riscos.\n\nO trabalho é conduzido por analista de investimentos imobiliários certificado pela Academia AFB.',
    benefits: [
      'Analista de investimentos certificado (Academia AFB n.º 2019-1978)',
      'Indicadores de rendibilidade: VAL, TIR e período de recuperação',
      'Análise de sensibilidade e cenários de risco',
      'Conhecimento actualizado das políticas económicas nacionais',
    ],
    icon: 'trending-up',
    order: 5,
    metaTitle: 'Análise de Investimentos Imobiliários | Alson Sombreiro',
    metaDescription:
      'Estudos de viabilidade e análise de rendibilidade de projectos imobiliários em Angola, por analista certificado.',
    fields: [
      {
        key: 'tipo_investimento',
        label: 'Tipo de investimento',
        type: 'SELECT',
        required: true,
        width: 1,
        options: [
          { label: 'Construção de raiz', value: 'construcao' },
          { label: 'Aquisição para arrendamento', value: 'arrendamento' },
          { label: 'Reabilitação e revenda', value: 'reabilitacao' },
          { label: 'Loteamento', value: 'loteamento' },
          { label: 'Empreendimento turístico', value: 'turistico' },
        ],
      },
      campoProvincia(),
      {
        key: 'montante_investimento',
        label: 'Montante previsto de investimento (Kz)',
        type: 'NUMBER',
        required: true,
        width: 1,
        validation: { min: 0, decimals: 2 },
      },
      {
        key: 'horizonte_anos',
        label: 'Horizonte do investimento (anos)',
        type: 'NUMBER',
        required: false,
        width: 1,
        validation: { min: 1, max: 50, decimals: 0 },
      },
      {
        key: 'descricao_projecto',
        label: 'Descrição do projecto',
        type: 'TEXTAREA',
        required: true,
        width: 2,
        placeholder: 'Descreva o projecto, a localização e os objectivos pretendidos.',
        validation: { min: 30, max: 4000 },
      },
      campoDocumentos('Estudos, plantas ou documentação existente', false),
    ],
  },
  {
    slug: 'gestao-arrendamento',
    name: 'Gestão Administrativa e Financeira do Arrendamento',
    shortDescription:
      'Gerimos por si a relação com o arrendatário, os recebimentos e toda a componente administrativa do arrendamento.',
    description:
      'Assumimos a gestão corrente do seu imóvel arrendado: cobrança e controlo de rendas, gestão da relação com o arrendatário, acompanhamento de vistorias e manutenção, controlo de prazos contratuais e reporte financeiro periódico ao proprietário.\n\nÉ o serviço indicado para quem tem património arrendado e não reside na província do imóvel.',
    benefits: [
      'Cobrança de rendas e controlo de incumprimentos',
      'Gestão integral da relação com o arrendatário',
      'Reporte financeiro periódico ao proprietário',
      'Acompanhamento de vistorias, obras e prazos contratuais',
    ],
    icon: 'key',
    order: 6,
    metaTitle: 'Gestão de Arrendamento em Angola | Alson Sombreiro Consultadoria',
    metaDescription:
      'Gestão administrativa e financeira de imóveis arrendados em Luanda, Benguela e Huambo.',
    fields: [
      {
        key: 'numero_imoveis',
        label: 'Número de imóveis a gerir',
        type: 'NUMBER',
        required: true,
        width: 1,
        validation: { min: 1, max: 1000, decimals: 0 },
      },
      campoProvincia(),
      {
        key: 'situacao_arrendamento',
        label: 'Situação actual',
        type: 'SELECT',
        required: true,
        width: 2,
        options: [
          { label: 'Já arrendado, quero transferir a gestão', value: 'ja_arrendado' },
          { label: 'Vago, preciso de encontrar arrendatário', value: 'vago' },
          { label: 'Arrendado com incumprimento de rendas', value: 'incumprimento' },
        ],
      },
      {
        key: 'renda_mensal',
        label: 'Renda mensal actual ou pretendida (Kz)',
        type: 'NUMBER',
        required: false,
        width: 1,
        validation: { min: 0, decimals: 2 },
      },
      {
        key: 'servicos_gestao',
        label: 'Serviços pretendidos',
        type: 'MULTISELECT',
        required: true,
        width: 2,
        options: [
          { label: 'Cobrança de rendas', value: 'cobranca' },
          { label: 'Angariação de arrendatários', value: 'angariacao' },
          { label: 'Gestão de manutenção e obras', value: 'manutencao' },
          { label: 'Gestão de contratos e prazos', value: 'contratos' },
          { label: 'Reporte financeiro', value: 'reporte' },
        ],
        validation: { minItems: 1 },
      },
      campoObservacoes,
    ],
  },
  {
    slug: 'inventariacao-patrimonial',
    name: 'Inventariação Patrimonial',
    shortDescription:
      'Levantamento, identificação e cadastro completo do património imobiliário de empresas e instituições.',
    description:
      'Realizamos o levantamento físico e documental do património, produzindo um cadastro rigoroso e actualizado: identificação de cada activo, verificação da situação documental, registo fotográfico, medição e classificação.\n\nO resultado é a base indispensável para qualquer decisão de gestão patrimonial: avaliação, alienação, seguro ou registo contabilístico.',
    benefits: [
      'Levantamento físico e documental de cada activo',
      'Cadastro digital estruturado e pesquisável',
      'Identificação de irregularidades documentais',
      'Base preparada para avaliação e registo contabilístico',
    ],
    icon: 'clipboard-list',
    order: 7,
    metaTitle: 'Inventariação Patrimonial | Alson Sombreiro Consultadoria',
    metaDescription:
      'Levantamento e cadastro de património imobiliário de empresas e instituições em Angola.',
    fields: [
      {
        key: 'nome_entidade',
        label: 'Nome da entidade',
        type: 'TEXT',
        required: true,
        width: 2,
        validation: { min: 3, max: 200 },
      },
      {
        key: 'tipo_entidade',
        label: 'Natureza da entidade',
        type: 'SELECT',
        required: true,
        width: 1,
        options: [
          { label: 'Empresa privada', value: 'privada' },
          { label: 'Empresa pública', value: 'publica' },
          { label: 'Instituição do Estado', value: 'estado' },
          { label: 'Organização sem fins lucrativos', value: 'ong' },
          { label: 'Particular', value: 'particular' },
        ],
      },
      {
        key: 'numero_activos',
        label: 'Número estimado de activos',
        type: 'NUMBER',
        required: true,
        width: 1,
        validation: { min: 1, max: 100_000, decimals: 0 },
      },
      {
        key: 'provincias_activos',
        label: 'Províncias abrangidas',
        type: 'MULTISELECT',
        required: true,
        width: 2,
        options: PROVINCIAS,
        validation: { minItems: 1 },
      },
      campoPrazo,
      campoDocumentos('Cadastro ou listagem existente', false),
      campoObservacoes,
    ],
  },
  {
    slug: 'angariacao-bens-imoveis',
    name: 'Angariação de Bens Imóveis',
    shortDescription:
      'Procuramos e qualificamos imóveis que correspondam exactamente ao perfil e ao orçamento que definir.',
    description:
      'Trabalhamos do lado do comprador ou do arrendatário: definimos consigo o perfil pretendido, prospectamos o mercado, verificamos a situação documental de cada imóvel candidato e apresentamos apenas opções qualificadas.\n\nEvita visitas inúteis e o risco de negociar imóveis com problemas documentais.',
    benefits: [
      'Prospecção dirigida ao perfil definido',
      'Verificação documental prévia de cada opção',
      'Apoio na negociação do preço',
      'Poupança de tempo e redução do risco',
    ],
    icon: 'search',
    order: 8,
    metaTitle: 'Angariação de Imóveis em Angola | Alson Sombreiro Consultadoria',
    metaDescription:
      'Procura e qualificação de imóveis à medida do seu perfil e orçamento, em Luanda, Benguela e Huambo.',
    fields: [
      campoTipoImovel(),
      campoProvincia(),
      campoMunicipio,
      {
        key: 'orcamento_maximo',
        label: 'Orçamento máximo (Kz)',
        type: 'NUMBER',
        required: true,
        width: 1,
        validation: { min: 0, decimals: 2 },
      },
      {
        key: 'area_minima',
        label: 'Área mínima pretendida (m²)',
        type: 'NUMBER',
        required: false,
        width: 1,
        validation: { min: 1, decimals: 0 },
      },
      {
        key: 'finalidade_aquisicao',
        label: 'Finalidade',
        type: 'SELECT',
        required: true,
        width: 1,
        options: [
          { label: 'Habitação própria', value: 'habitacao' },
          { label: 'Investimento / arrendamento', value: 'investimento' },
          { label: 'Actividade comercial', value: 'comercial' },
          { label: 'Actividade industrial', value: 'industrial' },
        ],
      },
      {
        key: 'requisitos',
        label: 'Requisitos obrigatórios',
        type: 'TEXTAREA',
        required: false,
        width: 2,
        placeholder: 'Ex.: mínimo 3 quartos, garagem para dois carros, condomínio com segurança.',
        validation: { max: 2000 },
      },
      {
        key: 'prazo_pretendido',
        label: 'Prazo para concretizar a aquisição',
        type: 'DATE',
        required: false,
        width: 1,
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*  Execução                                                                  */
/* -------------------------------------------------------------------------- */

async function seedRoles() {
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { label: role.label, description: role.description, permissions: role.permissions },
      create: role,
    });
  }
  console.log(`  ✓ ${ROLES.length} perfis`);
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const user of USERS) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: user.role } });
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, phone: user.phone, roleId: role.id, active: true },
      create: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        passwordHash,
        roleId: role.id,
      },
    });
  }
  console.log(`  ✓ ${USERS.length} utilizadores (palavra-passe: ${DEMO_PASSWORD})`);
}

async function seedStatuses() {
  for (const status of STATUSES) {
    await prisma.requestStatus.upsert({
      where: { key: status.key },
      update: status,
      create: status,
    });
  }
  console.log(`  ✓ ${STATUSES.length} estados do pipeline`);
}

async function seedServices() {
  let fieldCount = 0;

  for (const service of SERVICES) {
    const { fields, ...data } = service;

    const record = await prisma.service.upsert({
      where: { slug: service.slug },
      update: { ...data, active: true },
      create: { ...data, active: true },
    });

    for (const [index, field] of fields.entries()) {
      await prisma.formField.upsert({
        where: { serviceId_key: { serviceId: record.id, key: field.key } },
        update: {
          label: field.label,
          type: field.type,
          placeholder: field.placeholder ?? null,
          helpText: field.helpText ?? null,
          required: field.required ?? false,
          order: index,
          width: field.width ?? 2,
          options: (field.options ?? []) as unknown as Prisma.InputJsonValue,
          validation: (field.validation ?? {}) as unknown as Prisma.InputJsonValue,
          active: true,
        },
        create: {
          serviceId: record.id,
          key: field.key,
          label: field.label,
          type: field.type,
          placeholder: field.placeholder ?? null,
          helpText: field.helpText ?? null,
          required: field.required ?? false,
          order: index,
          width: field.width ?? 2,
          options: (field.options ?? []) as unknown as Prisma.InputJsonValue,
          validation: (field.validation ?? {}) as unknown as Prisma.InputJsonValue,
        },
      });
      fieldCount += 1;
    }
  }

  console.log(`  ✓ ${SERVICES.length} serviços com ${fieldCount} campos de formulário`);
}

/** Pedidos de exemplo, para que o Kanban e o dashboard tenham conteúdo. */
async function seedSampleRequests() {
  const existing = await prisma.request.count();
  if (existing > 0) {
    console.log(`  · ${existing} pedidos já existentes, exemplos não recriados`);
    return;
  }

  const year = new Date().getFullYear();
  const statuses = await prisma.requestStatus.findMany({ orderBy: { order: 'asc' } });
  const agente = await prisma.user.findUniqueOrThrow({ where: { email: 'agente@alsonsombreiro.ao' } });
  const gestor = await prisma.user.findUniqueOrThrow({ where: { email: 'gestor@alsonsombreiro.ao' } });

  const samples = [
    {
      slug: 'avaliacao-imobiliaria',
      statusKey: 'novo',
      priority: 'NORMAL' as const,
      assigneeId: null,
      daysAgo: 1,
      requester: { name: 'Maria Chipenda', email: 'maria.chipenda@exemplo.ao', phone: '+244 923 111 222' },
      values: {
        tipo_imovel: 'apartamento',
        provincia: 'benguela',
        municipio: 'Lobito, Restinga',
        area_m2: 145,
        endereco: 'Rua da Restinga n.º 12, 3.º andar',
        finalidade: 'credito',
        estado_conservacao: 'bom',
      },
    },
    {
      slug: 'fesada-centralidades',
      statusKey: 'em_triagem',
      priority: 'ALTA' as const,
      assigneeId: agente.id,
      daysAgo: 4,
      requester: { name: 'Domingos Kiala', email: 'domingos.kiala@exemplo.ao', phone: '+244 924 333 444' },
      values: {
        centralidade: 'Centralidade do Kilamba',
        provincia: 'luanda',
        tipologia: 't3',
        situacao_pagamento: 'prestacoes_em_dia',
        servicos_pretendidos: ['regularizacao', 'legalizacao'],
        numero_bi: '004512378LA041',
      },
    },
    {
      slug: 'registo-legalizacao-imoveis',
      statusKey: 'em_analise',
      priority: 'NORMAL' as const,
      assigneeId: agente.id,
      daysAgo: 12,
      requester: { name: 'Sinfic Angola, Lda', email: 'geral@sinfic.exemplo.ao', phone: '+244 923 555 666' },
      values: {
        tipo_imovel: 'armazem',
        provincia: 'benguela',
        endereco: 'Zona Industrial da Catumbela, lote 7',
        situacao_actual: 'incompleta',
        titular_actual: 'Sinfic Angola, Lda',
        e_proprietario: true,
      },
    },
    {
      slug: 'mediacao-imobiliaria',
      statusKey: 'proposta_enviada',
      priority: 'ALTA' as const,
      assigneeId: gestor.id,
      daysAgo: 20,
      requester: { name: 'Ana Ferreira', email: 'ana.ferreira@exemplo.ao', phone: '+244 921 777 888' },
      values: {
        pretendo: 'vender',
        tipo_imovel: 'moradia',
        provincia: 'huambo',
        municipio: 'Bairro Académico',
        valor_pretendido: 48000000,
        area_m2: 320,
        caracteristicas: ['garagem', 'quintal', 'furo'],
      },
    },
    {
      slug: 'avaliacao-patrimonial',
      statusKey: 'em_execucao',
      priority: 'URGENTE' as const,
      assigneeId: gestor.id,
      daysAgo: 35,
      requester: { name: 'Silva & Silva, Lda', email: 'administracao@silvaesilva.exemplo.ao', phone: '+244 923 999 000' },
      values: {
        nome_entidade: 'Fábrica de Corte e Polimento de Mármores Silva & Silva',
        nif: '5417123456',
        numero_activos: 14,
        provincias_activos: ['namibe', 'benguela'],
        finalidade_avaliacao: 'garantia',
      },
    },
    {
      slug: 'avaliacao-imobiliaria',
      statusKey: 'concluido',
      priority: 'NORMAL' as const,
      assigneeId: agente.id,
      daysAgo: 58,
      closedDaysAgo: 40,
      requester: { name: 'Joaquim Neto', email: 'joaquim.neto@exemplo.ao', phone: '+244 922 121 212' },
      values: {
        tipo_imovel: 'terreno',
        provincia: 'cuanza-sul',
        municipio: 'Sumbe',
        area_m2: 5000,
        endereco: 'Estrada nacional 100, km 12',
        finalidade: 'transaccao',
      },
    },
  ];

  for (const [index, sample] of samples.entries()) {
    const service = await prisma.service.findUniqueOrThrow({
      where: { slug: sample.slug },
      include: { fields: { orderBy: { order: 'asc' } } },
    });
    const status = statuses.find((item) => item.key === sample.statusKey)!;
    const createdAt = new Date(Date.now() - sample.daysAgo * 86_400_000);
    const closedAt = sample.closedDaysAgo
      ? new Date(Date.now() - sample.closedDaysAgo * 86_400_000)
      : null;

    const request = await prisma.request.create({
      data: {
        reference: `AS-${year}-${String(index + 1).padStart(6, '0')}`,
        serviceId: service.id,
        statusId: status.id,
        assigneeId: sample.assigneeId,
        priority: sample.priority,
        requesterName: sample.requester.name,
        requesterEmail: sample.requester.email,
        requesterPhone: sample.requester.phone,
        createdAt,
        closedAt,
        values: {
          create: service.fields
            .filter((field) => sample.values[field.key as keyof typeof sample.values] !== undefined)
            .map((field, order) => {
              const raw = sample.values[field.key as keyof typeof sample.values];
              const options = field.options as Array<{ label: string; value: string }>;

              const display = Array.isArray(raw)
                ? raw.map((v) => options.find((o) => o.value === v)?.label ?? String(v)).join(', ')
                : typeof raw === 'boolean'
                  ? raw
                    ? 'Sim'
                    : 'Não'
                  : (options.find((o) => o.value === raw)?.label ?? String(raw));

              return {
                fieldId: field.id,
                fieldKey: field.key,
                label: field.label,
                type: field.type,
                value: raw as Prisma.InputJsonValue,
                displayValue: display,
                order,
              };
            }),
        },
      },
    });

    await prisma.requestHistory.create({
      data: {
        requestId: request.id,
        event: 'CRIADO',
        description: `Pedido submetido através do site por ${sample.requester.name}.`,
        toValue: 'Novo',
        createdAt,
      },
    });

    if (status.key !== 'novo') {
      await prisma.requestHistory.create({
        data: {
          requestId: request.id,
          event: 'ESTADO_ALTERADO',
          description: `Estado alterado de "Novo" para "${status.name}".`,
          fromValue: 'Novo',
          toValue: status.name,
          authorId: sample.assigneeId ?? gestor.id,
          createdAt: new Date(createdAt.getTime() + 86_400_000),
        },
      });
    }

    if (sample.assigneeId) {
      await prisma.note.create({
        data: {
          requestId: request.id,
          authorId: sample.assigneeId,
          body: 'Contacto telefónico estabelecido com o requerente. Documentação em recolha.',
          createdAt: new Date(createdAt.getTime() + 2 * 86_400_000),
        },
      });
    }
  }

  await prisma.referenceCounter.upsert({
    where: { year },
    update: { sequence: samples.length },
    create: { year, sequence: samples.length },
  });

  console.log(`  ✓ ${samples.length} pedidos de exemplo`);
}

async function main() {
  console.log('\n🌱 Seed da Alson Sombreiro Consultadoria\n');

  await seedRoles();
  await seedUsers();
  await seedStatuses();
  await seedServices();
  await seedSampleRequests();

  console.log('\n✅ Seed concluído.\n');
  console.log('   Backoffice: http://localhost:3001');
  console.log('   Administrador : admin@alsonsombreiro.ao');
  console.log('   Gestor        : gestor@alsonsombreiro.ao');
  console.log('   Agente        : agente@alsonsombreiro.ao');
  console.log(`   Palavra-passe : ${DEMO_PASSWORD}\n`);
}

main()
  .catch((error) => {
    console.error('\n❌ Erro no seed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
