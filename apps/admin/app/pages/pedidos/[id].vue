<script setup lang="ts">
import {
  HISTORY_EVENT_LABELS,
  PRIORITIES,
  PRIORITY_LABELS,
  formatBytes,
  formatDate,
  timeAgo,
  type PaginatedResult,
  type Priority,
  type RequestDetailDto,
  type RequestStatusDto,
  type UserSummaryDto,
} from '@alson/shared';

const route = useRoute();
const api = useApi();
const auth = useAuth();
const toast = useToast();

const id = String(route.params.id);
const request = ref<RequestDetailDto | null>(null);
const statuses = ref<RequestStatusDto[]>([]);
const users = ref<UserSummaryDto[]>([]);
const loading = ref(true);
const busy = ref('');

const newNote = ref('');
const uploading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

useHead({ title: () => (request.value ? `Pedido ${request.value.reference}` : 'Pedido') });

async function load(): Promise<void> {
  try {
    request.value = await api.get<RequestDetailDto>(`/requests/${id}`);
  } catch (error) {
    const failure = toApiFailure(error);
    if (failure.status === 404) {
      throw createError({ statusCode: 404, statusMessage: 'Pedido não encontrado', fatal: true });
    }
    toast.error(failure.message);
  } finally {
    loading.value = false;
  }
}

/** Executa uma acção mostrando estado ocupado e tratando o erro de forma uniforme. */
async function run(key: string, action: () => Promise<RequestDetailDto | void>, successMessage: string): Promise<void> {
  busy.value = key;
  try {
    const result = await action();
    if (result) request.value = result;
    toast.success(successMessage);
  } catch (error) {
    toast.error(toApiFailure(error).message);
  } finally {
    busy.value = '';
  }
}

function changeStatus(statusId: string): void {
  if (!statusId || statusId === request.value?.status.id) return;
  void run(
    'status',
    () => api.patch<RequestDetailDto>(`/requests/${id}/status`, { statusId }),
    'Estado actualizado e registado na timeline.',
  );
}

function changeAssignee(value: string): void {
  const assigneeId = value || null;
  if (assigneeId === (request.value?.assignee?.id ?? null)) return;
  void run(
    'assignee',
    () => api.patch<RequestDetailDto>(`/requests/${id}/assignee`, { assigneeId }),
    assigneeId ? 'Responsável atribuído.' : 'Atribuição removida.',
  );
}

function changePriority(priority: string): void {
  if (priority === request.value?.priority) return;
  void run(
    'priority',
    () => api.patch<RequestDetailDto>(`/requests/${id}/priority`, { priority: priority as Priority }),
    'Prioridade actualizada.',
  );
}

async function addNote(): Promise<void> {
  if (newNote.value.trim().length < 2) return;
  await run('note', () => api.post<RequestDetailDto>(`/requests/${id}/notes`, { body: newNote.value }), 'Nota adicionada.');
  newNote.value = '';
}

function deleteNote(noteId: string): void {
  if (!confirm('Remover esta nota interna? A acção não pode ser anulada.')) return;
  void run('note', () => api.delete<RequestDetailDto>(`/requests/${id}/notes/${noteId}`), 'Nota removida.');
}

async function uploadFiles(event: Event): Promise<void> {
  const files = (event.target as HTMLInputElement).files;
  if (!files?.length) return;

  const formData = new FormData();
  for (const file of Array.from(files)) formData.append('files', file, file.name);

  uploading.value = true;
  try {
    await api.post(`/requests/${id}/attachments`, formData);
    await load();
    toast.success(`${files.length} anexo(s) adicionado(s).`);
  } catch (error) {
    toast.error(toApiFailure(error).message);
  } finally {
    uploading.value = false;
    if (fileInput.value) fileInput.value.value = '';
  }
}

function removeAttachment(attachmentId: string, name: string): void {
  if (!confirm(`Remover o anexo "${name}"?`)) return;
  void run(
    'attachment',
    async () => {
      await api.delete(`/requests/${id}/attachments/${attachmentId}`);
      await load();
    },
    'Anexo removido.',
  );
}

function download(attachmentId: string, filename: string): void {
  void api.download(`/requests/${id}/attachments/${attachmentId}`, filename).catch((error) => {
    toast.error(toApiFailure(error).message);
  });
}

onMounted(async () => {
  const [statusList, userList] = await Promise.all([
    api.get<RequestStatusDto[]>('/request-statuses', { onlyActive: 'true' }),
    api
      .get<PaginatedResult<UserSummaryDto>>('/users', { perPage: 100, active: 'true' })
      .catch(() => ({ items: [] as UserSummaryDto[] })),
  ]);
  statuses.value = statusList;
  users.value = userList.items;
  await load();
});
</script>

<template>
  <div v-if="loading" class="py-24 text-center text-[13px] text-graphite-400">A carregar pedido…</div>

  <div v-else-if="request">
    <!-- Cabeçalho -->
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <NuxtLink to="/pedidos" class="inline-flex items-center gap-1.5 text-[12px] text-graphite-500 hover:text-graphite-900">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Voltar aos pedidos
        </NuxtLink>

        <div class="mt-2 flex flex-wrap items-center gap-3">
          <h1 class="font-mono text-xl font-semibold tracking-tight text-graphite-950">
            {{ request.reference }}
          </h1>
          <StatusBadge :status="request.status" />
          <PriorityBadge :priority="request.priority" />
        </div>

        <p class="mt-1.5 text-[13px] text-graphite-500">
          {{ request.service.name }} · submetido {{ timeAgo(request.createdAt) }}
          ({{ formatDate(request.createdAt, true) }})
        </p>
      </div>

      <a
        :href="`mailto:${request.requesterEmail}?subject=${encodeURIComponent(`Pedido ${request.reference} (${request.service.name})`)}`"
        class="btn-secondary"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
        </svg>
        Responder por e-mail
      </a>
    </div>

    <div class="mt-6 grid gap-6 lg:grid-cols-3">
      <!-- Coluna principal -->
      <div class="space-y-6 lg:col-span-2">
        <!-- Requerente -->
        <section class="panel">
          <div class="panel-header"><h2 class="panel-title">Requerente</h2></div>
          <dl class="grid gap-4 p-5 sm:grid-cols-3">
            <div>
              <dt class="text-[11px] uppercase tracking-wider text-graphite-400">Nome</dt>
              <dd class="mt-1 text-[14px] text-graphite-900">{{ request.requesterName }}</dd>
            </div>
            <div>
              <dt class="text-[11px] uppercase tracking-wider text-graphite-400">E-mail</dt>
              <dd class="mt-1 truncate text-[14px]">
                <a :href="`mailto:${request.requesterEmail}`" class="text-graphite-900 hover:underline">
                  {{ request.requesterEmail }}
                </a>
              </dd>
            </div>
            <div>
              <dt class="text-[11px] uppercase tracking-wider text-graphite-400">Telefone</dt>
              <dd class="mt-1 text-[14px]">
                <a v-if="request.requesterPhone" :href="`tel:${request.requesterPhone}`" class="text-graphite-900 hover:underline">
                  {{ request.requesterPhone }}
                </a>
                <span v-else class="text-graphite-300">não indicado</span>
              </dd>
            </div>
          </dl>
        </section>

        <!-- Dados submetidos -->
        <section class="panel">
          <div class="panel-header">
            <h2 class="panel-title">Dados do formulário</h2>
            <span class="text-[12px] text-graphite-400">{{ request.values.length }} campo(s)</span>
          </div>
          <dl class="divide-y divide-graphite-100">
            <div v-for="value in request.values" :key="value.fieldKey" class="grid gap-1 px-5 py-3 sm:grid-cols-3 sm:gap-4">
              <dt class="text-[13px] text-graphite-500">{{ value.label }}</dt>
              <dd class="text-[13px] text-graphite-900 sm:col-span-2">
                <span v-if="value.displayValue" class="whitespace-pre-wrap">
                  {{ value.displayValue }}
                </span>
                <span v-else class="text-graphite-300">não preenchido</span>
              </dd>
            </div>
            <p v-if="!request.values.length" class="px-5 py-8 text-center text-[13px] text-graphite-400">
              Este pedido não tem dados de formulário associados.
            </p>
          </dl>
        </section>

        <!-- Anexos -->
        <section class="panel">
          <div class="panel-header">
            <h2 class="panel-title">Anexos</h2>
            <div>
              <input ref="fileInput" type="file" multiple class="sr-only" @change="uploadFiles" />
              <button type="button" class="btn-secondary btn-xs" :disabled="uploading" @click="fileInput?.click()">
                {{ uploading ? 'A carregar…' : 'Adicionar ficheiros' }}
              </button>
            </div>
          </div>

          <ul class="divide-y divide-graphite-100">
            <li v-for="attachment in request.attachments" :key="attachment.id" class="flex items-center gap-3 px-5 py-3">
              <svg class="h-4 w-4 shrink-0 text-graphite-300" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25M9 16.5v.75m3-3v3M15 12v5.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <div class="min-w-0 flex-1">
                <p class="truncate text-[13px] text-graphite-900">{{ attachment.originalName }}</p>
                <p class="text-[11px] text-graphite-400">
                  {{ formatBytes(attachment.size) }} · {{ formatDate(attachment.uploadedAt) }}
                  <span v-if="attachment.fieldKey"> · campo «{{ attachment.fieldKey }}»</span>
                </p>
              </div>
              <button type="button" class="btn-secondary btn-xs" @click="download(attachment.id, attachment.originalName)">
                Descarregar
              </button>
              <button
                v-if="auth.can('GESTOR')"
                type="button"
                class="p-1 text-graphite-300 transition-colors hover:text-red-600"
                :aria-label="`Remover ${attachment.originalName}`"
                @click="removeAttachment(attachment.id, attachment.originalName)"
              >
                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </li>
            <li v-if="!request.attachments.length" class="px-5 py-8 text-center text-[13px] text-graphite-400">
              Sem anexos.
            </li>
          </ul>
        </section>

        <!-- Notas internas -->
        <section class="panel">
          <div class="panel-header">
            <h2 class="panel-title">Notas internas</h2>
            <span class="text-[12px] text-graphite-400">visíveis apenas para a equipa</span>
          </div>

          <div class="border-b border-graphite-100 p-5">
            <label for="nota" class="sr-only">Nova nota interna</label>
            <textarea
              id="nota"
              v-model="newNote"
              rows="3"
              class="input resize-y"
              placeholder="Registe contactos, decisões ou próximos passos…"
            />
            <div class="mt-2 flex justify-end">
              <button type="button" class="btn-primary btn-xs" :disabled="busy === 'note' || newNote.trim().length < 2" @click="addNote">
                Adicionar nota
              </button>
            </div>
          </div>

          <ul class="divide-y divide-graphite-100">
            <li v-for="note in request.notes" :key="note.id" class="px-5 py-4">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-[13px] font-medium text-graphite-900">{{ note.author?.name ?? 'Utilizador removido' }}</p>
                  <p class="text-[11px] text-graphite-400">{{ formatDate(note.createdAt, true) }}</p>
                </div>
                <button
                  v-if="note.author?.id === auth.user.value?.id || auth.can('ADMIN')"
                  type="button"
                  class="shrink-0 p-1 text-graphite-300 transition-colors hover:text-red-600"
                  aria-label="Remover nota"
                  @click="deleteNote(note.id)"
                >
                  <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              </div>
              <p class="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-graphite-700">{{ note.body }}</p>
            </li>
            <li v-if="!request.notes.length" class="px-5 py-8 text-center text-[13px] text-graphite-400">
              Ainda não há notas neste pedido.
            </li>
          </ul>
        </section>
      </div>

      <!-- Coluna lateral -->
      <div class="space-y-6">
        <!-- Gestão -->
        <section class="panel">
          <div class="panel-header"><h2 class="panel-title">Gestão do pedido</h2></div>
          <div class="space-y-4 p-5">
            <div>
              <label for="estado" class="label">Estado</label>
              <select
                id="estado"
                class="input"
                :value="request.status.id"
                :disabled="busy === 'status'"
                @change="changeStatus(($event.target as HTMLSelectElement).value)"
              >
                <option v-for="status in statuses" :key="status.id" :value="status.id">{{ status.name }}</option>
              </select>
              <p class="mt-1.5 text-[11px] text-graphite-400">
                A alteração fica registada na timeline e, se o estado o determinar, o requerente é
                notificado por e-mail.
              </p>
            </div>

            <div v-if="users.length">
              <label for="responsavel" class="label">Responsável</label>
              <select
                id="responsavel"
                class="input"
                :value="request.assignee?.id ?? ''"
                :disabled="busy === 'assignee'"
                @change="changeAssignee(($event.target as HTMLSelectElement).value)"
              >
                <option value="">Sem responsável</option>
                <option v-for="user in users" :key="user.id" :value="user.id">{{ user.name }}</option>
              </select>
            </div>

            <div>
              <label for="prioridade" class="label">Prioridade</label>
              <select
                id="prioridade"
                class="input"
                :value="request.priority"
                :disabled="busy === 'priority'"
                @change="changePriority(($event.target as HTMLSelectElement).value)"
              >
                <option v-for="priority in PRIORITIES" :key="priority" :value="priority">
                  {{ PRIORITY_LABELS[priority] }}
                </option>
              </select>
            </div>
          </div>
        </section>

        <!-- Timeline -->
        <section class="panel">
          <div class="panel-header">
            <h2 class="panel-title">Timeline</h2>
            <span class="text-[12px] text-graphite-400">{{ request.history.length }} evento(s)</span>
          </div>

          <ol class="max-h-[32rem] overflow-y-auto p-5">
            <li v-for="(entry, index) in request.history" :key="entry.id" class="relative flex gap-4 pb-5 last:pb-0">
              <span
                v-if="index < request.history.length - 1"
                class="absolute left-[5px] top-4 h-full w-px bg-graphite-200"
                aria-hidden="true"
              />
              <span
                class="relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white"
                :class="index === 0 ? 'bg-graphite-950' : 'bg-graphite-300'"
                aria-hidden="true"
              />
              <div class="min-w-0 flex-1">
                <p class="text-[11px] font-medium uppercase tracking-wider text-graphite-400">
                  {{ HISTORY_EVENT_LABELS[entry.event] }}
                </p>
                <p class="mt-0.5 text-[13px] leading-relaxed text-graphite-800">{{ entry.description }}</p>
                <p class="mt-1 text-[11px] text-graphite-400">
                  {{ formatDate(entry.createdAt, true) }} ·
                  <span class="font-medium text-graphite-500">
                    {{ entry.author?.name ?? 'Site público' }}
                  </span>
                </p>
              </div>
            </li>
          </ol>
        </section>
      </div>
    </div>
  </div>
</template>
