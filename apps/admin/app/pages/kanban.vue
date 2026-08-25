<script setup lang="ts">
import {
  PRIORITIES,
  PRIORITY_LABELS,
  timeAgo,
  type PaginatedResult,
  type RequestListItemDto,
  type ServiceSummaryDto,
  type UserSummaryDto,
} from '@alson/shared';

useHead({ title: 'Kanban' });

interface KanbanColumn {
  status: { id: string; key: string; name: string; color: string; order: number };
  total: number;
  items: RequestListItemDto[];
}

const api = useApi();
const toast = useToast();

const columns = ref<KanbanColumn[]>([]);
const services = ref<ServiceSummaryDto[]>([]);
const users = ref<UserSummaryDto[]>([]);
const loading = ref(true);

const filters = reactive({ search: '', serviceId: '', assigneeId: '', priority: '' });

/** Identificador do pedido a ser arrastado e da coluna sob o cursor. */
const draggingId = ref<string | null>(null);
const dragOverStatusId = ref<string | null>(null);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(filters)) if (value) params[key] = value;

    columns.value = await api.get<KanbanColumn[]>('/requests/kanban', params);
  } catch (error) {
    toast.error(toApiFailure(error).message);
  } finally {
    loading.value = false;
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => ({ ...filters }),
  () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(load, 300);
  },
  { deep: true },
);

/* ------------------------------ Drag & drop ------------------------------- */

function onDragStart(event: DragEvent, requestId: string): void {
  draggingId.value = requestId;
  event.dataTransfer!.effectAllowed = 'move';
  event.dataTransfer!.setData('text/plain', requestId);
}

function onDragEnd(): void {
  draggingId.value = null;
  dragOverStatusId.value = null;
}

/**
 * Larga o cartão numa coluna: move-o localmente de imediato (a interface
 * responde sem esperar pela rede) e, se a API recusar, recarrega o quadro para
 * repor o estado real.
 */
async function onDrop(event: DragEvent, statusId: string): Promise<void> {
  event.preventDefault();
  dragOverStatusId.value = null;

  const requestId = event.dataTransfer?.getData('text/plain') || draggingId.value;
  draggingId.value = null;
  if (!requestId) return;

  const origin = columns.value.find((column) => column.items.some((item) => item.id === requestId));
  const target = columns.value.find((column) => column.status.id === statusId);
  if (!origin || !target || origin.status.id === statusId) return;

  const card = origin.items.find((item) => item.id === requestId)!;

  // Movimento optimista.
  origin.items = origin.items.filter((item) => item.id !== requestId);
  origin.total -= 1;
  target.items = [{ ...card, status: { ...card.status, ...target.status } as never }, ...target.items];
  target.total += 1;

  try {
    await api.patch(`/requests/${requestId}/status`, { statusId });
    toast.success(`${card.reference} movido para «${target.status.name}».`);
    await load();
  } catch (error) {
    toast.error(toApiFailure(error).message);
    await load();
  }
}

onMounted(async () => {
  const [serviceList, userList] = await Promise.all([
    api.get<PaginatedResult<ServiceSummaryDto>>('/services', { perPage: 100 }),
    api
      .get<PaginatedResult<UserSummaryDto>>('/users', { perPage: 100, active: 'true' })
      .catch(() => ({ items: [] as UserSummaryDto[] })),
  ]);
  services.value = serviceList.items;
  users.value = userList.items;
  await load();
});

const totalVisible = computed(() => columns.value.reduce((sum, column) => sum + column.total, 0));
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold tracking-tight text-graphite-950">Kanban</h1>
        <p class="mt-1 text-[13px] text-graphite-500">
          {{ totalVisible }} pedido(s) · arraste um cartão para mudar de estado
        </p>
      </div>

      <NuxtLink to="/pedidos" class="btn-secondary">Vista em lista</NuxtLink>
    </div>

    <!-- Filtros -->
    <section class="panel mt-6 p-4" aria-label="Filtros do Kanban">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label for="k-search" class="label">Pesquisar</label>
          <input id="k-search" v-model="filters.search" type="search" class="input" placeholder="Referência ou requerente" />
        </div>
        <div>
          <label for="k-service" class="label">Serviço</label>
          <select id="k-service" v-model="filters.serviceId" class="input">
            <option value="">Todos</option>
            <option v-for="service in services" :key="service.id" :value="service.id">{{ service.name }}</option>
          </select>
        </div>
        <div v-if="users.length">
          <label for="k-assignee" class="label">Responsável</label>
          <select id="k-assignee" v-model="filters.assigneeId" class="input">
            <option value="">Todos</option>
            <option value="unassigned">Sem responsável</option>
            <option v-for="user in users" :key="user.id" :value="user.id">{{ user.name }}</option>
          </select>
        </div>
        <div>
          <label for="k-priority" class="label">Prioridade</label>
          <select id="k-priority" v-model="filters.priority" class="input">
            <option value="">Todas</option>
            <option v-for="priority in PRIORITIES" :key="priority" :value="priority">
              {{ PRIORITY_LABELS[priority] }}
            </option>
          </select>
        </div>
      </div>
    </section>

    <!-- Quadro -->
    <div v-if="loading" class="py-24 text-center text-[13px] text-graphite-400">A carregar quadro…</div>

    <div v-else class="mt-6 overflow-x-auto pb-4">
      <div class="flex gap-4" style="min-width: max-content">
        <section
          v-for="column in columns"
          :key="column.status.id"
          class="flex w-72 shrink-0 flex-col rounded-sm border border-graphite-200 bg-graphite-50 transition-colors"
          :class="dragOverStatusId === column.status.id && 'kanban-column-over'"
          :aria-label="`Coluna ${column.status.name}`"
          @dragover.prevent="dragOverStatusId = column.status.id"
          @dragleave="dragOverStatusId = null"
          @drop="onDrop($event, column.status.id)"
        >
          <header class="flex items-center justify-between gap-2 border-b border-graphite-200 bg-white px-4 py-3">
            <span class="flex min-w-0 items-center gap-2">
              <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: column.status.color }" aria-hidden="true" />
              <h2 class="truncate text-[13px] font-semibold text-graphite-900">{{ column.status.name }}</h2>
            </span>
            <span class="shrink-0 rounded-full bg-graphite-100 px-2 py-0.5 text-[11px] font-medium text-graphite-600">
              {{ column.total }}
            </span>
          </header>

          <div class="flex-1 space-y-2 overflow-y-auto p-2" style="max-height: calc(100vh - 22rem)">
            <article
              v-for="item in column.items"
              :key="item.id"
              draggable="true"
              class="cursor-grab rounded-sm border border-graphite-200 bg-white p-3 transition-shadow hover:shadow-[var(--shadow-panel)] active:cursor-grabbing"
              :class="draggingId === item.id && 'kanban-card-dragging'"
              @dragstart="onDragStart($event, item.id)"
              @dragend="onDragEnd"
            >
              <div class="flex items-start justify-between gap-2">
                <NuxtLink :to="`/pedidos/${item.id}`" class="font-mono text-[11px] font-medium text-graphite-950 hover:underline">
                  {{ item.reference }}
                </NuxtLink>
                <PriorityBadge v-if="item.priority !== 'NORMAL'" :priority="item.priority" />
              </div>

              <p class="mt-2 truncate text-[13px] font-medium text-graphite-900">{{ item.requesterName }}</p>
              <p class="mt-0.5 truncate text-[12px] text-graphite-500">{{ item.service.name }}</p>

              <div class="mt-3 flex items-center justify-between gap-2 border-t border-graphite-100 pt-2.5">
                <span
                  v-if="item.assignee"
                  class="flex h-5 w-5 items-center justify-center rounded-full bg-graphite-950 text-[9px] font-semibold text-white"
                  :title="item.assignee.name"
                >
                  {{ item.assignee.name.slice(0, 2).toUpperCase() }}
                </span>
                <span v-else class="text-[11px] text-graphite-300">Sem responsável</span>

                <span class="text-[11px] text-graphite-400">{{ timeAgo(item.createdAt) }}</span>
              </div>
            </article>

            <p v-if="!column.items.length" class="px-2 py-8 text-center text-[12px] text-graphite-300">
              Sem pedidos
            </p>

            <p
              v-else-if="column.total > column.items.length"
              class="px-2 py-2 text-center text-[11px] text-graphite-400"
            >
              a mostrar {{ column.items.length }} de {{ column.total }}
            </p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
