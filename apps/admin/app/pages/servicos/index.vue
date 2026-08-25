<script setup lang="ts">
import { formatDate, type PaginatedResult, type ServiceSummaryDto } from '@alson/shared';

useHead({ title: 'Serviços' });

type ServiceRow = ServiceSummaryDto & { fieldCount: number };

const api = useApi();
const auth = useAuth();
const toast = useToast();
const config = useRuntimeConfig();

const items = ref<ServiceRow[]>([]);
const loading = ref(true);
const search = ref('');
const showCreate = ref(false);

const draft = reactive({ name: '', shortDescription: '' });
const creating = ref(false);
const createErrors = ref<Record<string, string[]>>({});

async function load(): Promise<void> {
  loading.value = true;
  try {
    const result = await api.get<PaginatedResult<ServiceRow>>('/services', {
      perPage: 100,
      ...(search.value ? { search: search.value } : {}),
    });
    items.value = result.items;
  } finally {
    loading.value = false;
  }
}

async function create(): Promise<void> {
  createErrors.value = {};
  creating.value = true;
  try {
    const service = await api.post<{ id: string }>('/services', {
      name: draft.name,
      shortDescription: draft.shortDescription,
    });
    toast.success('Serviço criado. Defina agora os campos do formulário.');
    showCreate.value = false;
    draft.name = '';
    draft.shortDescription = '';
    // Segue directamente para o construtor: um serviço sem campos não publica.
    await navigateTo(`/servicos/${service.id}`);
  } catch (error) {
    const failure = toApiFailure(error);
    createErrors.value = failure.details;
    if (!Object.keys(failure.details).length) toast.error(failure.message);
  } finally {
    creating.value = false;
  }
}

async function togglePublished(service: ServiceRow): Promise<void> {
  try {
    await api.patch(`/services/${service.id}`, { active: !service.active });
    toast.success(service.active ? `"${service.name}" despublicado.` : `"${service.name}" publicado no site.`);
    await load();
  } catch (error) {
    toast.error(toApiFailure(error).message);
  }
}

async function remove(service: ServiceRow): Promise<void> {
  if (!confirm(`Remover o serviço "${service.name}"? Só é possível se não tiver pedidos associados.`)) return;
  try {
    await api.delete(`/services/${service.id}`);
    toast.success('Serviço removido.');
    await load();
  } catch (error) {
    toast.error(toApiFailure(error).message);
  }
}

let timer: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(timer);
  timer = setTimeout(load, 300);
});

onMounted(load);
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold tracking-tight text-graphite-950">Serviços</h1>
        <p class="mt-1 text-[13px] text-graphite-500">
          Cada serviço tem o seu formulário próprio. Publicar um serviço torna-o visível no site com o
          formulário definido aqui.
        </p>
      </div>

      <button v-if="auth.can('GESTOR')" type="button" class="btn-primary" @click="showCreate = true">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Novo serviço
      </button>
    </div>

    <div class="mt-6 max-w-sm">
      <label for="s-search" class="sr-only">Pesquisar serviços</label>
      <input id="s-search" v-model="search" type="search" class="input" placeholder="Pesquisar serviços…" />
    </div>

    <section class="panel mt-4 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[820px]">
          <thead>
            <tr>
              <th class="table-head">Serviço</th>
              <th class="table-head">Endereço</th>
              <th class="table-head">Campos</th>
              <th class="table-head">Estado</th>
              <th class="table-head"><span class="sr-only">Acções</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="px-4 py-12 text-center text-[13px] text-graphite-400">A carregar…</td>
            </tr>

            <tr v-for="service in items" v-else :key="service.id" class="hover:bg-graphite-50">
              <td class="table-cell">
                <div class="flex items-center gap-2">
                  <NuxtLink :to="`/servicos/${service.id}`" class="font-medium text-graphite-950 hover:underline">
                    {{ service.name }}
                  </NuxtLink>
                  <span v-if="service.featured" class="badge bg-graphite-100 text-graphite-600">destaque</span>
                </div>
                <p class="mt-0.5 max-w-md truncate text-[12px] text-graphite-400">
                  {{ service.shortDescription }}
                </p>
              </td>

              <td class="table-cell">
                <a
                  :href="`${config.public.siteUrl}/servicos/${service.slug}`"
                  target="_blank"
                  rel="noopener"
                  class="font-mono text-[12px] text-graphite-500 hover:text-graphite-900 hover:underline"
                >
                  /servicos/{{ service.slug }}
                </a>
              </td>

              <td class="table-cell">
                <span :class="service.fieldCount === 0 ? 'text-amber-600' : ''">
                  {{ service.fieldCount }} campo(s)
                </span>
              </td>

              <td class="table-cell">
                <span class="badge" :class="service.active ? 'bg-emerald-100 text-emerald-700' : 'bg-graphite-100 text-graphite-500'">
                  {{ service.active ? 'Publicado' : 'Rascunho' }}
                </span>
              </td>

              <td class="table-cell">
                <div class="flex justify-end gap-1.5">
                  <NuxtLink :to="`/servicos/${service.id}`" class="btn-secondary btn-xs">Formulário</NuxtLink>
                  <button
                    v-if="auth.can('GESTOR')"
                    type="button"
                    class="btn-secondary btn-xs"
                    @click="togglePublished(service)"
                  >
                    {{ service.active ? 'Despublicar' : 'Publicar' }}
                  </button>
                  <button v-if="auth.can('ADMIN')" type="button" class="btn-danger btn-xs" @click="remove(service)">
                    Remover
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="!loading && !items.length">
              <td colspan="5" class="px-4 py-16 text-center">
                <p class="text-[14px] font-medium text-graphite-700">Nenhum serviço encontrado</p>
                <p class="mt-1 text-[13px] text-graphite-400">Crie o primeiro serviço para começar.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Criação -->
    <ModalDialog v-model="showCreate" title="Novo serviço">
      <form class="space-y-4" novalidate @submit.prevent="create">
        <div>
          <label for="n-name" class="label">Nome do serviço</label>
          <input
            id="n-name"
            v-model="draft.name"
            type="text"
            class="input"
            :class="createErrors.name && 'input-error'"
            placeholder="Ex.: Vistoria Técnica de Imóveis"
          />
          <p v-for="m in createErrors.name" :key="m" class="field-error">{{ m }}</p>
          <p class="mt-1 text-[11px] text-graphite-400">
            O endereço no site é gerado a partir do nome.
          </p>
        </div>

        <div>
          <label for="n-desc" class="label">Descrição breve</label>
          <textarea
            id="n-desc"
            v-model="draft.shortDescription"
            rows="3"
            class="input resize-y"
            :class="createErrors.shortDescription && 'input-error'"
            placeholder="Uma ou duas frases apresentadas no cartão do serviço."
          />
          <p v-for="m in createErrors.shortDescription" :key="m" class="field-error">{{ m }}</p>
        </div>

        <p class="rounded-sm bg-graphite-50 px-3 py-2.5 text-[12px] leading-relaxed text-graphite-500">
          O serviço é criado como rascunho. Depois de definir os campos do formulário poderá publicá-lo
          no site.
        </p>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="btn-secondary" @click="showCreate = false">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="creating">
            {{ creating ? 'A criar…' : 'Criar e definir formulário' }}
          </button>
        </div>
      </form>
    </ModalDialog>
  </div>
</template>
