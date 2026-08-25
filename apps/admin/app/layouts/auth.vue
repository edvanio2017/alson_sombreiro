<template>
  <div class="flex min-h-screen">
    <!-- Painel da marca, visível apenas em ecrãs largos -->
    <div class="relative hidden w-1/2 flex-col justify-between bg-graphite-950 p-12 lg:flex">
      <div class="pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden="true">
        <svg class="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="malha-admin" width="72" height="72" patternUnits="userSpaceOnUse">
              <path d="M0 72 L36 36 L72 72" fill="none" stroke="white" stroke-width="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#malha-admin)" />
        </svg>
      </div>

      <img src="/logos/logo-light.png" alt="Alson Sombreiro" class="relative h-9 w-auto self-start" />

      <div class="relative max-w-md">
        <p class="text-2xl leading-snug font-light text-white">
          Gestão integrada dos pedidos de serviço, do primeiro contacto à conclusão do processo.
        </p>
        <p class="mt-6 text-[13px] leading-relaxed text-graphite-400">
          Backoffice da Alson Sombreiro Consultadoria, Lda: mediação imobiliária, gestão de património
          e registo de imóveis.
        </p>
      </div>

      <p class="relative text-[12px] text-graphite-500">
        Benguela · Luanda · Huambo
      </p>
    </div>

    <div class="flex w-full items-center justify-center bg-white p-6 lg:w-1/2">
      <div class="w-full max-w-sm">
        <slot />
      </div>
    </div>

    <ToastStack />
  </div>
</template>
