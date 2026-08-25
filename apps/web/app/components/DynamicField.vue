<script setup lang="ts">
import { formatBytes, type FormFieldDto } from '@alson/shared';

/**
 * Renderiza um único campo a partir da sua definição.
 *
 * Não existe aqui nenhum conhecimento sobre serviços concretos: o componente
 * sabe apenas desenhar os dez tipos de campo suportados. Acrescentar um campo
 * novo a um serviço é, por isso, uma operação de backoffice, não de código.
 */
const props = defineProps<{
  field: FormFieldDto;
  modelValue: unknown;
  errors?: string[];
}>();

const emit = defineEmits<{ 'update:modelValue': [unknown] }>();

const inputId = computed(() => `campo-${props.field.key}`);
const helpId = computed(() => `${inputId.value}-ajuda`);
const errorId = computed(() => `${inputId.value}-erro`);
const hasError = computed(() => (props.errors?.length ?? 0) > 0);

/** Liga o campo às suas mensagens para os leitores de ecrã (WCAG 1.3.1 / 3.3.1). */
const describedBy = computed(() => {
  const ids: string[] = [];
  if (props.field.helpText) ids.push(helpId.value);
  if (hasError.value) ids.push(errorId.value);
  return ids.length > 0 ? ids.join(' ') : undefined;
});

const controlClass = computed(() => ['field-control', hasError.value && 'field-control-error']);

function update(value: unknown): void {
  emit('update:modelValue', value);
}

function onInput(event: Event): void {
  update((event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value);
}

/* ------------------------------ Multi-selecção ---------------------------- */

const selectedValues = computed<string[]>(() =>
  Array.isArray(props.modelValue) ? (props.modelValue as string[]) : [],
);

function toggleOption(value: string): void {
  const current = new Set(selectedValues.value);
  if (current.has(value)) current.delete(value);
  else current.add(value);
  update([...current]);
}

/* -------------------------------- Ficheiros ------------------------------- */

const files = computed<File[]>(() => (Array.isArray(props.modelValue) ? (props.modelValue as File[]) : []));
const isDragging = ref(false);

/** Limites configurados no backoffice, traduzidos para o atributo `accept`. */
const acceptAttribute = computed(() => {
  const extensions = props.field.validation.acceptedExtensions ?? [];
  const mimeTypes = props.field.validation.acceptedMimeTypes ?? [];
  return [...extensions.map((ext) => `.${ext.replace(/^\./, '')}`), ...mimeTypes].join(',') || undefined;
});

const fileHint = computed(() => {
  const parts: string[] = [];
  const { acceptedExtensions, maxFileSize, maxItems } = props.field.validation;
  if (acceptedExtensions?.length) parts.push(acceptedExtensions.join(', ').toUpperCase());
  if (maxFileSize) parts.push(`até ${formatBytes(maxFileSize)} por ficheiro`);
  if (maxItems) parts.push(`máx. ${maxItems} ficheiro(s)`);
  return parts.join(' · ');
});

function addFiles(incoming: FileList | null): void {
  if (!incoming || incoming.length === 0) return;
  const maxItems = props.field.validation.maxItems ?? 5;
  update([...files.value, ...Array.from(incoming)].slice(0, maxItems));
}

function removeFile(index: number): void {
  update(files.value.filter((_, position) => position !== index));
}

function onDrop(event: DragEvent): void {
  isDragging.value = false;
  addFiles(event.dataTransfer?.files ?? null);
}
</script>

<template>
  <div :class="field.width === 1 ? 'sm:col-span-1' : 'sm:col-span-2'">
    <!-- O checkbox integra o seu próprio rótulo. -->
    <label v-if="field.type !== 'CHECKBOX'" :for="inputId" class="field-label">
      {{ field.label }}
      <span v-if="field.required" class="ml-0.5 text-red-600" aria-hidden="true">*</span>
      <span v-if="field.required" class="sr-only">(obrigatório)</span>
    </label>

    <!-- Texto / e-mail / telefone / data / número -->
    <input
      v-if="['TEXT', 'EMAIL', 'PHONE', 'DATE', 'NUMBER'].includes(field.type)"
      :id="inputId"
      :name="field.key"
      :type="
        field.type === 'EMAIL'
          ? 'email'
          : field.type === 'PHONE'
            ? 'tel'
            : field.type === 'DATE'
              ? 'date'
              : field.type === 'NUMBER'
                ? 'number'
                : 'text'
      "
      :value="modelValue as string"
      :placeholder="field.placeholder ?? undefined"
      :required="field.required"
      :min="field.type === 'NUMBER' ? (field.validation.min ?? undefined) : undefined"
      :max="field.type === 'NUMBER' ? (field.validation.max ?? undefined) : undefined"
      :step="field.type === 'NUMBER' && field.validation.decimals === 0 ? 1 : 'any'"
      :minlength="field.type === 'TEXT' ? (field.validation.min ?? undefined) : undefined"
      :maxlength="field.type === 'TEXT' ? (field.validation.max ?? undefined) : undefined"
      :aria-invalid="hasError"
      :aria-describedby="describedBy"
      :class="controlClass"
      @input="onInput"
    />

    <!-- Texto longo -->
    <textarea
      v-else-if="field.type === 'TEXTAREA'"
      :id="inputId"
      :name="field.key"
      rows="5"
      :value="modelValue as string"
      :placeholder="field.placeholder ?? undefined"
      :required="field.required"
      :aria-invalid="hasError"
      :aria-describedby="describedBy"
      :class="[...controlClass, 'resize-y']"
      @input="onInput"
    />

    <!-- Lista de selecção -->
    <div v-else-if="field.type === 'SELECT'" class="relative">
      <select
        :id="inputId"
        :name="field.key"
        :value="modelValue as string"
        :required="field.required"
        :aria-invalid="hasError"
        :aria-describedby="describedBy"
        :class="[...controlClass, 'appearance-none pr-10']"
        @change="onInput"
      >
        <option value="">{{ field.placeholder || 'Seleccione uma opção' }}</option>
        <option v-for="option in field.options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <svg
        class="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
          clip-rule="evenodd"
        />
      </svg>
    </div>

    <!-- Selecção múltipla: grupo de checkboxes, mais acessível que um <select multiple> -->
    <fieldset
      v-else-if="field.type === 'MULTISELECT'"
      :aria-invalid="hasError"
      :aria-describedby="describedBy"
      class="grid gap-2 sm:grid-cols-2"
    >
      <legend class="sr-only">{{ field.label }}</legend>
      <label
        v-for="option in field.options"
        :key="option.value"
        class="flex cursor-pointer items-center gap-3 border px-4 py-3 text-[14px] transition-colors"
        :class="
          selectedValues.includes(option.value)
            ? 'border-graphite-900 bg-graphite-950 text-white'
            : 'border-graphite-200 bg-white text-graphite-700 hover:border-graphite-400'
        "
      >
        <input
          type="checkbox"
          class="h-4 w-4 shrink-0 accent-graphite-950"
          :checked="selectedValues.includes(option.value)"
          :value="option.value"
          @change="toggleOption(option.value)"
        />
        {{ option.label }}
      </label>
    </fieldset>

    <!-- Caixa de confirmação -->
    <label
      v-else-if="field.type === 'CHECKBOX'"
      :for="inputId"
      class="flex cursor-pointer items-start gap-3 border border-graphite-200 bg-white p-4"
      :class="hasError && 'border-red-400'"
    >
      <input
        :id="inputId"
        :name="field.key"
        type="checkbox"
        :checked="modelValue === true"
        :required="field.required"
        :aria-invalid="hasError"
        :aria-describedby="describedBy"
        class="mt-0.5 h-4 w-4 shrink-0 accent-graphite-950"
        @change="update(($event.target as HTMLInputElement).checked)"
      />
      <span class="text-[14px] leading-relaxed text-graphite-700">
        {{ field.label }}
        <span v-if="field.required" class="text-red-600" aria-hidden="true">*</span>
      </span>
    </label>

    <!-- Upload de ficheiros -->
    <div v-else-if="field.type === 'FILE'">
      <div
        class="border border-dashed p-6 text-center transition-colors"
        :class="[
          isDragging ? 'border-graphite-900 bg-graphite-50' : 'border-graphite-300 bg-white',
          hasError && 'border-red-400',
        ]"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="onDrop"
      >
        <input
          :id="inputId"
          :name="field.key"
          type="file"
          multiple
          class="sr-only"
          :accept="acceptAttribute"
          :aria-invalid="hasError"
          :aria-describedby="describedBy"
          @change="addFiles(($event.target as HTMLInputElement).files)"
        />
        <svg
          class="mx-auto h-7 w-7 text-graphite-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.4"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
          />
        </svg>
        <p class="mt-3 text-[14px] text-graphite-600">
          <label
            :for="inputId"
            class="cursor-pointer font-medium text-graphite-950 underline underline-offset-4"
          >
            Escolher ficheiros
          </label>
          ou arraste-os para aqui
        </p>
        <p v-if="fileHint" class="mt-1 text-[12px] text-graphite-400">{{ fileHint }}</p>
      </div>

      <ul v-if="files.length" class="mt-3 space-y-2">
        <li
          v-for="(file, index) in files"
          :key="`${file.name}-${index}`"
          class="flex items-center justify-between gap-3 border border-graphite-200 bg-white px-4 py-2.5"
        >
          <span class="min-w-0 flex-1 truncate text-[14px] text-graphite-800">{{ file.name }}</span>
          <span class="shrink-0 text-[12px] text-graphite-400">{{ formatBytes(file.size) }}</span>
          <button
            type="button"
            class="shrink-0 text-graphite-400 transition-colors hover:text-red-600"
            :aria-label="`Remover o ficheiro ${file.name}`"
            @click="removeFile(index)"
          >
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
              />
            </svg>
          </button>
        </li>
      </ul>
    </div>

    <p v-if="field.helpText" :id="helpId" class="field-help">{{ field.helpText }}</p>

    <!-- `role="alert"` faz o leitor de ecrã anunciar o erro assim que surge. -->
    <p v-for="message in errors" :key="message" :id="errorId" class="field-error" role="alert">
      <svg class="mt-0.5 h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fill-rule="evenodd"
          d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
          clip-rule="evenodd"
        />
      </svg>
      {{ message }}
    </p>
  </div>
</template>
