<script setup lang="ts">
import { ROLE_LABELS } from '@alson/shared';

const auth = useAuth();
const route = useRoute();
const sidebarOpen = ref(false);

/** Cada entrada declara o perfil mínimo, espelhando o RBAC aplicado pela API. */
const navigation = [
  { label: 'Dashboard', to: '/', icon: 'grid', role: 'AGENTE' as const },
  { label: 'Pedidos', to: '/pedidos', icon: 'inbox', role: 'AGENTE' as const },
  { label: 'Kanban', to: '/kanban', icon: 'columns', role: 'AGENTE' as const },
  { label: 'Serviços', to: '/servicos', icon: 'layers', role: 'AGENTE' as const },
  { label: 'Pipeline', to: '/pipeline', icon: 'flow', role: 'ADMIN' as const },
  { label: 'Utilizadores', to: '/utilizadores', icon: 'users', role: 'ADMIN' as const },
  { label: 'Auditoria', to: '/auditoria', icon: 'shield', role: 'ADMIN' as const },
];

const visibleNavigation = computed(() => navigation.filter((item) => auth.can(item.role)));

function isActive(to: string): boolean {
  return to === '/' ? route.path === '/' : route.path.startsWith(to);
}

watch(() => route.fullPath, () => (sidebarOpen.value = false));

const icons: Record<string, string> = {
  grid: 'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z',
  inbox: 'M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z',
  columns: 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5M9 3.75v16.5M15 3.75v16.5',
  layers: 'M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3',
  flow: 'M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25',
  users: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z',
  shield: 'M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z',
};

const config = useRuntimeConfig();
</script>

<template>
  <div class="flex min-h-screen">
    <!-- Barra lateral -->
    <aside
      class="fixed inset-y-0 left-0 z-40 w-60 shrink-0 bg-graphite-950 transition-transform lg:static lg:translate-x-0"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex h-full flex-col">
        <div class="flex h-16 items-center border-b border-white/10 px-5">
          <NuxtLink to="/" class="flex items-center">
            <img src="/logos/logo-light.png" alt="Alson Sombreiro" class="h-7 w-auto" />
          </NuxtLink>
        </div>

        <nav class="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Navegação do backoffice">
          <NuxtLink
            v-for="item in visibleNavigation"
            :key="item.to"
            :to="item.to"
            :class="isActive(item.to) ? 'nav-link-active' : 'nav-link-idle'"
            :aria-current="isActive(item.to) ? 'page' : undefined"
          >
            <svg
              class="h-4 w-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" :d="icons[item.icon]" />
            </svg>
            {{ item.label }}
          </NuxtLink>
        </nav>

        <div class="border-t border-white/10 p-3">
          <a
            :href="config.public.siteUrl"
            target="_blank"
            rel="noopener"
            class="nav-link-idle mb-1"
          >
            <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            Ver o site
          </a>

          <div class="mt-3 rounded-sm bg-white/5 p-3">
            <p class="truncate text-[13px] font-medium text-white">{{ auth.user.value?.name }}</p>
            <p class="mt-0.5 text-[11px] text-graphite-400">
              {{ auth.user.value ? ROLE_LABELS[auth.user.value.role] : '' }}
            </p>
            <div class="mt-3 flex gap-2">
              <NuxtLink to="/perfil" class="flex-1 rounded-sm border border-white/15 px-2 py-1 text-center text-[11px] text-graphite-300 transition-colors hover:border-white/40 hover:text-white">
                Perfil
              </NuxtLink>
              <button
                type="button"
                class="flex-1 rounded-sm border border-white/15 px-2 py-1 text-[11px] text-graphite-300 transition-colors hover:border-white/40 hover:text-white"
                @click="auth.logout()"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- Fundo escuro por trás da barra lateral em ecrã pequeno -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-30 bg-graphite-950/50 lg:hidden"
      aria-hidden="true"
      @click="sidebarOpen = false"
    />

    <!-- Conteúdo -->
    <div class="flex min-w-0 flex-1 flex-col">
      <header
        class="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-graphite-200 bg-white px-4 lg:px-8"
      >
        <button
          type="button"
          class="-ml-2 p-2 lg:hidden"
          :aria-expanded="sidebarOpen"
          aria-label="Alternar navegação"
          @click="sidebarOpen = !sidebarOpen"
        >
          <svg class="h-5 w-5 text-graphite-700" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        <slot name="header" />
      </header>

      <main class="flex-1 p-4 lg:p-8">
        <slot />
      </main>
    </div>

    <ToastStack />
  </div>
</template>
