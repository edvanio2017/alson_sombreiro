import { z, type ZodTypeAny } from 'zod';
import type { FieldValidationRules, FormFieldDto } from './contracts.js';
import type { FieldType } from './enums.js';

/**
 * Motor de validação de formulários dinâmicos.
 *
 * Este ficheiro é a razão de existir do pacote `@alson/shared`: a partir da
 * definição de campos criada no backoffice constrói-se um único schema Zod
 * que é usado tanto no browser (validação imediata, antes de submeter) como na
 * API (validação autoritativa, em `SubmitRequestUseCase`). Não existe qualquer
 * duplicação de regras entre cliente e servidor.
 */

/** Descritor mínimo de um ficheiro, comum a `File` (browser) e Multer (API). */
export interface FileLike {
  name: string;
  size: number;
  type: string;
}

export const REQUIRED_MESSAGE = 'Este campo é obrigatório.';

/** Telefone angolano: +244 9XX XXX XXX, com espaços/hífens opcionais. */
export const ANGOLA_PHONE_PATTERN = /^(\+?244)?[\s-]?9\d{2}[\s-]?\d{3}[\s-]?\d{3}$/;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot === -1 ? '' : filename.slice(dot + 1).toLowerCase();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Um valor "vazio" para efeitos de obrigatoriedade. */
export function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/* -------------------------------------------------------------------------- */
/*  Construção do schema por tipo de campo                                    */
/* -------------------------------------------------------------------------- */

function buildTextSchema(rules: FieldValidationRules, isLong: boolean): ZodTypeAny {
  let schema = z.string({ invalid_type_error: 'Valor inválido.' }).trim();

  if (typeof rules.min === 'number') {
    schema = schema.min(rules.min, `Deve ter no mínimo ${rules.min} caracteres.`);
  }
  if (typeof rules.max === 'number') {
    schema = schema.max(rules.max, `Deve ter no máximo ${rules.max} caracteres.`);
  } else if (!isLong) {
    schema = schema.max(500, 'Deve ter no máximo 500 caracteres.');
  } else {
    schema = schema.max(10_000, 'Deve ter no máximo 10 000 caracteres.');
  }
  if (rules.pattern) {
    try {
      schema = schema.regex(
        new RegExp(rules.pattern),
        rules.patternMessage || 'O formato introduzido não é válido.',
      );
    } catch {
      // Uma expressão regular inválida guardada no backoffice não deve
      // quebrar o formulário público, por isso ignora-se a regra.
    }
  }
  return schema;
}

function buildNumberSchema(rules: FieldValidationRules): ZodTypeAny {
  return z.coerce
    .number({ invalid_type_error: 'Introduza um número válido.' })
    .superRefine((value, ctx) => {
      if (!Number.isFinite(value)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Introduza um número válido.' });
        return;
      }
      if (typeof rules.min === 'number' && value < rules.min) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `O valor mínimo é ${rules.min}.` });
      }
      if (typeof rules.max === 'number' && value > rules.max) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `O valor máximo é ${rules.max}.` });
      }
      if (typeof rules.decimals === 'number') {
        const factor = 10 ** rules.decimals;
        const isRounded = Math.abs(value * factor - Math.round(value * factor)) < 1e-9;
        if (!isRounded) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              rules.decimals === 0
                ? 'Introduza um número inteiro.'
                : `São permitidas no máximo ${rules.decimals} casas decimais.`,
          });
        }
      }
    });
}

function buildDateSchema(rules: FieldValidationRules): ZodTypeAny {
  let schema: ZodTypeAny = z
    .string()
    .regex(ISO_DATE_PATTERN, 'Introduza uma data válida (AAAA-MM-DD).')
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Introduza uma data válida.');

  if (rules.minDate) {
    const minDate = rules.minDate;
    schema = schema.refine(
      (value: string) => value >= minDate,
      `A data não pode ser anterior a ${minDate}.`,
    );
  }
  if (rules.maxDate) {
    const maxDate = rules.maxDate;
    schema = schema.refine(
      (value: string) => value <= maxDate,
      `A data não pode ser posterior a ${maxDate}.`,
    );
  }
  return schema;
}

function buildFileSchema(rules: FieldValidationRules): ZodTypeAny {
  const fileSchema = z
    .custom<FileLike>(
      (value) =>
        !!value &&
        typeof value === 'object' &&
        typeof (value as FileLike).name === 'string' &&
        typeof (value as FileLike).size === 'number',
      'Ficheiro inválido.',
    )
    .superRefine((file, ctx) => {
      if (typeof rules.maxFileSize === 'number' && file.size > rules.maxFileSize) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `"${file.name}" excede o tamanho máximo de ${formatBytes(rules.maxFileSize)}.`,
        });
      }
      if (rules.acceptedExtensions?.length) {
        const accepted = rules.acceptedExtensions.map((ext) => ext.replace(/^\./, '').toLowerCase());
        if (!accepted.includes(extensionOf(file.name))) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Formato não aceite. Formatos permitidos: ${accepted.join(', ')}.`,
          });
        }
      }
      if (rules.acceptedMimeTypes?.length && file.type && !rules.acceptedMimeTypes.includes(file.type)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `O tipo de ficheiro "${file.type}" não é aceite neste campo.`,
        });
      }
    });

  let schema = z.array(fileSchema, { invalid_type_error: 'Anexe pelo menos um ficheiro.' });

  const maxItems = rules.maxItems ?? 5;
  if (typeof rules.minItems === 'number') {
    schema = schema.min(rules.minItems, `Anexe pelo menos ${rules.minItems} ficheiro(s).`);
  }
  schema = schema.max(maxItems, `Pode anexar no máximo ${maxItems} ficheiro(s).`);
  return schema;
}

function buildChoiceSchema(field: FormFieldDto): ZodTypeAny {
  const allowed = field.options.map((option) => option.value);
  return z
    .string()
    .refine((value) => allowed.includes(value), 'Seleccione uma das opções disponíveis.');
}

function buildMultiChoiceSchema(field: FormFieldDto): ZodTypeAny {
  const allowed = field.options.map((option) => option.value);
  const { minItems, maxItems } = field.validation;

  let schema = z.array(
    z.string().refine((value) => allowed.includes(value), 'Opção inválida seleccionada.'),
    { invalid_type_error: 'Seleccione pelo menos uma opção.' },
  );

  if (typeof minItems === 'number') {
    schema = schema.min(minItems, `Seleccione pelo menos ${minItems} opção(ões).`);
  }
  if (typeof maxItems === 'number') {
    schema = schema.max(maxItems, `Seleccione no máximo ${maxItems} opção(ões).`);
  }
  return schema;
}

/** Constrói o schema de um único campo, ignorando a obrigatoriedade. */
export function buildFieldSchema(field: FormFieldDto): ZodTypeAny {
  const rules = field.validation ?? {};

  const byType: Record<FieldType, () => ZodTypeAny> = {
    TEXT: () => buildTextSchema(rules, false),
    TEXTAREA: () => buildTextSchema(rules, true),
    NUMBER: () => buildNumberSchema(rules),
    DATE: () => buildDateSchema(rules),
    EMAIL: () =>
      z
        .string()
        .trim()
        .toLowerCase()
        .email('Introduza um endereço de e-mail válido.')
        .max(320, 'O e-mail é demasiado longo.'),
    PHONE: () =>
      z
        .string()
        .trim()
        .regex(
          rules.pattern ? new RegExp(rules.pattern) : ANGOLA_PHONE_PATTERN,
          rules.patternMessage || 'Introduza um telefone válido (ex.: +244 923 075 864).',
        ),
    SELECT: () => buildChoiceSchema(field),
    MULTISELECT: () => buildMultiChoiceSchema(field),
    CHECKBOX: () => z.coerce.boolean(),
    FILE: () => buildFileSchema(rules),
  };

  return byType[field.type]();
}

/**
 * Constrói o schema completo do formulário de um serviço.
 *
 * Campos não obrigatórios aceitam valor vazio (`''`, `[]`, `null`, `undefined`)
 * e são normalizados para `null`, evitando falsos erros de tipo em valores
 * simplesmente não preenchidos.
 */
export function buildFormSchema(fields: FormFieldDto[]) {
  const shape: Record<string, ZodTypeAny> = {};

  for (const field of fields.filter((item) => item.active)) {
    const base = buildFieldSchema(field);

    if (field.required) {
      if (field.type === 'CHECKBOX') {
        shape[field.key] = z.coerce
          .boolean()
          .refine((value) => value === true, 'É necessário confirmar este campo.');
        continue;
      }
      // Valor vazio -> `undefined`: o Zod emite "Required", que
      // `validateFormData` traduz para REQUIRED_MESSAGE.
      shape[field.key] = z.preprocess(
        (value) => (isEmptyValue(value) ? undefined : value),
        base,
      );
      continue;
    }

    // Campo opcional: vazio é normalizado para `null` e aceite.
    shape[field.key] = z.preprocess(
      (value) => (isEmptyValue(value) ? null : value),
      base.nullable(),
    );
  }

  return z.object(shape);
}

/** Resultado normalizado de uma validação de formulário. */
export interface FormValidationResult {
  success: boolean;
  data: Record<string, unknown>;
  /** Erros indexados pela `key` do campo, prontos a ligar à UI. */
  errors: Record<string, string[]>;
}

/**
 * Valida os dados submetidos contra a definição de campos.
 * Usada tal e qual no browser e na API.
 */
export function validateFormData(
  fields: FormFieldDto[],
  data: Record<string, unknown>,
): FormValidationResult {
  const schema = buildFormSchema(fields);
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data as Record<string, unknown>, errors: {} };
  }

  const errors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? '_form');
    // Zod devolve "Required" quando `undefined` chega a um campo obrigatório.
    const message = issue.message === 'Required' ? REQUIRED_MESSAGE : issue.message;
    (errors[key] ??= []).push(message);
  }
  return { success: false, data: {}, errors };
}

/** Valores iniciais coerentes com o tipo de cada campo (para o `v-model`). */
export function buildInitialValues(fields: FormFieldDto[]): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fields.filter((item) => item.active)) {
    switch (field.type) {
      case 'CHECKBOX':
        values[field.key] = false;
        break;
      case 'MULTISELECT':
      case 'FILE':
        values[field.key] = [];
        break;
      default:
        values[field.key] = '';
    }
  }
  return values;
}

/** Converte um valor submetido na sua representação legível (listas, e-mails). */
export function formatFieldValue(field: FormFieldDto, value: unknown): string {
  // Cadeia vazia: cabe a quem apresenta decidir como assinalar a ausência.
  if (isEmptyValue(value)) return '';

  switch (field.type) {
    case 'CHECKBOX':
      return value === true || value === 'true' ? 'Sim' : 'Não';
    case 'SELECT':
      return field.options.find((option) => option.value === value)?.label ?? String(value);
    case 'MULTISELECT': {
      const list = Array.isArray(value) ? value : [value];
      return list
        .map((item) => field.options.find((option) => option.value === item)?.label ?? String(item))
        .join(', ');
    }
    case 'FILE': {
      const list = Array.isArray(value) ? value : [value];
      return list.map((item) => (item as FileLike)?.name ?? String(item)).join(', ');
    }
    case 'DATE': {
      const parsed = new Date(String(value));
      return Number.isNaN(parsed.getTime())
        ? String(value)
        : parsed.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });
    }
    default:
      return String(value);
  }
}
