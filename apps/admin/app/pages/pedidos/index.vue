<script setup lang="ts">
import {
  PRIORITIES,
  PRIORITY_LABELS,
  formatDate,
  timeAgo,
  type PaginatedResult,
  type RequestListItemDto,
  type RequestStatusDto,
  type ServiceSummaryDto,
  type UserSummaryDto,
} from '@alson/shared';

useHead({ title: 'Pedidos' });

const api = useApi();
const route = useRoute();
const router = useRouter();

const items = ref<RequestListItemDto[]>([]);
const meta = ref({ page: 1, perPage: 20, total: 0, totalPages: 1 });
const loading = ref(true);

const statuses = ref<RequestStatusDto[]>([]);
const services = ref<ServiceSummaryDto[]>([]);
const users = ref<UserSummaryDto[]>([]);

/** Os filtros vivem na query string: um link partilhado reproduz a mesma vista. */
const filters = reactive({
  search: String(route.query.search ?? ''),
  serviceId: String(route.query.serviceId ?? ''),
  statusId: String(route.query.statusId ?? ''),
  assigneeId: String(route.query.assigneeId ?? ''),
  priority: String(route.query.priority ?? ''),
  dateFrom: String(route.query.dateFrom ?? ''),
  dateTo: String(route.query.dateTo ?? ''),
  openOnly: route.query.openOnly === 'true',
  sort: String(route.query.sort ?? 'createdAt'),
  direction: String(route.query.direction ?? 'desc'),
  page: Number(route.query.page ?? 1),
});

const activeFilterCount = computed(
  () =>
    [filters.serviceId, filters.statusId, filters.assigneeId, filters.priority, filters.dateFrom, filters.dateTo]
      .filter(Boolean).length + (filters.openOnly ? 1 : 0),
);

function queryFromFilters(): Record<string, string> {
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === '' || value === false || (key === 'page' && value === 1)) continue;
    query[key] = String(value);
  }
  return query;
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    const result = await api.get<PaginatedResult<RequestListItemDto>>('/requests', {
      ...queryFromFilters(),
      page: filters.page,
      perPage: meta.value.perPage,
    });
    items.value = result.items;
    meta.value = result.meta;
  } finally {
    loading.value = false;
  }
}

/** Sincroniza o URL e recarrega. */
async function applyFilters(resetPage = true): Promise<void> {
  if (resetPage) filters.page = 1;
  await router.replace({ query: queryFromFilters() });
  await load();
}

function clearFilters(): void {
  Object.assign(filters, {
    search: '',
    serviceId: '',
    statusId: '',
    assigneeId: '',
    priority: '',
    dateFrom: '',
    dateTo: '',
    openOnly: false,
    page: 1,
  });
  void applyFilters();
}

function toggleSort(field: string): void {
  if (filters.sort === field) {
    filters.direction = filters.direction === 'asc' ? 'desc' : 'asc';
  } else {
    filters.sort = field;
    filters.direction = 'desc';
  }
  void applyFilters();
}

function goToPage(page: number): void {
  filters.page = Math.min(Math.max(1, page), meta.value.totalPages);
  void applyFilters(false);
}

/** Evita um pedido à API a cada tecla escrita na pesquisa. */
let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => filters.search,
  () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => applyFilters(), 350);
  },
);

onMounted(async () => {
  const [statusList, serviceList, userList] = await Promise.all([
    api.get<RequestStatusDto[]>('/request-statuses', { onlyActive: 'true' }),
    api.get<PaginatedResult<ServiceSummaryDto>>('/services', { perPage: 100 }),
    api
      .get<PaginatedResult<UserSummaryDto>>('/users', { perPage: 100, active: 'true' })
      // Um agente não tem permissão para listar utilizadores: o filtro de
      // responsável simplesmente não aparece.
      .catch(() => ({ items: [] as UserSummaryDto[] })),
  ]);

  statuses.value = statusList;
  services.value = serviceList.items;
  users.value = userList.items;

  await load();
});
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold tracking-tight text-graphite-950">Pedidos</h1>
        <p class="mt-1 text-[13px] text-graphite-500">
          {{ meta.total }} pedido(s) encontrado(s)
          <span v-if="activeFilterCount"> · {{ activeFilterCount }} filtro(s) activo(s)</span>
        </p>
      </div>

      <NuxtLink to="/kanban" class="btn-secondary">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 3.75v16.5M15 3.75v16.5M3.75 6.75h16.5" />
        </svg>
        Vista Kanban
      </NuxtLink>
    </div>

    <!-- Filtros -->
    <section class="panel mt-6 p-4" aria-label="Filtros">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <div class="sm:col-span-2">
          <label for="f-search" class="label">Pesquisar</label>
          <div class="relative">
            <svg
              class="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-300"
              fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              id="f-search"
              v-model="filters.search"
              type="search"
              class="input pl-8"
              placeholder="Referência, nome, e-mail ou conteúdo do formulário"
            />
          </div>
        </div>

        <div>
          <label for="f-service" class="label">Serviço</label>
          <select id="f-service" v-model="filters.serviceId" class="input" @change="applyFilters()">
            <option value="">Todos</option>
            <option v-for="service in services" :key="service.id" :value="service.id">
              {{ service.name }}
            </option>
          </select>
        </div>

        <div>
          <label for="f-status" class="label">Estado</label>
          <select id="f-status" v-model="filters.statusId" class="input" @change="applyFilters()">
            <option value="">Todos</option>
            <option v-for="status in statuses" :key="status.id" :value="status.id">
              {{ status.name }}
            </option>
          </select>
        </div>

        <div v-if="users.length">
          <label for="f-assignee" class="label">Responsável</label>
          <select id="f-assignee" v-model="filters.assigneeId" class="input" @change="applyFilters()">
            <option value="">Todos</option>
            <option value="unassigned">Sem responsável</option>
            <option v-for="user in users" :key="user.id" :value="user.id">{{ user.name }}</option>
          </select>
        </div>

        <div>
          <label for="f-priority" class="label">Prioridade</label>
          <select id="f-priority" v-model="filters.priority" class="input" @change="applyFilters()">
            <option value="">Todas</option>
            <option v-for="priority in PRIORITIES" :key="priority" :value="priority">
              {{ PRIORITY_LABELS[priority] }}
            </option>
          </select>
        </div>

        <div>
          <label for="f-from" class="label">De</label>
          <input id="f-from" v-model="filters.dateFrom" type="date" class="input" @change="applyFilters()" />
        </div>

        <div>
          <label for="f-to" class="label">Até</label>
          <input id="f-to" v-model="filters.dateTo" type="date" class="input" @change="applyFilters()" />
        </div>
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-4 border-t border-graphite-100 pt-3">
        <label class="flex cursor-pointer items-center gap-2 text-[13px] text-graphite-600">
          <input
            v-model="filters.openOnly"
            type="checkbox"
            class="h-3.5 w-3.5 accent-graphite-950"
            @change="applyFilters()"
          />
          Mostrar apenas pedidos em curso
        </label>

        <button
          v-if="activeFilterCount || filters.search"
          type="button"
          class="text-[13px] text-graphite-500 underline-offset-2 hover:text-graphite-900 hover:underline"
          @click="clearFilters"
        >
          Limpar filtros
        </button>
      </div>
    </section>

    <!-- Tabela -->
    <section class="panel mt-6 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px]">
          <thead>
            <tr>
              <th class="table-head">
                <button type="button" class="flex items-center gap-1 hover:text-graphite-900" @click="toggleSort('reference')">
                  Referência
                  <SortIndicator :field="'reference'" :sort="filters.sort" :direction="filters.direction" />
                </button>
              </th>
              <th class="table-head">Requerente</th>
              <th class="table-head">Serviço</th>
              <th class="table-head">Estado</th>
              <th class="table-head">
                <button type="button" class="flex items-center gap-1 hover:text-graphite-900" @click="toggleSort('priority')">
                  Prioridade
                  <SortIndicator :field="'priority'" :sort="filters.sort" :direction="filters.direction" />
                </button>
              </th>
              <th class="table-head">Responsável</th>
              <th class="table-head">
                <button type="button" class="flex items-center gap-1 hover:text-graphite-900" @click="toggleSort('createdAt')">
                  Entrada
                  <SortIndicator :field="'createdAt'" :sort="filters.sort" :direction="filters.direction" />
                </button>
              </th>
              <th class="table-head"><span class="sr-only">Acções</span></th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="loading">
              <td colspan="8" class="px-4 py-12 text-center text-[13px] text-graphite-400">A carregar…</td>
            </tr>

            <tr v-for="item in items" v-else :key="item.id" class="group hover:bg-graphite-50">
              <td class="table-cell">
                <NuxtLink :to="`/pedidos/${item.id}`" class="font-mono text-[12px] font-medium text-graphite-950 hover:underline">
                  {{ item.reference }}
                </NuxtLink>
              </td>
              <td class="table-cell">
                <span class="block font-medium text-graphite-900">{{ item.requesterName }}</span>
                <span class="block truncate text-[12px] text-graphite-400">{{ item.requesterEmail }}</span>
              </td>
              <td class="table-cell">
                <span class="block max-w-[200px] truncate">{{ item.service.name }}</span>
              </td>
              <td class="table-cell"><StatusBadge :status="item.status" /></td>
              <td class="table-cell"><PriorityBadge :priority="item.priority" /></td>
              <td class="table-cell">
                <span v-if="item.assignee">{{ item.assignee.name }}</span>
                <span v-else class="text-graphite-300">sem responsável</span>
              </td>
              <td class="table-cell whitespace-nowrap">
                <span :title="formatDate(item.createdAt, true)">{{ timeAgo(item.createdAt) }}</span>
              </td>
              <td class="table-cell text-right">
                <NuxtLink :to="`/pedidos/${item.id}`" class="btn-secondary btn-xs opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100">
                  Abrir
                </NuxtLink>
              </td>
            </tr>

            <tr v-if="!loading && !items.length">
              <td colspan="8" class="px-4 py-16 text-center">
                <p class="text-[14px] font-medium text-graphite-700">Nenhum pedido encontrado</p>
                <p class="mt-1 text-[13px] text-graphite-400">
                  {{ activeFilterCount || filters.search ? 'Experimente ajustar os filtros aplicados.' : 'Ainda não foram submetidos pedidos no site.' }}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginação -->
      <div
        v-if="meta.totalPages > 1"
        class="flex items-center justify-between gap-4 border-t border-graphite-200 px-4 py-3"
      >
        <p class="text-[12px] text-graphite-500">
          Página {{ meta.page }} de {{ meta.totalPages }} · {{ meta.total }} registo(s)
        </p>
        <div class="flex gap-1.5">
          <button type="button" class="btn-secondary btn-xs" :disabled="meta.page <= 1" @click="goToPage(meta.page - 1)">
            Anterior
          </button>
          <button type="button" class="btn-secondary btn-xs" :disabled="meta.page >= meta.totalPages" @click="goToPage(meta.page + 1)">
            Seguinte
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
