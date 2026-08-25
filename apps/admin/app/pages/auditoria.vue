<script setup lang="ts">
import { AUDIT_ACTIONS, formatDate, type AuditLogDto, type PaginatedResult } from '@alson/shared';

useHead({ title: 'Auditoria' });

const api = useApi();

const items = ref<AuditLogDto[]>([]);
const meta = ref({ page: 1, perPage: 30, total: 0, totalPages: 1 });
const loading = ref(true);
const expanded = ref<string | null>(null);

const filters = reactive({ entity: '', action: '', dateFrom: '', dateTo: '', page: 1 });

/** Entidades auditadas, correspondentes ao que os casos de uso registam. */
const entities = ['Request', 'Service', 'FormField', 'RequestStatus', 'User', 'Note', 'Attachment'];

const actionLabels: Record<string, string> = {
  CREATE: 'Criação',
  UPDATE: 'Alteração',
  DELETE: 'Remoção',
  LOGIN: 'Início de sessão',
  LOGOUT: 'Fim de sessão',
};

const actionStyles: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700',
  UPDATE: 'bg-sky-100 text-sky-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN: 'bg-graphite-100 text-graphite-600',
  LOGOUT: 'bg-graphite-100 text-graphite-500',
};

async function load(): Promise<void> {
  loading.value = true;
  try {
    const params: Record<string, string | number> = { page: filters.page, perPage: meta.value.perPage };
    for (const [key, value] of Object.entries(filters)) {
      if (key !== 'page' && value) params[key] = value as string;
    }

    const result = await api.get<PaginatedResult<AuditLogDto>>('/audit-logs', params);
    items.value = result.items;
    meta.value = result.meta;
  } finally {
    loading.value = false;
  }
}

function applyFilters(): void {
  filters.page = 1;
  void load();
}

function goToPage(page: number): void {
  filters.page = Math.min(Math.max(1, page), meta.value.totalPages);
  void load();
}

/** Formata um valor do diff para leitura humana. */
function display(value: unknown): string {
  if (value === null || value === undefined) return 'sem valor';
  if (typeof value === 'boolean') return value ? 'sim' : 'não';
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'lista vazia';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

onMounted(load);
</script>

<template>
  <div>
    <div>
      <h1 class="text-xl font-semibold tracking-tight text-graphite-950">Auditoria</h1>
      <p class="mt-1 text-[13px] text-graphite-500">
        Registo imutável de quem alterou o quê e quando. {{ meta.total }} registo(s).
      </p>
    </div>

    <section class="panel mt-6 p-4" aria-label="Filtros de auditoria">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label for="a-entity" class="label">Entidade</label>
          <select id="a-entity" v-model="filters.entity" class="input" @change="applyFilters">
            <option value="">Todas</option>
            <option v-for="entity in entities" :key="entity" :value="entity">{{ entity }}</option>
          </select>
        </div>
        <div>
          <label for="a-action" class="label">Acção</label>
          <select id="a-action" v-model="filters.action" class="input" @change="applyFilters">
            <option value="">Todas</option>
            <option v-for="action in AUDIT_ACTIONS" :key="action" :value="action">
              {{ actionLabels[action] }}
            </option>
          </select>
        </div>
        <div>
          <label for="a-from" class="label">De</label>
          <input id="a-from" v-model="filters.dateFrom" type="date" class="input" @change="applyFilters" />
        </div>
        <div>
          <label for="a-to" class="label">Até</label>
          <input id="a-to" v-model="filters.dateTo" type="date" class="input" @change="applyFilters" />
        </div>
      </div>
    </section>

    <section class="panel mt-6 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px]">
          <thead>
            <tr>
              <th class="table-head">Data</th>
              <th class="table-head">Autor</th>
              <th class="table-head">Acção</th>
              <th class="table-head">Entidade</th>
              <th class="table-head">Alterações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="px-4 py-12 text-center text-[13px] text-graphite-400">A carregar…</td>
            </tr>

            <template v-for="entry in items" v-else :key="entry.id">
              <tr class="hover:bg-graphite-50">
                <td class="table-cell whitespace-nowrap">{{ formatDate(entry.createdAt, true) }}</td>
                <td class="table-cell">
                  <span v-if="entry.actor">{{ entry.actor.name }}</span>
                  <span v-else class="text-graphite-300">sistema</span>
                  <span v-if="entry.ipAddress" class="ml-1.5 font-mono text-[11px] text-graphite-300">
                    {{ entry.ipAddress }}
                  </span>
                </td>
                <td class="table-cell">
                  <span class="badge" :class="actionStyles[entry.action]">{{ actionLabels[entry.action] }}</span>
                </td>
                <td class="table-cell">
                  <span class="font-medium text-graphite-800">{{ entry.entity }}</span>
                  <span class="ml-1 font-mono text-[11px] text-graphite-300">
                    {{ entry.entityId.slice(0, 8) }}
                  </span>
                </td>
                <td class="table-cell">
                  <button
                    v-if="entry.changes && Object.keys(entry.changes).length"
                    type="button"
                    class="text-[12px] text-graphite-600 underline-offset-2 hover:text-graphite-950 hover:underline"
                    :aria-expanded="expanded === entry.id"
                    @click="expanded = expanded === entry.id ? null : entry.id"
                  >
                    {{ Object.keys(entry.changes).length }} campo(s)
                    {{ expanded === entry.id ? '−' : '+' }}
                  </button>
                  <span v-else class="text-graphite-300">sem alterações</span>
                </td>
              </tr>

              <tr v-if="expanded === entry.id && entry.changes" class="bg-graphite-50">
                <td colspan="5" class="border-b border-graphite-100 px-4 py-3">
                  <table class="w-full">
                    <tbody>
                      <tr v-for="(change, field) in entry.changes" :key="field">
                        <td class="w-40 py-1.5 pr-4 align-top text-[12px] font-medium text-graphite-600">
                          {{ field }}
                        </td>
                        <td class="py-1.5 text-[12px]">
                          <span class="text-graphite-400 line-through">{{ display(change.from) }}</span>
                          <span class="mx-2 text-graphite-300" aria-label="alterado para">→</span>
                          <span class="text-graphite-900">{{ display(change.to) }}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </template>

            <tr v-if="!loading && !items.length">
              <td colspan="5" class="px-4 py-16 text-center text-[13px] text-graphite-400">
                Nenhum registo de auditoria com os filtros aplicados.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="meta.totalPages > 1" class="flex items-center justify-between gap-4 border-t border-graphite-200 px-4 py-3">
        <p class="text-[12px] text-graphite-500">Página {{ meta.page }} de {{ meta.totalPages }}</p>
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
