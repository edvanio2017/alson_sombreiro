<script setup lang="ts">
const route = useRoute();
const mobileOpen = ref(false);
const scrolled = ref(false);

// Sobreposto a um hero escuro e ainda no topo → cabeçalho em versão clara.
const overDark = useHeaderOverDark();
const lightMode = computed(() => overDark.value && !scrolled.value && !mobileOpen.value);

const navigation = [
  { label: 'Início', to: '/' },
  { label: 'Serviços', to: '/servicos' },
  { label: 'A empresa', to: '/sobre' },
  { label: 'Acompanhar pedido', to: '/acompanhar' },
  { label: 'Contacto', to: '/contacto' },
];

function isActive(to: string): boolean {
  return to === '/' ? route.path === '/' : route.path.startsWith(to);
}

// Fecha o menu ao navegar, evitando que fique aberto sobre a página seguinte.
watch(() => route.fullPath, () => (mobileOpen.value = false));

// Bloqueia o scroll do corpo enquanto o menu ocupa o ecrã inteiro.
watch(mobileOpen, (open) => {
  if (import.meta.client) document.body.style.overflow = open ? 'hidden' : '';
});

function onScroll(): void {
  scrolled.value = window.scrollY > 16;
}

onMounted(() => {
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll);
  if (import.meta.client) document.body.style.overflow = '';
});
</script>

<template>
  <header
    class="fixed inset-x-0 top-0 z-50 transition-all duration-300"
    :class="
      scrolled || mobileOpen
        ? 'border-b border-graphite-200 bg-white/95 backdrop-blur-md'
        : 'bg-transparent'
    "
  >
    <div class="container-page">
      <div class="flex h-20 items-center justify-between gap-6">
        <NuxtLink to="/" class="shrink-0" aria-label="Alson Sombreiro Consultadoria, página inicial">
          <img
            :src="lightMode ? '/logos/logo-light.png' : '/logos/logo-dark.png'"
            alt="Alson Sombreiro Imobiliária"
            class="h-9 w-auto sm:h-10"
          />
        </NuxtLink>

        <nav class="hidden items-center gap-9 lg:flex" aria-label="Navegação principal">
          <NuxtLink
            v-for="item in navigation"
            :key="item.to"
            :to="item.to"
            class="relative text-[12px] font-medium uppercase tracking-[0.14em] transition-colors"
            :class="
              lightMode
                ? isActive(item.to)
                  ? 'text-white'
                  : 'text-graphite-300 hover:text-white'
                : isActive(item.to)
                  ? 'text-graphite-950'
                  : 'text-graphite-500 hover:text-graphite-950'
            "
            :aria-current="isActive(item.to) ? 'page' : undefined"
          >
            {{ item.label }}
            <span
              v-if="isActive(item.to)"
              class="absolute -bottom-1.5 left-0 h-px w-full"
              :class="lightMode ? 'bg-white' : 'bg-graphite-950'"
              aria-hidden="true"
            />
          </NuxtLink>
        </nav>

        <div class="hidden items-center gap-5 lg:flex">
          <a
            :href="`tel:${COMPANY.phones[0].replace(/\s/g, '')}`"
            class="text-[13px] font-medium transition-colors"
            :class="lightMode ? 'text-graphite-300 hover:text-white' : 'text-graphite-600 hover:text-graphite-950'"
          >
            {{ COMPANY.phones[0] }}
          </a>
          <NuxtLink
            to="/servicos"
            class="btn btn-sm"
            :class="
              lightMode
                ? 'border-white bg-white text-graphite-950 hover:bg-graphite-100'
                : 'border-graphite-950 bg-graphite-950 text-white hover:bg-graphite-800'
            "
          >
            Pedir orçamento
          </NuxtLink>
        </div>

        <button
          type="button"
          class="-mr-2 p-2 lg:hidden"
          :aria-expanded="mobileOpen"
          aria-controls="menu-mobile"
          :aria-label="mobileOpen ? 'Fechar menu' : 'Abrir menu'"
          @click="mobileOpen = !mobileOpen"
        >
          <svg
            class="h-6 w-6"
            :class="lightMode ? 'text-white' : 'text-graphite-950'"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              v-if="!mobileOpen"
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
            <path v-else stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Menu em ecrã pequeno -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="mobileOpen"
        id="menu-mobile"
        class="fixed inset-x-0 top-20 bottom-0 border-t border-graphite-200 bg-white lg:hidden"
      >
        <nav class="container-page flex flex-col py-4" aria-label="Navegação principal (móvel)">
          <NuxtLink
            v-for="item in navigation"
            :key="item.to"
            :to="item.to"
            class="border-b border-graphite-100 py-4 text-[15px] font-medium tracking-wide"
            :class="isActive(item.to) ? 'text-graphite-950' : 'text-graphite-500'"
            :aria-current="isActive(item.to) ? 'page' : undefined"
          >
            {{ item.label }}
          </NuxtLink>

          <div class="mt-8 space-y-3">
            <NuxtLink to="/servicos" class="btn-primary w-full">Pedir orçamento</NuxtLink>
            <a :href="`tel:${COMPANY.phones[0].replace(/\s/g, '')}`" class="btn-outline w-full">
              {{ COMPANY.phones[0] }}
            </a>
          </div>
        </nav>
      </div>
    </Transition>
  </header>
</template>
