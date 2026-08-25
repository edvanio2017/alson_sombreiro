import tailwindcss from '@tailwindcss/vite';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },

  // SSR ligado: o site institucional depende de indexação e de Open Graph
  // renderizado no servidor.
  ssr: true,

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  runtimeConfig: {
    // Apenas no servidor: dentro do Docker a API responde em `http://api:3333`.
    apiBaseServer: process.env.NUXT_API_BASE_SERVER || 'http://localhost:3333/api',
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3333/api',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      siteName: process.env.NUXT_PUBLIC_SITE_NAME || 'Alson Sombreiro Consultadoria',
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'pt-AO' },
      titleTemplate: '%s · Alson Sombreiro Consultadoria',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#0A0A0B' },
        { name: 'format-detection', content: 'telephone=no' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/logos/logo-dark.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          // Bodoni Moda é uma didone de eixo vertical e contraste acentuado entre
          // hastes grossas e finas, a mesma tensão luz/sombra do símbolo da marca.
          // `opsz` é o eixo óptico: em títulos grandes o desenho afina naturalmente.
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Bodoni+Moda:opsz,wght@6..96,400;6..96,500;6..96,600&display=swap',
        },
      ],
    },
    pageTransition: { name: 'page', mode: 'out-in' },
  },

  nitro: {
    compressPublicAssets: true,
    routeRules: {
      // O catálogo muda pouco: cache curto no edge, revalidação em segundo plano.
      '/': { swr: 300 },
      '/servicos': { swr: 300 },
      '/servicos/**': { swr: 300 },
      // Não são pré-renderizadas: o rodapé lista os serviços vindos da API, e
      // um build antigo fixaria nomes já alterados no backoffice.
      '/sobre': { swr: 3600 },
      '/privacidade': { swr: 3600 },
      '/termos': { swr: 3600 },
      // Páginas com estado do utilizador nunca são cacheadas.
      '/acompanhar': { ssr: true, swr: false },
      '/contacto': { ssr: true, swr: false },
    },
  },

  typescript: { strict: true, typeCheck: false },
});
