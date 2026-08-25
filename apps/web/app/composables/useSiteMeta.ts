/** Dados institucionais reutilizados em vários pontos do site. */
export const COMPANY = {
  legalName: 'Alson Sombreiro Consultadoria, Lda',
  shortName: 'Alson Sombreiro',
  tagline: 'Imobiliária · Consultadoria',
  foundedYear: 2019,
  email: 'geral@alsonsombreiro.ao',
  phones: ['+244 923 075 864', '+244 924 938 576'],
  offices: [
    {
      label: 'Sede',
      city: 'Benguela',
      address: 'Rua Alexandre Herculano n.º 35',
    },
    {
      label: 'Filial',
      city: 'Luanda',
      address: 'Maianga, Rua Kateculo Mengo n.º 6',
    },
    {
      label: 'Filial',
      city: 'Huambo',
      address: 'Bairro Académico, Rua 90, prédio isolado, 1.º andar esquerdo',
    },
  ],
  credentials: [
    'Perito Avaliador Imobiliário inscrito na CMC sob o n.º 002/PAI/CMC/01-19',
    'Analista de Investimentos Imobiliários certificado pela Academia AFB n.º 2019-1978',
  ],
} as const;

interface SeoOptions {
  title: string;
  description: string;
  path?: string;
  image?: string | null;
  type?: 'website' | 'article';
  noindex?: boolean;
}

/**
 * Aplica título, meta description, canonical e Open Graph de forma consistente.
 * Como o site corre em SSR, estas tags saem já renderizadas no HTML.
 */
export function useSeo(options: SeoOptions): void {
  const config = useRuntimeConfig();
  const siteUrl = config.public.siteUrl.replace(/\/$/, '');
  const path = options.path ?? useRoute().path;
  const canonical = `${siteUrl}${path === '/' ? '' : path}`;
  const image = options.image
    ? options.image.startsWith('http')
      ? options.image
      : `${siteUrl}${options.image}`
    : `${siteUrl}/logos/logo-dark.png`;

  // Os títulos SEO definidos no backoffice já costumam incluir a marca; nesse
  // caso desliga-se o sufixo automático para não a repetir.
  const alreadyBranded = options.title.includes(COMPANY.shortName);

  useHead({
    title: options.title,
    titleTemplate: alreadyBranded ? '%s' : undefined,
    link: [{ rel: 'canonical', href: canonical }],
    meta: [
      { name: 'description', content: options.description },
      ...(options.noindex ? [{ name: 'robots', content: 'noindex, nofollow' }] : []),
    ],
  });

  useSeoMeta({
    ogTitle: alreadyBranded ? options.title : `${options.title} · ${COMPANY.legalName}`,
    ogDescription: options.description,
    ogType: options.type ?? 'website',
    ogUrl: canonical,
    ogImage: image,
    ogSiteName: COMPANY.legalName,
    ogLocale: 'pt_AO',
    twitterCard: 'summary_large_image',
    twitterTitle: options.title,
    twitterDescription: options.description,
    twitterImage: image,
  });
}

/** Dados estruturados schema.org da organização, que melhoram a apresentação nos motores de busca. */
export function useOrganizationSchema(): void {
  const config = useRuntimeConfig();
  const siteUrl = config.public.siteUrl.replace(/\/$/, '');

  useHead({
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'RealEstateAgent',
          name: COMPANY.legalName,
          alternateName: COMPANY.shortName,
          url: siteUrl,
          logo: `${siteUrl}/logos/logo-dark.png`,
          email: COMPANY.email,
          telephone: COMPANY.phones[0],
          foundingDate: String(COMPANY.foundedYear),
          areaServed: { '@type': 'Country', name: 'Angola' },
          address: COMPANY.offices.map((office) => ({
            '@type': 'PostalAddress',
            streetAddress: office.address,
            addressLocality: office.city,
            addressCountry: 'AO',
          })),
        }),
      },
    ],
  });
}
