<script setup lang="ts">
import { formatDate, REFERENCE_PATTERN } from '@alson/shared';

interface PublicRequestView {
  reference: string;
  serviceName: string;
  status: { name: string; color: string; isFinal: boolean };
  submittedAt: string;
  updatedAt: string;
  timeline: Array<{ description: string; date: string }>;
  attachmentCount: number;
}

const route = useRoute();
const api = useApiFetch();

// A referência pode chegar por query string, vinda do e-mail de confirmação.
const reference = ref(String(route.query.referencia ?? '').toUpperCase());
const email = ref('');
const loading = ref(false);
const errors = ref<Record<string, string[]>>({});
const notFound = ref(false);
const result = ref<PublicRequestView | null>(null);

useSeo({
  title: 'Acompanhar pedido',
  description:
    'Consulte o estado do seu pedido à Alson Sombreiro Consultadoria com o número de referência e o e-mail usado na submissão.',
  path: '/acompanhar',
  // Página de consulta pessoal, que não faz sentido indexar.
  noindex: true,
});

async function consultar(): Promise<void> {
  errors.value = {};
  notFound.value = false;
  result.value = null;

  const found: Record<string, string[]> = {};
  if (!REFERENCE_PATTERN.test(reference.value.trim().toUpperCase())) {
    found.reference = ['Introduza a referência no formato AS-AAAA-NNNNNN.'];
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) {
    found.email = ['Introduza o e-mail usado na submissão.'];
  }
  if (Object.keys(found).length > 0) {
    errors.value = found;
    return;
  }

  loading.value = true;
  try {
    result.value = await api<PublicRequestView>('/public/requests/track', {
      params: { reference: reference.value.trim().toUpperCase(), email: email.value.trim() },
    });
  } catch (error) {
    const failure = toApiFailure(error);
    if (failure.status === 404) notFound.value = true;
    else errors.value = { _form: [failure.message] };
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <section class="border-b border-graphite-200 bg-white py-16 lg:py-20">
      <div class="container-page max-w-3xl">
        <p class="eyebrow">Consulta de processo</p>
        <h1 class="display-title mt-4">Acompanhar o seu pedido</h1>
        <p class="prose-institucional mt-5">
          Introduza o número de referência que recebeu por e-mail e o endereço usado na submissão. Por
          segurança, só mostramos o estado do pedido quando os dois coincidem.
        </p>
      </div>
    </section>

    <section class="py-14 lg:py-20">
      <div class="container-page max-w-3xl">
        <form class="surface-card p-6 sm:p-9" novalidate @submit.prevent="consultar">
          <div class="grid gap-5 sm:grid-cols-2">
            <div>
              <label for="ref" class="field-label">Número de referência</label>
              <input
                id="ref"
                v-model="reference"
                type="text"
                placeholder="AS-2026-000001"
                autocomplete="off"
                spellcheck="false"
                :aria-invalid="!!errors.reference"
                :class="['field-control font-mono uppercase', errors.reference && 'field-control-error']"
              />
              <p v-for="m in errors.reference" :key="m" class="field-error" role="alert">{{ m }}</p>
            </div>

            <div>
              <label for="email" class="field-label">E-mail usado na submissão</label>
              <input
                id="email"
                v-model="email"
                type="email"
                autocomplete="email"
                :aria-invalid="!!errors.email"
                :class="['field-control', errors.email && 'field-control-error']"
              />
              <p v-for="m in errors.email" :key="m" class="field-error" role="alert">{{ m }}</p>
            </div>
          </div>

          <p
            v-for="m in errors._form"
            :key="m"
            class="mt-5 border-l-2 border-red-500 bg-red-50 px-4 py-3 text-[14px] text-red-700"
            role="alert"
          >
            {{ m }}
          </p>

          <button type="submit" class="btn-primary mt-6 w-full sm:w-auto" :disabled="loading">
            {{ loading ? 'A consultar…' : 'Consultar estado' }}
          </button>
        </form>

        <!-- Sem correspondência -->
        <div v-if="notFound" class="surface-card mt-6 p-8 text-center" role="alert">
          <p class="text-[15px] font-medium text-graphite-950">Não encontrámos nenhum pedido</p>
          <p class="prose-institucional mx-auto mt-2 max-w-md">
            Verifique se a referência e o e-mail estão correctos. Se o problema persistir, contacte-nos
            através de
            <a :href="`mailto:${COMPANY.email}`" class="text-graphite-950 underline">{{ COMPANY.email }}</a
            >.
          </p>
        </div>

        <!-- Resultado -->
        <article v-if="result" class="surface-card mt-6 p-7 sm:p-10">
          <div class="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p class="eyebrow">Referência</p>
              <p class="mt-1.5 font-mono text-xl font-semibold tracking-wider text-graphite-950">
                {{ result.reference }}
              </p>
              <p class="mt-2 text-[15px] text-graphite-600">{{ result.serviceName }}</p>
            </div>

            <span
              class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-medium text-white"
              :style="{ backgroundColor: result.status.color }"
            >
              {{ result.status.name }}
            </span>
          </div>

          <dl class="mt-8 grid gap-6 border-t border-graphite-200 pt-6 sm:grid-cols-3">
            <div>
              <dt class="eyebrow">Submetido em</dt>
              <dd class="mt-1.5 text-[14px] text-graphite-800">{{ formatDate(result.submittedAt, true) }}</dd>
            </div>
            <div>
              <dt class="eyebrow">Última actualização</dt>
              <dd class="mt-1.5 text-[14px] text-graphite-800">{{ formatDate(result.updatedAt, true) }}</dd>
            </div>
            <div>
              <dt class="eyebrow">Documentos anexados</dt>
              <dd class="mt-1.5 text-[14px] text-graphite-800">{{ result.attachmentCount }}</dd>
            </div>
          </dl>

          <div class="mt-9">
            <p class="eyebrow">Histórico do processo</p>
            <ol class="mt-5 space-y-0">
              <li
                v-for="(entry, index) in result.timeline"
                :key="index"
                class="relative flex gap-5 pb-7 last:pb-0"
              >
                <span
                  v-if="index < result.timeline.length - 1"
                  class="absolute left-[5px] top-3 h-full w-px bg-graphite-200"
                  aria-hidden="true"
                />
                <span
                  class="relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                  :class="index === 0 ? 'bg-graphite-950' : 'bg-graphite-300'"
                  aria-hidden="true"
                />
                <div>
                  <p class="text-[14px] text-graphite-800">{{ entry.description }}</p>
                  <p class="mt-1 text-[12px] text-graphite-400">{{ formatDate(entry.date, true) }}</p>
                </div>
              </li>
            </ol>
          </div>

          <div class="mt-9 border-t border-graphite-200 pt-6">
            <p class="text-[13px] leading-relaxed text-graphite-500">
              Precisa de esclarecimentos sobre este processo? Contacte-nos indicando a referência
              <strong class="font-mono text-graphite-800">{{ result.reference }}</strong> através de
              <a :href="`mailto:${COMPANY.email}`" class="text-graphite-950 underline">{{ COMPANY.email }}</a>
              ou {{ COMPANY.phones[0] }}.
            </p>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
