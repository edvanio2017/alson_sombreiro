<script setup lang="ts">
import { formatDate, timeAgo, type DashboardMetricsDto, type PaginatedResult, type RequestListItemDto } from '@alson/shared';

useHead({ title: 'Dashboard' });

const api = useApi();
const auth = useAuth();

const metrics = ref<DashboardMetricsDto | null>(null);
const recent = ref<RequestListItemDto[]>([]);
const loading = ref(true);

/** Filtro de período aplicado a todos os indicadores. */
const period = ref<'30' | '90' | '365' | 'all'>('90');

const periodOptions = [
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
  { value: '365', label: '12 meses' },
  { value: 'all', label: 'Sempre' },
] as const;

async function load(): Promise<void> {
  loading.value = true;
  try {
    const params =
      period.value === 'all'
        ? {}
        : { dateFrom: new Date(Date.now() - Number(period.value) * 86_400_000).toISOString() };

    const [metricsResult, recentResult] = await Promise.all([
      api.get<DashboardMetricsDto>('/dashboard/metrics', params),
      api.get<PaginatedResult<RequestListItemDto>>('/requests', {
        perPage: 8,
        sort: 'createdAt',
        direction: 'desc',
      }),
    ]);

    metrics.value = metricsResult;
    recent.value = recentResult.items;
  } finally {
    loading.value = false;
  }
}

watch(period, load);
onMounted(load);

/** Máximo usado para escalar as barras dos gráficos. */
const maxByStatus = computed(() =>
  Math.max(1, ...(metrics.value?.porEstado.map((item) => item.total) ?? [0])),
);
const maxByService = computed(() =>
  Math.max(1, ...(metrics.value?.porServico.map((item) => item.total) ?? [0])),
);
const maxByPeriod = computed(() =>
  Math.max(1, ...(metrics.value?.porPeriodo.map((item) => item.total) ?? [0])),
);

function monthLabel(period: string): string {
  const [year, month] = period.split('-');
  const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${names[Number(month) - 1]} ${year.slice(2)}`;
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold tracking-tight text-graphite-950">
          Bom dia, {{ auth.user.value?.name?.split(' ')[0] }}
        </h1>
        <p class="mt-1 text-[13px] text-graphite-500">
          Visão geral dos pedidos de serviço · {{ formatDate(new Date()) }}
        </p>
      </div>

      <div class="flex rounded-sm border border-graphite-200 bg-white p-0.5" role="group" aria-label="Período">
        <button
          v-for="option in periodOptions"
          :key="option.value"
          type="button"
          class="rounded-sm px-3 py-1.5 text-[12px] font-medium transition-colors"
          :class="
            period === option.value
              ? 'bg-graphite-950 text-white'
              : 'text-graphite-500 hover:text-graphite-900'
          "
          :aria-pressed="period === option.value"
          @click="period = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <!-- Indicadores -->
    <div class="mt-6 grid gap-px overflow-hidden rounded-sm border border-graphite-200 bg-graphite-200 sm:grid-cols-2 lg:grid-cols-5">
      <div
        v-for="stat in [
          { label: 'Total de pedidos', value: metrics?.totals.total ?? 0 },
          { label: 'Em curso', value: metrics?.totals.abertos ?? 0 },
          { label: 'Concluídos', value: metrics?.totals.concluidos ?? 0 },
          { label: 'Novos (30 dias)', value: metrics?.totals.novos30Dias ?? 0 },
          {
            label: 'Tempo médio de resolução',
            value: metrics?.totals.tempoMedioResolucaoDias ?? null,
            suffix: ' dias',
          },
        ]"
        :key="stat.label"
        class="bg-white p-5"
      >
        <p class="stat-value">
          <span v-if="loading" class="inline-block h-8 w-12 animate-pulse rounded bg-graphite-100" />
          <template v-else>
            {{ stat.value ?? 'sem dados' }}<span v-if="stat.suffix && stat.value !== null" class="text-base font-normal text-graphite-400">{{ stat.suffix }}</span>
          </template>
        </p>
        <p class="stat-label">{{ stat.label }}</p>
      </div>
    </div>

    <div class="mt-6 grid gap-6 lg:grid-cols-3">
      <!-- Por estado -->
      <section class="panel lg:col-span-1">
        <div class="panel-header">
          <h2 class="panel-title">Pedidos por estado</h2>
          <NuxtLink to="/kanban" class="text-[12px] text-graphite-500 hover:text-graphite-900">Kanban</NuxtLink>
        </div>
        <div class="space-y-3.5 p-5">
          <div v-for="item in metrics?.porEstado" :key="item.statusId">
            <div class="flex items-center justify-between text-[13px]">
              <span class="flex items-center gap-2 text-graphite-700">
                <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: item.color }" aria-hidden="true" />
                {{ item.name }}
              </span>
              <span class="font-medium text-graphite-950">{{ item.total }}</span>
            </div>
            <div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-graphite-100">
              <div
                class="h-full rounded-full transition-all duration-500"
                :style="{ width: `${(item.total / maxByStatus) * 100}%`, backgroundColor: item.color }"
              />
            </div>
          </div>
          <p v-if="!metrics?.porEstado.length" class="text-[13px] text-graphite-400">Sem dados.</p>
        </div>
      </section>

      <!-- Por serviço -->
      <section class="panel lg:col-span-1">
        <div class="panel-header">
          <h2 class="panel-title">Pedidos por serviço</h2>
          <NuxtLink to="/servicos" class="text-[12px] text-graphite-500 hover:text-graphite-900">Gerir</NuxtLink>
        </div>
        <div class="space-y-3.5 p-5">
          <div v-for="item in metrics?.porServico.slice(0, 7)" :key="item.serviceId">
            <div class="flex items-center justify-between gap-3 text-[13px]">
              <span class="truncate text-graphite-700">{{ item.name }}</span>
              <span class="shrink-0 font-medium text-graphite-950">{{ item.total }}</span>
            </div>
            <div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-graphite-100">
              <div
                class="h-full rounded-full bg-graphite-800 transition-all duration-500"
                :style="{ width: `${(item.total / maxByService) * 100}%` }"
              />
            </div>
          </div>
          <p v-if="!metrics?.porServico.length" class="text-[13px] text-graphite-400">Sem dados.</p>
        </div>
      </section>

      <!-- Por período -->
      <section class="panel lg:col-span-1">
        <div class="panel-header">
          <h2 class="panel-title">Evolução mensal</h2>
          <span class="text-[12px] text-graphite-400">últimos 12 meses</span>
        </div>
        <div class="p-5">
          <div class="flex h-40 items-end gap-1.5" role="img" aria-label="Gráfico de pedidos por mês">
            <div
              v-for="item in metrics?.porPeriodo"
              :key="item.periodo"
              class="group relative flex h-full flex-1 flex-col items-center justify-end"
            >
              <span
                class="pointer-events-none absolute -top-6 rounded-sm bg-graphite-950 px-1.5 py-0.5 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                {{ item.total }}
              </span>
              <div
                class="w-full rounded-t-sm bg-graphite-800 transition-all duration-500"
                :style="{ height: `${Math.max(4, (item.total / maxByPeriod) * 100)}%` }"
              />
              <span class="mt-2 text-[10px] whitespace-nowrap text-graphite-400">
                {{ monthLabel(item.periodo) }}
              </span>
            </div>
          </div>
          <p v-if="!metrics?.porPeriodo.length" class="text-[13px] text-graphite-400">
            Ainda não há pedidos registados.
          </p>
        </div>
      </section>
    </div>

    <div class="mt-6 grid gap-6 lg:grid-cols-3">
      <!-- Pedidos recentes -->
      <section class="panel lg:col-span-2">
        <div class="panel-header">
          <h2 class="panel-title">Pedidos recentes</h2>
          <NuxtLink to="/pedidos" class="text-[12px] text-graphite-500 hover:text-graphite-900">
            Ver todos
          </NuxtLink>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[560px]">
            <thead>
              <tr>
                <th class="table-head">Referência</th>
                <th class="table-head">Requerente</th>
                <th class="table-head">Serviço</th>
                <th class="table-head">Estado</th>
                <th class="table-head">Entrada</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in recent" :key="item.id" class="hover:bg-graphite-50">
                <td class="table-cell">
                  <NuxtLink :to="`/pedidos/${item.id}`" class="font-mono text-[12px] font-medium text-graphite-950 hover:underline">
                    {{ item.reference }}
                  </NuxtLink>
                </td>
                <td class="table-cell">
                  <span class="block truncate">{{ item.requesterName }}</span>
                </td>
                <td class="table-cell">
                  <span class="block max-w-[180px] truncate text-graphite-500">{{ item.service.name }}</span>
                </td>
                <td class="table-cell">
                  <StatusBadge :status="item.status" />
                </td>
                <td class="table-cell whitespace-nowrap text-graphite-400">{{ timeAgo(item.createdAt) }}</td>
              </tr>
              <tr v-if="!loading && !recent.length">
                <td colspan="5" class="px-4 py-10 text-center text-[13px] text-graphite-400">
                  Ainda não há pedidos submetidos.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Por responsável -->
      <section class="panel">
        <div class="panel-header">
          <h2 class="panel-title">Carga por responsável</h2>
        </div>
        <ul class="divide-y divide-graphite-100">
          <li
            v-for="item in metrics?.porResponsavel"
            :key="item.userId ?? 'nenhum'"
            class="flex items-center justify-between gap-3 px-5 py-3"
          >
            <span class="flex min-w-0 items-center gap-2.5">
              <span
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                :class="item.userId ? 'bg-graphite-950 text-white' : 'bg-graphite-100 text-graphite-400'"
                aria-hidden="true"
              >
                {{ item.name.slice(0, 2).toUpperCase() }}
              </span>
              <span class="truncate text-[13px] text-graphite-700">{{ item.name }}</span>
            </span>
            <span class="shrink-0 text-[13px] font-medium text-graphite-950">{{ item.total }}</span>
          </li>
          <li v-if="!metrics?.porResponsavel.length" class="px-5 py-8 text-center text-[13px] text-graphite-400">
            Sem atribuições.
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
