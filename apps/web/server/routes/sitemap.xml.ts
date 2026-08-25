/**
 * Sitemap gerado dinamicamente.
 *
 * Os serviços vêm da API, pelo que publicar um serviço novo no backoffice
 * coloca-o automaticamente no sitemap, sem intervenção de código.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const siteUrl = config.public.siteUrl.replace(/\/$/, '');

  const staticRoutes = [
    { path: '/', priority: '1.0', changefreq: 'weekly' },
    { path: '/servicos', priority: '0.9', changefreq: 'weekly' },
    { path: '/sobre', priority: '0.7', changefreq: 'monthly' },
    { path: '/contacto', priority: '0.7', changefreq: 'monthly' },
    { path: '/privacidade', priority: '0.3', changefreq: 'yearly' },
    { path: '/termos', priority: '0.3', changefreq: 'yearly' },
  ];

  let services: Array<{ slug: string; updatedAt: string }> = [];
  try {
    services = await $fetch<Array<{ slug: string; updatedAt: string }>>('/public/services/sitemap', {
      baseURL: config.apiBaseServer,
    });
  } catch {
    // Se a API estiver indisponível, devolve-se o sitemap com as páginas fixas
    // em vez de falhar o pedido por completo.
  }

  const urls = [
    ...staticRoutes.map(
      (route) => `  <url>
    <loc>${siteUrl}${route.path}</loc>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`,
    ),
    ...services.map(
      (service) => `  <url>
    <loc>${siteUrl}/servicos/${service.slug}</loc>
    <lastmod>${service.updatedAt.slice(0, 10)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`,
    ),
  ];

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8');
  setHeader(event, 'Cache-Control', 'public, max-age=3600');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
});
