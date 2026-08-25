export default defineEventHandler((event) => {
  const config = useRuntimeConfig();
  const siteUrl = config.public.siteUrl.replace(/\/$/, '');

  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8');

  return `User-agent: *
Allow: /

# Consulta pessoal de processos. Não deve ser indexada.
Disallow: /acompanhar

Sitemap: ${siteUrl}/sitemap.xml
`;
});
