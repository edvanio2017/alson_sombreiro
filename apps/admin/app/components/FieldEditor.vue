<script setup lang="ts">
import {
  CHOICE_FIELD_TYPES,
  FIELD_TYPES,
  FIELD_TYPE_LABELS,
  toFieldKey,
  type FieldType,
  type FormFieldDto,
} from '@alson/shared';

/**
 * Editor da definição de um campo.
 *
 * As opções apresentadas adaptam-se ao tipo escolhido: só faz sentido pedir
 * extensões aceites num campo de ficheiro, ou datas-limite num campo de data.
 * É este ecrã que substitui a necessidade de escrever código para cada
 * formulário novo.
 */
const props = defineProps<{
  /** `null` cria um campo novo. */
  field: FormFieldDto | null;
  /** Chaves já utilizadas no serviço, para prevenir colisões. */
  usedKeys: string[];
  saving: boolean;
  errors: Record<string, string[]>;
}>();

const emit = defineEmits<{ submit: [Record<string, unknown>]; cancel: [] }>();

const form = reactive({
  key: '',
  label: '',
  type: 'TEXT' as FieldType,
  placeholder: '',
  helpText: '',
  required: false,
  width: 2 as 1 | 2,
  active: true,
  options: [] as Array<{ label: string; value: string }>,
  validation: {
    min: null as number | null,
    max: null as number | null,
    pattern: '',
    patternMessage: '',
    minDate: '',
    maxDate: '',
    minItems: null as number | null,
    maxItems: null as number | null,
    acceptedExtensions: '' as string,
    maxFileSizeMb: null as number | null,
    decimals: null as number | null,
  },
});

/** Só a criação deriva a chave do rótulo; alterá-la num campo existente é arriscado. */
const isNew = computed(() => props.field === null);
const keyTouched = ref(false);

watch(
  () => props.field,
  (field) => {
    keyTouched.value = false;
    if (!field) {
      Object.assign(form, {
        key: '',
        label: '',
        type: 'TEXT',
        placeholder: '',
        helpText: '',
        required: false,
        width: 2,
        active: true,
        options: [],
      });
      Object.assign(form.validation, {
        min: null, max: null, pattern: '', patternMessage: '', minDate: '', maxDate: '',
        minItems: null, maxItems: null, acceptedExtensions: '', maxFileSizeMb: null, decimals: null,
      });
      return;
    }

    Object.assign(form, {
      key: field.key,
      label: field.label,
      type: field.type,
      placeholder: field.placeholder ?? '',
      helpText: field.helpText ?? '',
      required: field.required,
      width: field.width,
      active: field.active,
      options: field.options.map((option) => ({ ...option })),
    });

    const v = field.validation;
    Object.assign(form.validation, {
      min: v.min ?? null,
      max: v.max ?? null,
      pattern: v.pattern ?? '',
      patternMessage: v.patternMessage ?? '',
      minDate: v.minDate ?? '',
      maxDate: v.maxDate ?? '',
      minItems: v.minItems ?? null,
      maxItems: v.maxItems ?? null,
      acceptedExtensions: (v.acceptedExtensions ?? []).join(', '),
      maxFileSizeMb: v.maxFileSize ? Math.round((v.maxFileSize / (1024 * 1024)) * 10) / 10 : null,
      decimals: v.decimals ?? null,
    });
  },
  { immediate: true },
);

// Enquanto ninguém tocar na chave, ela acompanha o rótulo.
watch(
  () => form.label,
  (label) => {
    if (isNew.value && !keyTouched.value) form.key = toFieldKey(label);
  },
);

const needsOptions = computed(() => CHOICE_FIELD_TYPES.includes(form.type));
const isText = computed(() => form.type === 'TEXT' || form.type === 'TEXTAREA');
const isNumber = computed(() => form.type === 'NUMBER');
const isDate = computed(() => form.type === 'DATE');
const isFile = computed(() => form.type === 'FILE');
const isMulti = computed(() => form.type === 'MULTISELECT');
const hasPattern = computed(() => form.type === 'TEXT' || form.type === 'PHONE');

const keyConflict = computed(
  () => form.key !== '' && props.usedKeys.includes(form.key) && form.key !== props.field?.key,
);

function addOption(): void {
  form.options.push({ label: '', value: '' });
}

function removeOption(index: number): void {
  form.options.splice(index, 1);
}

/** O valor técnico deriva do rótulo, salvo quando editado à mão. */
function syncOptionValue(index: number): void {
  const option = form.options[index];
  if (!option.value.trim()) option.value = toFieldKey(option.label).replace(/_/g, '-');
}

function buildValidation(): Record<string, unknown> {
  const v = form.validation;
  const result: Record<string, unknown> = {};

  if (isText.value || isNumber.value) {
    if (v.min !== null) result.min = Number(v.min);
    if (v.max !== null) result.max = Number(v.max);
  }
  if (isNumber.value && v.decimals !== null) result.decimals = Number(v.decimals);
  if (hasPattern.value && v.pattern.trim()) {
    result.pattern = v.pattern.trim();
    if (v.patternMessage.trim()) result.patternMessage = v.patternMessage.trim();
  }
  if (isDate.value) {
    if (v.minDate) result.minDate = v.minDate;
    if (v.maxDate) result.maxDate = v.maxDate;
  }
  if (isMulti.value || isFile.value) {
    if (v.minItems !== null) result.minItems = Number(v.minItems);
    if (v.maxItems !== null) result.maxItems = Number(v.maxItems);
  }
  if (isFile.value) {
    const extensions = v.acceptedExtensions
      .split(',')
      .map((item) => item.trim().replace(/^\./, '').toLowerCase())
      .filter(Boolean);
    if (extensions.length) result.acceptedExtensions = extensions;
    if (v.maxFileSizeMb !== null) result.maxFileSize = Math.round(Number(v.maxFileSizeMb) * 1024 * 1024);
  }

  return result;
}

function submit(): void {
  emit('submit', {
    key: form.key,
    label: form.label,
    type: form.type,
    placeholder: form.placeholder.trim() || null,
    helpText: form.helpText.trim() || null,
    required: form.required,
    width: form.width,
    active: form.active,
    options: needsOptions.value ? form.options : [],
    validation: buildValidation(),
  });
}
</script>

<template>
  <form class="space-y-5" novalidate @submit.prevent="submit">
    <!-- Identificação -->
    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label for="fe-label" class="label">Rótulo apresentado ao cliente</label>
        <input
          id="fe-label"
          v-model="form.label"
          type="text"
          class="input"
          :class="errors.label && 'input-error'"
          placeholder="Ex.: Número do Bilhete de Identidade"
        />
        <p v-for="m in errors.label" :key="m" class="field-error">{{ m }}</p>
      </div>

      <div>
        <label for="fe-key" class="label">Chave técnica</label>
        <input
          id="fe-key"
          v-model="form.key"
          type="text"
          class="input font-mono text-[13px]"
          :class="(errors.key || keyConflict) && 'input-error'"
          :disabled="!isNew && !!field"
          @input="keyTouched = true"
        />
        <p v-if="keyConflict" class="field-error">Já existe um campo com esta chave neste serviço.</p>
        <p v-for="m in errors.key" :key="m" class="field-error">{{ m }}</p>
        <p v-if="!isNew" class="mt-1 text-[11px] text-graphite-400">
          A chave não é editável: os pedidos já submetidos guardam os valores por chave.
        </p>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label for="fe-type" class="label">Tipo de campo</label>
        <select id="fe-type" v-model="form.type" class="input">
          <option v-for="type in FIELD_TYPES" :key="type" :value="type">{{ FIELD_TYPE_LABELS[type] }}</option>
        </select>
      </div>

      <div>
        <label for="fe-width" class="label">Largura no formulário</label>
        <select id="fe-width" v-model.number="form.width" class="input">
          <option :value="1">Meia coluna</option>
          <option :value="2">Coluna inteira</option>
        </select>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label for="fe-placeholder" class="label">Texto de exemplo (placeholder)</label>
        <input id="fe-placeholder" v-model="form.placeholder" type="text" class="input" />
      </div>
      <div>
        <label for="fe-help" class="label">Texto de ajuda</label>
        <input id="fe-help" v-model="form.helpText" type="text" class="input" placeholder="Explicação apresentada por baixo do campo" />
      </div>
    </div>

    <div class="flex flex-wrap gap-5 border-y border-graphite-100 py-3">
      <label class="flex cursor-pointer items-center gap-2 text-[13px] text-graphite-700">
        <input v-model="form.required" type="checkbox" class="h-3.5 w-3.5 accent-graphite-950" />
        Preenchimento obrigatório
      </label>
      <label class="flex cursor-pointer items-center gap-2 text-[13px] text-graphite-700">
        <input v-model="form.active" type="checkbox" class="h-3.5 w-3.5 accent-graphite-950" />
        Campo activo (visível no site)
      </label>
    </div>

    <!-- Opções -->
    <div v-if="needsOptions">
      <div class="flex items-center justify-between">
        <span class="label mb-0">Opções disponíveis</span>
        <button type="button" class="btn-secondary btn-xs" @click="addOption">Adicionar opção</button>
      </div>

      <ul class="mt-2 space-y-2">
        <li v-for="(option, index) in form.options" :key="index" class="flex gap-2">
          <input
            v-model="option.label"
            type="text"
            class="input flex-1"
            placeholder="Rótulo (ex.: Benguela)"
            @blur="syncOptionValue(index)"
          />
          <input v-model="option.value" type="text" class="input w-40 font-mono text-[12px]" placeholder="valor" />
          <button
            type="button"
            class="shrink-0 px-2 text-graphite-300 transition-colors hover:text-red-600"
            aria-label="Remover opção"
            @click="removeOption(index)"
          >
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </li>
      </ul>

      <p v-if="!form.options.length" class="mt-2 rounded-sm bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
        Um campo de selecção precisa de pelo menos uma opção.
      </p>
      <p v-for="m in errors.options" :key="m" class="field-error">{{ m }}</p>
    </div>

    <!-- Regras de validação, adaptadas ao tipo -->
    <div v-if="isText || isNumber || isDate || isMulti || isFile || hasPattern">
      <p class="label">Regras de validação</p>
      <div class="rounded-sm border border-graphite-200 bg-graphite-50 p-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <template v-if="isText">
            <div>
              <label for="v-min" class="label">Comprimento mínimo</label>
              <input id="v-min" v-model.number="form.validation.min" type="number" min="0" class="input" />
            </div>
            <div>
              <label for="v-max" class="label">Comprimento máximo</label>
              <input id="v-max" v-model.number="form.validation.max" type="number" min="1" class="input" />
            </div>
          </template>

          <template v-if="isNumber">
            <div>
              <label for="v-nmin" class="label">Valor mínimo</label>
              <input id="v-nmin" v-model.number="form.validation.min" type="number" class="input" />
            </div>
            <div>
              <label for="v-nmax" class="label">Valor máximo</label>
              <input id="v-nmax" v-model.number="form.validation.max" type="number" class="input" />
            </div>
            <div>
              <label for="v-dec" class="label">Casas decimais</label>
              <input id="v-dec" v-model.number="form.validation.decimals" type="number" min="0" max="6" class="input" placeholder="0 = inteiro" />
            </div>
          </template>

          <template v-if="isDate">
            <div>
              <label for="v-dmin" class="label">Data mínima</label>
              <input id="v-dmin" v-model="form.validation.minDate" type="date" class="input" />
            </div>
            <div>
              <label for="v-dmax" class="label">Data máxima</label>
              <input id="v-dmax" v-model="form.validation.maxDate" type="date" class="input" />
            </div>
          </template>

          <template v-if="isMulti || isFile">
            <div>
              <label for="v-imin" class="label">Mínimo de {{ isFile ? 'ficheiros' : 'opções' }}</label>
              <input id="v-imin" v-model.number="form.validation.minItems" type="number" min="0" class="input" />
            </div>
            <div>
              <label for="v-imax" class="label">Máximo de {{ isFile ? 'ficheiros' : 'opções' }}</label>
              <input id="v-imax" v-model.number="form.validation.maxItems" type="number" min="1" class="input" />
            </div>
          </template>

          <template v-if="isFile">
            <div>
              <label for="v-ext" class="label">Extensões aceites</label>
              <input id="v-ext" v-model="form.validation.acceptedExtensions" type="text" class="input" placeholder="pdf, jpg, png" />
              <p class="mt-1 text-[11px] text-graphite-400">Separadas por vírgula. Vazio aceita todos os formatos permitidos globalmente.</p>
            </div>
            <div>
              <label for="v-size" class="label">Tamanho máximo por ficheiro (MB)</label>
              <input id="v-size" v-model.number="form.validation.maxFileSizeMb" type="number" min="0.1" step="0.1" class="input" />
            </div>
          </template>

          <template v-if="hasPattern">
            <div class="sm:col-span-2">
              <label for="v-pattern" class="label">Expressão regular</label>
              <input
                id="v-pattern"
                v-model="form.validation.pattern"
                type="text"
                class="input font-mono text-[12px]"
                placeholder="^[0-9]{9}[A-Z]{2}[0-9]{3}$"
              />
            </div>
            <div class="sm:col-span-2">
              <label for="v-pmsg" class="label">Mensagem quando a expressão falha</label>
              <input id="v-pmsg" v-model="form.validation.patternMessage" type="text" class="input" placeholder="Formato de BI inválido." />
            </div>
          </template>
        </div>

        <p v-for="m in errors.validation" :key="m" class="field-error">{{ m }}</p>
      </div>
    </div>

    <div class="flex justify-end gap-2 border-t border-graphite-100 pt-4">
      <button type="button" class="btn-secondary" @click="emit('cancel')">Cancelar</button>
      <button type="submit" class="btn-primary" :disabled="saving || keyConflict">
        {{ saving ? 'A guardar…' : isNew ? 'Adicionar campo' : 'Guardar alterações' }}
      </button>
    </div>
  </form>
</template>
