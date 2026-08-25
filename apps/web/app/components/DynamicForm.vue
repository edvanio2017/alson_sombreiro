<script setup lang="ts">
import {
  buildInitialValues,
  validateFormData,
  type FormFieldDto,
  type ServiceDetailDto,
} from '@alson/shared';

/**
 * Formulário de pedido de um serviço.
 *
 * Todo o formulário é construído a partir de `service.fields`, devolvido pela
 * API: o mesmo `validateFormData` que corre aqui corre depois na API, pelo
 * que as regras definidas no backoffice são aplicadas exactamente uma vez,
 * num único sítio, e valem para os dois lados.
 */
const props = defineProps<{ service: ServiceDetailDto }>();

const api = useApiFetch();

const fields = computed<FormFieldDto[]>(() =>
  [...props.service.fields].filter((field) => field.active).sort((a, b) => a.order - b.order),
);

const values = reactive<Record<string, unknown>>(buildInitialValues(fields.value));
const requester = reactive({ name: '', email: '', phone: '' });
const consent = ref(false);

/** Campo-armadilha: invisível para pessoas, irresistível para bots. */
const honeypot = ref('');
/** Marca temporal usada para detectar submissões instantâneas. */
const renderedAt = ref(Date.now());

const errors = ref<Record<string, string[]>>({});
const submitting = ref(false);
const submitError = ref('');
const result = ref<{ reference: string; submittedAt: string } | null>(null);
const formElement = ref<HTMLFormElement | null>(null);

// Se o serviço mudar (navegação entre páginas), o formulário recomeça limpo.
watch(
  () => props.service.id,
  () => {
    Object.assign(values, buildInitialValues(fields.value));
    errors.value = {};
    result.value = null;
    renderedAt.value = Date.now();
  },
);

function fieldErrors(key: string): string[] {
  return errors.value[key] ?? [];
}

/** Valida os dados de contacto, que existem em todos os formulários. */
function validateRequester(): Record<string, string[]> {
  const found: Record<string, string[]> = {};
  if (requester.name.trim().length < 3) {
    found['requester.name'] = ['Indique o seu nome completo.'];
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(requester.email.trim())) {
    found['requester.email'] = ['Introduza um endereço de e-mail válido.'];
  }
  if (requester.phone.trim() && !/^(\+?244)?[\s-]?9\d{2}[\s-]?\d{3}[\s-]?\d{3}$/.test(requester.phone.trim())) {
    found['requester.phone'] = ['Introduza um telefone válido (ex.: +244 923 075 864).'];
  }
  if (!consent.value) {
    found.consent = ['É necessário autorizar o tratamento dos seus dados.'];
  }
  return found;
}

/** Leva o foco ao primeiro campo com erro, evitando erros invisíveis (WCAG 3.3.1). */
async function focusFirstError(): Promise<void> {
  await nextTick();
  const firstKey = Object.keys(errors.value)[0];
  if (!firstKey || !formElement.value) return;

  const target =
    formElement.value.querySelector<HTMLElement>(`[id="campo-${CSS.escape(firstKey)}"]`) ??
    formElement.value.querySelector<HTMLElement>(`[name="${CSS.escape(firstKey)}"]`) ??
    formElement.value.querySelector<HTMLElement>('[aria-invalid="true"]');

  target?.focus();
  target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

/**
 * Constrói o corpo do pedido. Com anexos usa-se `multipart/form-data`, com os
 * ficheiros em campos com o nome da chave do campo; sem anexos, JSON simples.
 */
function buildPayload(validData: Record<string, unknown>): FormData | Record<string, unknown> {
  const fileFields = fields.value.filter((field) => field.type === 'FILE');
  const attachments = fileFields.flatMap((field) => {
    const list = values[field.key];
    return Array.isArray(list) ? list.map((file) => ({ key: field.key, file: file as File })) : [];
  });

  const data: Record<string, unknown> = { ...validData };
  // Os ficheiros seguem fora do JSON; ficam apenas os restantes valores.
  for (const field of fileFields) delete data[field.key];

  const body = {
    requester: {
      name: requester.name.trim(),
      email: requester.email.trim(),
      phone: requester.phone.trim() || null,
    },
    data,
    consent: true,
    website: honeypot.value,
    renderedAt: renderedAt.value,
  };

  if (attachments.length === 0) return body;

  const formData = new FormData();
  formData.append('payload', JSON.stringify(body));
  for (const attachment of attachments) {
    formData.append(attachment.key, attachment.file, attachment.file.name);
  }
  return formData;
}

async function submit(): Promise<void> {
  submitError.value = '';

  // 1) Validação local, com o mesmo schema que a API vai usar.
  const validation = validateFormData(fields.value, { ...values });
  errors.value = { ...validation.errors, ...validateRequester() };

  if (Object.keys(errors.value).length > 0) {
    await focusFirstError();
    return;
  }

  submitting.value = true;
  try {
    // 2) A API repete a validação de forma autoritativa.
    const response = await api<{ reference: string; submittedAt: string }>(
      `/public/requests/${props.service.slug}`,
      { method: 'POST', body: buildPayload(validation.data) },
    );

    result.value = response;
    await nextTick();
    document.getElementById('pedido-confirmado')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (error) {
    const failure = toApiFailure(error);
    errors.value = failure.details;
    submitError.value = Object.keys(failure.details).length > 0 ? '' : failure.message;
    if (Object.keys(failure.details).length > 0) await focusFirstError();
  } finally {
    submitting.value = false;
  }
}

function submitAnother(): void {
  result.value = null;
  Object.assign(values, buildInitialValues(fields.value));
  requester.name = '';
  requester.email = '';
  requester.phone = '';
  consent.value = false;
  renderedAt.value = Date.now();
}
</script>

<template>
  <!-- Confirmação -->
  <div v-if="result" id="pedido-confirmado" class="surface-card p-8 text-center sm:p-12">
    <div
      class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-graphite-950 text-white"
      aria-hidden="true"
    >
      <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
    </div>

    <h3 class="section-title mt-6">Pedido submetido com sucesso</h3>
    <p class="prose-institucional mx-auto mt-3 max-w-lg">
      Enviámos a confirmação para <strong class="text-graphite-900">{{ requester.email }}</strong
      >. Guarde o número de referência, que lhe será pedido em qualquer contacto sobre este processo.
    </p>

    <div class="mx-auto mt-8 max-w-xs border border-dashed border-graphite-300 bg-graphite-50 p-5">
      <p class="eyebrow">Número de referência</p>
      <p class="mt-2 font-mono text-2xl font-semibold tracking-wider text-graphite-950">
        {{ result.reference }}
      </p>
    </div>

    <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
      <NuxtLink :to="`/acompanhar?referencia=${result.reference}`" class="btn-primary">
        Acompanhar o pedido
      </NuxtLink>
      <button type="button" class="btn-outline" @click="submitAnother">Submeter outro pedido</button>
    </div>
  </div>

  <!-- Formulário -->
  <form v-else ref="formElement" novalidate class="surface-card p-6 sm:p-10" @submit.prevent="submit">
    <div class="mb-8">
      <p class="eyebrow">Pedido de serviço</p>
      <h3 class="section-title mt-2">{{ service.name }}</h3>
      <p class="prose-institucional mt-3">
        Preencha o formulário abaixo. Os campos marcados com
        <span class="text-red-600" aria-hidden="true">*</span> são obrigatórios. Receberá um número de
        referência assim que o pedido for registado.
      </p>
    </div>

    <!-- Dados de contacto -->
    <fieldset class="mb-10">
      <legend class="mb-5 flex w-full items-center gap-4">
        <span class="eyebrow whitespace-nowrap">01 · Os seus dados</span>
        <span class="silver-rule h-px flex-1" aria-hidden="true" />
      </legend>

      <div class="grid gap-5 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label for="requester-name" class="field-label">
            Nome completo <span class="text-red-600" aria-hidden="true">*</span>
          </label>
          <input
            id="requester-name"
            v-model="requester.name"
            name="requester.name"
            type="text"
            autocomplete="name"
            :aria-invalid="fieldErrors('requester.name').length > 0"
            :class="['field-control', fieldErrors('requester.name').length && 'field-control-error']"
          />
          <p v-for="m in fieldErrors('requester.name')" :key="m" class="field-error" role="alert">{{ m }}</p>
        </div>

        <div>
          <label for="requester-email" class="field-label">
            E-mail <span class="text-red-600" aria-hidden="true">*</span>
          </label>
          <input
            id="requester-email"
            v-model="requester.email"
            name="requester.email"
            type="email"
            autocomplete="email"
            :aria-invalid="fieldErrors('requester.email').length > 0"
            :class="['field-control', fieldErrors('requester.email').length && 'field-control-error']"
          />
          <p class="field-help">Para onde enviamos a confirmação e as actualizações do processo.</p>
          <p v-for="m in fieldErrors('requester.email')" :key="m" class="field-error" role="alert">{{ m }}</p>
        </div>

        <div>
          <label for="requester-phone" class="field-label">Telefone</label>
          <input
            id="requester-phone"
            v-model="requester.phone"
            name="requester.phone"
            type="tel"
            autocomplete="tel"
            placeholder="+244 923 075 864"
            :aria-invalid="fieldErrors('requester.phone').length > 0"
            :class="['field-control', fieldErrors('requester.phone').length && 'field-control-error']"
          />
          <p v-for="m in fieldErrors('requester.phone')" :key="m" class="field-error" role="alert">{{ m }}</p>
        </div>
      </div>
    </fieldset>

    <!-- Campos dinâmicos, definidos no backoffice -->
    <fieldset class="mb-10">
      <legend class="mb-5 flex w-full items-center gap-4">
        <span class="eyebrow whitespace-nowrap">02 · Detalhes do pedido</span>
        <span class="silver-rule h-px flex-1" aria-hidden="true" />
      </legend>

      <div class="grid gap-5 sm:grid-cols-2">
        <DynamicField
          v-for="field in fields"
          :key="field.id"
          :field="field"
          :model-value="values[field.key]"
          :errors="fieldErrors(field.key)"
          @update:model-value="values[field.key] = $event"
        />
      </div>
    </fieldset>

    <!-- Campo-armadilha: escondido de forma acessível, nunca lido nem focável. -->
    <div aria-hidden="true" class="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label for="website">Não preencher este campo</label>
      <input id="website" v-model="honeypot" type="text" name="website" tabindex="-1" autocomplete="off" />
    </div>

    <!-- Consentimento -->
    <div class="mb-8">
      <label
        for="consent"
        class="flex cursor-pointer items-start gap-3 border p-4"
        :class="fieldErrors('consent').length ? 'border-red-400' : 'border-graphite-200'"
      >
        <input
          id="consent"
          v-model="consent"
          name="consent"
          type="checkbox"
          class="mt-0.5 h-4 w-4 shrink-0 accent-graphite-950"
          :aria-invalid="fieldErrors('consent').length > 0"
        />
        <span class="text-[14px] leading-relaxed text-graphite-600">
          Autorizo a {{ COMPANY.legalName }} a tratar os dados submetidos para efeitos de análise e
          resposta a este pedido, nos termos da
          <NuxtLink to="/privacidade" class="text-graphite-950 underline underline-offset-2">
            Política de Privacidade </NuxtLink
          >. <span class="text-red-600" aria-hidden="true">*</span>
        </span>
      </label>
      <p v-for="m in fieldErrors('consent')" :key="m" class="field-error" role="alert">{{ m }}</p>
    </div>

    <div
      v-if="submitError"
      class="mb-6 border-l-2 border-red-500 bg-red-50 px-4 py-3 text-[14px] text-red-700"
      role="alert"
    >
      {{ submitError }}
    </div>

    <div
      v-else-if="Object.keys(errors).length"
      class="mb-6 border-l-2 border-red-500 bg-red-50 px-4 py-3 text-[14px] text-red-700"
      role="alert"
    >
      Existem {{ Object.keys(errors).length }} campo(s) por corrigir. Reveja as indicações a vermelho.
    </div>

    <div class="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
      <button type="submit" class="btn-primary w-full sm:w-auto" :disabled="submitting">
        <svg
          v-if="submitting"
          class="h-4 w-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
          <path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4Z" />
        </svg>
        {{ submitting ? 'A submeter…' : 'Submeter pedido' }}
      </button>
      <p class="text-[13px] text-graphite-400">
        Os seus dados são tratados de forma confidencial.
      </p>
    </div>
  </form>
</template>
