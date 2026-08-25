import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },

  // O backoffice é uma aplicação privada atrás de autenticação: não há nada a
  // indexar e o SSR só complicaria a gestão dos tokens. Corre como SPA.
  ssr: false,

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3333/api',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'pt-AO' },
      titleTemplate: '%s · Backoffice Alson Sombreiro',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        // Um backoffice nunca deve ser indexado.
        { name: 'robots', content: 'noindex, nofollow' },
        { name: 'theme-color', content: '#0A0A0B' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/logos/logo-dark.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
        },
      ],
    },
  },

  typescript: { strict: true, typeCheck: false },
});
