<script setup lang="ts">
import type { RequestStatusDto } from '@alson/shared';

useHead({ title: 'Pipeline' });

const api = useApi();
const toast = useToast();

const statuses = ref<RequestStatusDto[]>([]);
const loading = ref(true);
const draggingId = ref<string | null>(null);

const showEditor = ref(false);
const editing = ref<RequestStatusDto | null>(null);
const saving = ref(false);
const errors = ref<Record<string, string[]>>({});

const form = reactive({
  name: '',
  color: '#64748B',
  isInitial: false,
  isFinal: false,
  notifyRequester: false,
  active: true,
});

/** Paleta sugerida, para manter a coerência visual do quadro. */
const palette = ['#3F3F46', '#6366F1', '#0EA5E9', '#F59E0B', '#8B5CF6', '#10B981', '#EF4444', '#64748B'];

async function load(): Promise<void> {
  loading.value = true;
  try {
    statuses.value = await api.get<RequestStatusDto[]>('/request-statuses');
  } finally {
    loading.value = false;
  }
}

function openNew(): void {
  editing.value = null;
  errors.value = {};
  Object.assign(form, {
    name: '',
    color: palette[statuses.value.length % palette.length],
    isInitial: false,
    isFinal: false,
    notifyRequester: true,
    active: true,
  });
  showEditor.value = true;
}

function openEdit(status: RequestStatusDto): void {
  editing.value = status;
  errors.value = {};
  Object.assign(form, {
    name: status.name,
    color: status.color,
    isInitial: status.isInitial,
    isFinal: status.isFinal,
    notifyRequester: status.notifyRequester,
    active: status.active,
  });
  showEditor.value = true;
}

async function save(): Promise<void> {
  saving.value = true;
  errors.value = {};
  try {
    if (editing.value) {
      await api.patch(`/request-statuses/${editing.value.id}`, { ...form });
      toast.success('Estado actualizado.');
    } else {
      await api.post('/request-statuses', { ...form });
      toast.success('Estado criado. Já aparece como coluna no Kanban.');
    }
    showEditor.value = false;
    await load();
  } catch (error) {
    const failure = toApiFailure(error);
    errors.value = failure.details;
    if (!Object.keys(failure.details).length) toast.error(failure.message);
  } finally {
    saving.value = false;
  }
}

async function remove(status: RequestStatusDto): Promise<void> {
  if (!confirm(`Remover o estado "${status.name}"? Só é possível se não houver pedidos neste estado.`)) return;
  try {
    await api.delete(`/request-statuses/${status.id}`);
    toast.success('Estado removido.');
    await load();
  } catch (error) {
    toast.error(toApiFailure(error).message);
  }
}

async function onDrop(event: DragEvent, target: RequestStatusDto): Promise<void> {
  event.preventDefault();
  const sourceId = draggingId.value;
  draggingId.value = null;
  if (!sourceId || sourceId === target.id) return;

  const ordered = [...statuses.value];
  const from = ordered.findIndex((item) => item.id === sourceId);
  const to = ordered.findIndex((item) => item.id === target.id);
  ordered.splice(to, 0, ordered.splice(from, 1)[0]);

  try {
    statuses.value = await api.patch<RequestStatusDto[]>('/request-statuses/reorder', {
      statusIds: ordered.map((item) => item.id),
    });
    toast.success('Ordem do pipeline actualizada.');
  } catch (error) {
    toast.error(toApiFailure(error).message);
    await load();
  }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold tracking-tight text-graphite-950">Pipeline de estados</h1>
        <p class="mt-1 text-[13px] text-graphite-500">
          Cada estado é uma coluna do Kanban. A ordem define o percurso natural dos pedidos.
        </p>
      </div>
      <button type="button" class="btn-primary" @click="openNew">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Novo estado
      </button>
    </div>

    <div v-if="loading" class="py-20 text-center text-[13px] text-graphite-400">A carregar…</div>

    <ul v-else class="mt-6 max-w-3xl space-y-2">
      <li
        v-for="(status, index) in statuses"
        :key="status.id"
        draggable="true"
        class="panel flex items-center gap-4 p-4 transition-shadow hover:shadow-[var(--shadow-panel)]"
        :class="[draggingId === status.id && 'opacity-40', !status.active && 'bg-graphite-50']"
        @dragstart="draggingId = status.id"
        @dragend="draggingId = null"
        @dragover.prevent
        @drop="onDrop($event, status)"
      >
        <span class="cursor-grab text-graphite-300" aria-hidden="true">
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm6 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM7 9a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm6 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM7 14a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm6 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
          </svg>
        </span>

        <span class="font-mono text-[11px] text-graphite-300">{{ String(index + 1).padStart(2, '0') }}</span>

        <span class="h-4 w-4 shrink-0 rounded-full" :style="{ backgroundColor: status.color }" aria-hidden="true" />

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-[14px] font-medium text-graphite-950">{{ status.name }}</span>
            <span v-if="status.isInitial" class="badge bg-graphite-950 text-white">estado inicial</span>
            <span v-if="status.isFinal" class="badge bg-graphite-100 text-graphite-600">estado final</span>
            <span v-if="!status.active" class="badge bg-amber-100 text-amber-700">inactivo</span>
          </div>
          <p class="mt-1 flex flex-wrap items-center gap-x-3 text-[12px] text-graphite-400">
            <span class="font-mono">{{ status.key }}</span>
            <span>·</span>
            <span>{{ status.notifyRequester ? 'notifica o requerente por e-mail' : 'sem notificação' }}</span>
          </p>
        </div>

        <div class="flex shrink-0 gap-1.5">
          <button type="button" class="btn-secondary btn-xs" @click="openEdit(status)">Editar</button>
          <button
            type="button"
            class="btn-danger btn-xs"
            :disabled="status.isInitial"
            :title="status.isInitial ? 'O estado inicial não pode ser removido.' : undefined"
            @click="remove(status)"
          >
            Remover
          </button>
        </div>
      </li>
    </ul>

    <ModalDialog v-model="showEditor" :title="editing ? `Editar estado: ${editing.name}` : 'Novo estado'">
      <form class="space-y-4" novalidate @submit.prevent="save">
        <div>
          <label for="p-name" class="label">Nome do estado</label>
          <input id="p-name" v-model="form.name" type="text" class="input" :class="errors.name && 'input-error'" placeholder="Ex.: Aguarda documentação" />
          <p v-for="m in errors.name" :key="m" class="field-error">{{ m }}</p>
        </div>

        <div>
          <span class="label">Cor da coluna</span>
          <div class="flex flex-wrap items-center gap-2">
            <button
              v-for="colour in palette"
              :key="colour"
              type="button"
              class="h-8 w-8 rounded-full border-2 transition-transform"
              :class="form.color.toUpperCase() === colour.toUpperCase() ? 'scale-110 border-graphite-950' : 'border-transparent'"
              :style="{ backgroundColor: colour }"
              :aria-label="`Escolher a cor ${colour}`"
              @click="form.color = colour"
            />
            <input v-model="form.color" type="text" class="input ml-2 w-28 font-mono text-[12px]" :class="errors.color && 'input-error'" />
          </div>
          <p v-for="m in errors.color" :key="m" class="field-error">{{ m }}</p>
        </div>

        <div class="space-y-2.5 rounded-sm border border-graphite-200 bg-graphite-50 p-4">
          <label class="flex cursor-pointer items-start gap-2.5 text-[13px] text-graphite-700">
            <input v-model="form.isInitial" type="checkbox" class="mt-0.5 h-3.5 w-3.5 accent-graphite-950" />
            <span>
              Estado inicial
              <span class="mt-0.5 block text-[11px] text-graphite-400">
                Atribuído automaticamente a todos os pedidos novos. Só pode existir um.
              </span>
            </span>
          </label>

          <label class="flex cursor-pointer items-start gap-2.5 text-[13px] text-graphite-700">
            <input v-model="form.isFinal" type="checkbox" class="mt-0.5 h-3.5 w-3.5 accent-graphite-950" :disabled="form.isInitial" />
            <span>
              Estado final
              <span class="mt-0.5 block text-[11px] text-graphite-400">
                Fecha o pedido e alimenta o indicador de tempo médio de resolução.
              </span>
            </span>
          </label>

          <label class="flex cursor-pointer items-start gap-2.5 text-[13px] text-graphite-700">
            <input v-model="form.notifyRequester" type="checkbox" class="mt-0.5 h-3.5 w-3.5 accent-graphite-950" />
            <span>
              Notificar o requerente
              <span class="mt-0.5 block text-[11px] text-graphite-400">
                Envia e-mail automático sempre que um pedido entra neste estado.
              </span>
            </span>
          </label>

          <label class="flex cursor-pointer items-center gap-2.5 text-[13px] text-graphite-700">
            <input v-model="form.active" type="checkbox" class="h-3.5 w-3.5 accent-graphite-950" />
            Estado activo
          </label>
        </div>

        <div class="flex justify-end gap-2 pt-1">
          <button type="button" class="btn-secondary" @click="showEditor = false">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="saving">
            {{ saving ? 'A guardar…' : 'Guardar' }}
          </button>
        </div>
      </form>
    </ModalDialog>
  </div>
</template>
