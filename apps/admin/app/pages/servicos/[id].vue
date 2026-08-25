<script setup lang="ts">
import { FIELD_TYPE_LABELS, type FormFieldDto, type ServiceDetailDto } from '@alson/shared';

const route = useRoute();
const api = useApi();
const auth = useAuth();
const toast = useToast();
const config = useRuntimeConfig();

const id = String(route.params.id);
const service = ref<ServiceDetailDto | null>(null);
const loading = ref(true);
const tab = ref<'formulario' | 'conteudo'>('formulario');

useHead({ title: () => service.value?.name ?? 'Serviço' });

/* ----------------------------- Carregamento -------------------------------- */

async function load(): Promise<void> {
  try {
    service.value = await api.get<ServiceDetailDto>(`/services/${id}`);
  } catch (error) {
    const failure = toApiFailure(error);
    if (failure.status === 404) {
      throw createError({ statusCode: 404, statusMessage: 'Serviço não encontrado', fatal: true });
    }
    toast.error(failure.message);
  } finally {
    loading.value = false;
  }
}

onMounted(load);

/* -------------------------- Construtor de campos --------------------------- */

const showEditor = ref(false);
const editing = ref<FormFieldDto | null>(null);
const savingField = ref(false);
const fieldErrors = ref<Record<string, string[]>>({});

const usedKeys = computed(() => service.value?.fields.map((field) => field.key) ?? []);

function openNewField(): void {
  editing.value = null;
  fieldErrors.value = {};
  showEditor.value = true;
}

function openEditField(field: FormFieldDto): void {
  editing.value = field;
  fieldErrors.value = {};
  showEditor.value = true;
}

async function saveField(payload: Record<string, unknown>): Promise<void> {
  savingField.value = true;
  fieldErrors.value = {};
  try {
    if (editing.value) {
      await api.patch(`/services/${id}/fields/${editing.value.id}`, payload);
      toast.success('Campo actualizado.');
    } else {
      await api.post(`/services/${id}/fields`, payload);
      toast.success('Campo adicionado ao formulário.');
    }
    showEditor.value = false;
    await load();
  } catch (error) {
    const failure = toApiFailure(error);
    fieldErrors.value = failure.details;
    if (!Object.keys(failure.details).length) toast.error(failure.message);
  } finally {
    savingField.value = false;
  }
}

async function duplicateField(field: FormFieldDto): Promise<void> {
  try {
    await api.post(`/services/${id}/fields/${field.id}/duplicate`);
    toast.success('Campo duplicado.');
    await load();
  } catch (error) {
    toast.error(toApiFailure(error).message);
  }
}

async function removeField(field: FormFieldDto): Promise<void> {
  if (!confirm(`Remover o campo "${field.label}"? Se já tiver sido respondido, será apenas desactivado.`)) return;

  try {
    const result = await api.delete<{ deactivated: boolean }>(`/services/${id}/fields/${field.id}`);
    toast.success(
      result.deactivated
        ? 'O campo já foi usado em pedidos: foi desactivado em vez de removido, preservando as respostas.'
        : 'Campo removido.',
    );
    await load();
  } catch (error) {
    toast.error(toApiFailure(error).message);
  }
}

/* ------------------------------ Reordenação -------------------------------- */

const draggingFieldId = ref<string | null>(null);

async function moveField(field: FormFieldDto, offset: number): Promise<void> {
  const ordered = [...(service.value?.fields ?? [])];
  const index = ordered.findIndex((item) => item.id === field.id);
  const target = index + offset;
  if (index === -1 || target < 0 || target >= ordered.length) return;

  ordered.splice(target, 0, ordered.splice(index, 1)[0]);
  await persistOrder(ordered.map((item) => item.id));
}

async function onDropField(event: DragEvent, targetField: FormFieldDto): Promise<void> {
  event.preventDefault();
  const sourceId = draggingFieldId.value;
  draggingFieldId.value = null;
  if (!sourceId || sourceId === targetField.id) return;

  const ordered = [...(service.value?.fields ?? [])];
  const from = ordered.findIndex((item) => item.id === sourceId);
  const to = ordered.findIndex((item) => item.id === targetField.id);
  if (from === -1 || to === -1) return;

  ordered.splice(to, 0, ordered.splice(from, 1)[0]);
  await persistOrder(ordered.map((item) => item.id));
}

async function persistOrder(fieldIds: string[]): Promise<void> {
  try {
    await api.patch(`/services/${id}/fields/reorder`, { fieldIds });
    await load();
  } catch (error) {
    toast.error(toApiFailure(error).message);
    await load();
  }
}

/* ------------------------------- Conteúdo ---------------------------------- */

const content = reactive({
  name: '',
  shortDescription: '',
  description: '',
  benefitsText: '',
  metaTitle: '',
  metaDescription: '',
  featured: false,
  order: 0,
});
const savingContent = ref(false);
const contentErrors = ref<Record<string, string[]>>({});

watch(service, (value) => {
  if (!value) return;
  Object.assign(content, {
    name: value.name,
    shortDescription: value.shortDescription,
    description: value.description,
    benefitsText: value.benefits.join('\n'),
    metaTitle: value.metaTitle ?? '',
    metaDescription: value.metaDescription ?? '',
    featured: value.featured,
    order: value.order,
  });
});

async function saveContent(): Promise<void> {
  savingContent.value = true;
  contentErrors.value = {};
  try {
    await api.patch(`/services/${id}`, {
      name: content.name,
      shortDescription: content.shortDescription,
      description: content.description,
      benefits: content.benefitsText.split('\n').map((line) => line.trim()).filter(Boolean),
      metaTitle: content.metaTitle.trim() || null,
      metaDescription: content.metaDescription.trim() || null,
      featured: content.featured,
      order: Number(content.order),
    });
    toast.success('Conteúdo do serviço actualizado.');
    await load();
  } catch (error) {
    const failure = toApiFailure(error);
    contentErrors.value = failure.details;
    if (!Object.keys(failure.details).length) toast.error(failure.message);
  } finally {
    savingContent.value = false;
  }
}

async function togglePublished(): Promise<void> {
  if (!service.value) return;
  try {
    await api.patch(`/services/${id}`, { active: !service.value.active });
    toast.success(service.value.active ? 'Serviço despublicado.' : 'Serviço publicado no site.');
    await load();
  } catch (error) {
    toast.error(toApiFailure(error).message);
  }
}

const activeFieldCount = computed(() => service.value?.fields.filter((field) => field.active).length ?? 0);
</script>

<template>
  <div v-if="loading" class="py-24 text-center text-[13px] text-graphite-400">A carregar serviço…</div>

  <div v-else-if="service">
    <!-- Cabeçalho -->
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <NuxtLink to="/servicos" class="inline-flex items-center gap-1.5 text-[12px] text-graphite-500 hover:text-graphite-900">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Voltar aos serviços
        </NuxtLink>

        <div class="mt-2 flex flex-wrap items-center gap-3">
          <h1 class="text-xl font-semibold tracking-tight text-graphite-950">{{ service.name }}</h1>
          <span class="badge" :class="service.active ? 'bg-emerald-100 text-emerald-700' : 'bg-graphite-100 text-graphite-500'">
            {{ service.active ? 'Publicado' : 'Rascunho' }}
          </span>
        </div>

        <a
          :href="`${config.public.siteUrl}/servicos/${service.slug}`"
          target="_blank"
          rel="noopener"
          class="mt-1 inline-block font-mono text-[12px] text-graphite-500 hover:text-graphite-900 hover:underline"
        >
          {{ config.public.siteUrl }}/servicos/{{ service.slug }} ↗
        </a>
      </div>

      <button v-if="auth.can('GESTOR')" type="button" class="btn-primary" @click="togglePublished">
        {{ service.active ? 'Despublicar' : 'Publicar no site' }}
      </button>
    </div>

    <!-- Aviso: sem campos não há publicação possível -->
    <p
      v-if="activeFieldCount === 0"
      class="mt-5 rounded-sm border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-[13px] text-amber-800"
    >
      Este serviço ainda não tem campos de formulário activos. Adicione pelo menos um campo antes de o
      publicar: sem formulário, os clientes não conseguiriam submeter o pedido.
    </p>

    <!-- Separadores -->
    <div class="mt-6 flex gap-1 border-b border-graphite-200" role="tablist">
      <button
        v-for="item in [
          { key: 'formulario', label: `Formulário (${service.fields.length})` },
          { key: 'conteudo', label: 'Conteúdo e SEO' },
        ]"
        :key="item.key"
        type="button"
        role="tab"
        :aria-selected="tab === item.key"
        class="-mb-px border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors"
        :class="tab === item.key ? 'border-graphite-950 text-graphite-950' : 'border-transparent text-graphite-500 hover:text-graphite-900'"
        @click="tab = item.key as typeof tab"
      >
        {{ item.label }}
      </button>
    </div>

    <!-- Construtor de formulário -->
    <section v-if="tab === 'formulario'" class="mt-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-[13px] text-graphite-500">
          Os campos definidos aqui são os que o cliente preenche no site. Arraste para reordenar.
        </p>
        <button v-if="auth.can('GESTOR')" type="button" class="btn-primary" @click="openNewField">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Adicionar campo
        </button>
      </div>

      <ul class="mt-4 space-y-2">
        <li
          v-for="(field, index) in service.fields"
          :key="field.id"
          draggable="true"
          class="panel flex items-start gap-3 p-4 transition-shadow hover:shadow-[var(--shadow-panel)]"
          :class="[draggingFieldId === field.id && 'opacity-40', !field.active && 'bg-graphite-50']"
          @dragstart="draggingFieldId = field.id"
          @dragend="draggingFieldId = null"
          @dragover.prevent
          @drop="onDropField($event, field)"
        >
          <span class="mt-0.5 cursor-grab text-graphite-300" aria-hidden="true">
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7 4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm6 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM7 9a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm6 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM7 14a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm6 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
            </svg>
          </span>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-mono text-[11px] text-graphite-300">{{ String(index + 1).padStart(2, '0') }}</span>
              <span class="text-[14px] font-medium text-graphite-950">{{ field.label }}</span>
              <span v-if="field.required" class="badge bg-graphite-950 text-white">obrigatório</span>
              <span v-if="!field.active" class="badge bg-amber-100 text-amber-700">desactivado</span>
            </div>

            <div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-graphite-400">
              <span class="font-mono">{{ field.key }}</span>
              <span>·</span>
              <span>{{ FIELD_TYPE_LABELS[field.type] }}</span>
              <span>·</span>
              <span>{{ field.width === 1 ? 'meia coluna' : 'coluna inteira' }}</span>
              <template v-if="field.options.length">
                <span>·</span><span>{{ field.options.length }} opção(ões)</span>
              </template>
              <template v-if="Object.keys(field.validation).length">
                <span>·</span><span>{{ Object.keys(field.validation).length }} regra(s)</span>
              </template>
            </div>

            <p v-if="field.helpText" class="mt-1 text-[12px] italic text-graphite-400">{{ field.helpText }}</p>
          </div>

          <div v-if="auth.can('GESTOR')" class="flex shrink-0 items-center gap-1">
            <button type="button" class="p-1.5 text-graphite-300 hover:text-graphite-900 disabled:opacity-30" :disabled="index === 0" aria-label="Mover para cima" @click="moveField(field, -1)">
              <svg class="h-3.5 w-3.5" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M6 3 9.5 7h-7L6 3Z" /></svg>
            </button>
            <button type="button" class="p-1.5 text-graphite-300 hover:text-graphite-900 disabled:opacity-30" :disabled="index === service.fields.length - 1" aria-label="Mover para baixo" @click="moveField(field, 1)">
              <svg class="h-3.5 w-3.5" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M6 9 2.5 5h7L6 9Z" /></svg>
            </button>
            <button type="button" class="btn-secondary btn-xs" @click="openEditField(field)">Editar</button>
            <button type="button" class="btn-secondary btn-xs" @click="duplicateField(field)">Duplicar</button>
            <button type="button" class="btn-danger btn-xs" @click="removeField(field)">Remover</button>
          </div>
        </li>
      </ul>

      <div v-if="!service.fields.length" class="panel mt-4 p-14 text-center">
        <p class="text-[14px] font-medium text-graphite-700">Formulário vazio</p>
        <p class="mx-auto mt-1 max-w-md text-[13px] text-graphite-400">
          Adicione os campos que pretende recolher dos clientes. Não é necessária qualquer alteração de
          código: assim que publicar, o formulário aparece no site.
        </p>
        <button v-if="auth.can('GESTOR')" type="button" class="btn-primary mt-6" @click="openNewField">
          Adicionar o primeiro campo
        </button>
      </div>
    </section>

    <!-- Conteúdo e SEO -->
    <section v-else class="mt-6">
      <form class="panel max-w-3xl space-y-4 p-6" novalidate @submit.prevent="saveContent">
        <div>
          <label for="c-name" class="label">Nome do serviço</label>
          <input id="c-name" v-model="content.name" type="text" class="input" :class="contentErrors.name && 'input-error'" />
          <p v-for="m in contentErrors.name" :key="m" class="field-error">{{ m }}</p>
        </div>

        <div>
          <label for="c-short" class="label">Descrição breve</label>
          <textarea id="c-short" v-model="content.shortDescription" rows="2" class="input resize-y" :class="contentErrors.shortDescription && 'input-error'" />
          <p class="mt-1 text-[11px] text-graphite-400">Apresentada no cartão do serviço e nas listagens.</p>
          <p v-for="m in contentErrors.shortDescription" :key="m" class="field-error">{{ m }}</p>
        </div>

        <div>
          <label for="c-desc" class="label">Descrição completa</label>
          <textarea id="c-desc" v-model="content.description" rows="8" class="input resize-y" />
          <p class="mt-1 text-[11px] text-graphite-400">Separe parágrafos com uma linha em branco.</p>
        </div>

        <div>
          <label for="c-benefits" class="label">Benefícios</label>
          <textarea id="c-benefits" v-model="content.benefitsText" rows="5" class="input resize-y" placeholder="Um benefício por linha" />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="c-mt" class="label">Título SEO</label>
            <input id="c-mt" v-model="content.metaTitle" type="text" maxlength="70" class="input" />
            <p class="mt-1 text-[11px] text-graphite-400">{{ content.metaTitle.length }}/70 caracteres</p>
          </div>
          <div>
            <label for="c-order" class="label">Ordem de apresentação</label>
            <input id="c-order" v-model.number="content.order" type="number" min="0" class="input" />
          </div>
        </div>

        <div>
          <label for="c-md" class="label">Meta description</label>
          <textarea id="c-md" v-model="content.metaDescription" rows="2" maxlength="180" class="input resize-y" />
          <p class="mt-1 text-[11px] text-graphite-400">{{ content.metaDescription.length }}/180 caracteres</p>
        </div>

        <label class="flex cursor-pointer items-center gap-2 text-[13px] text-graphite-700">
          <input v-model="content.featured" type="checkbox" class="h-3.5 w-3.5 accent-graphite-950" />
          Destacar este serviço na página inicial
        </label>

        <div class="flex justify-end border-t border-graphite-100 pt-4">
          <button type="submit" class="btn-primary" :disabled="savingContent || !auth.can('GESTOR')">
            {{ savingContent ? 'A guardar…' : 'Guardar alterações' }}
          </button>
        </div>
      </form>
    </section>

    <!-- Editor de campo -->
    <ModalDialog v-model="showEditor" :title="editing ? `Editar campo: ${editing.label}` : 'Novo campo de formulário'" wide>
      <FieldEditor
        :field="editing"
        :used-keys="usedKeys"
        :saving="savingField"
        :errors="fieldErrors"
        @submit="saveField"
        @cancel="showEditor = false"
      />
    </ModalDialog>
  </div>
</template>
