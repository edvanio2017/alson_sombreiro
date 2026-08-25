import {
  CHOICE_FIELD_TYPES,
  type FieldOption,
  type FieldType,
  type FieldValidationRules,
  type FormFieldDto,
} from '@alson/shared';
import { Entity } from '../../../../shared/domain/entity.base';
import { ValidationError } from '../../../../shared/domain/domain-error';

export interface FormFieldProps {
  serviceId: string;
  key: string;
  label: string;
  type: FieldType;
  placeholder: string | null;
  helpText: string | null;
  required: boolean;
  order: number;
  width: 1 | 2;
  options: FieldOption[];
  validation: FieldValidationRules;
  active: boolean;
}

const KEY_PATTERN = /^[a-z][a-z0-9_]{1,49}$/;

/**
 * Definição de um campo do formulário de um serviço.
 *
 * Esta entidade guarda as invariantes da *definição* do campo: que uma lista
 * de selecção tem opções, que os limites são coerentes, que a chave técnica é
 * válida. A validação dos *valores submetidos* vive em `@alson/shared`.
 */
export class FormField extends Entity<FormFieldProps> {
  private constructor(id: string, props: FormFieldProps) {
    super(id, props);
  }

  static create(id: string, props: FormFieldProps): FormField {
    const key = props.key.trim().toLowerCase();
    const label = props.label.trim();

    if (!KEY_PATTERN.test(key)) {
      throw new ValidationError('Chave de campo inválida.', {
        key: [
          'A chave deve começar por uma letra e conter apenas letras minúsculas, algarismos e underscore (2 a 50 caracteres).',
        ],
      });
    }
    if (label.length < 2) {
      throw new ValidationError('Rótulo de campo inválido.', {
        label: ['O rótulo deve ter pelo menos 2 caracteres.'],
      });
    }

    const options = FormField.normalizeOptions(props.type, props.options);
    const validation = FormField.normalizeValidation(props.type, props.validation ?? {});

    return new FormField(id, { ...props, key, label, options, validation });
  }

  /** Listas de selecção exigem opções com valores únicos e não vazios. */
  private static normalizeOptions(type: FieldType, options: FieldOption[] = []): FieldOption[] {
    if (!CHOICE_FIELD_TYPES.includes(type)) return [];

    const cleaned = options
      .map((option) => ({
        label: String(option.label ?? '').trim(),
        value: String(option.value ?? option.label ?? '').trim(),
      }))
      .filter((option) => option.label !== '' && option.value !== '');

    if (cleaned.length === 0) {
      throw new ValidationError('Campo de selecção sem opções.', {
        options: ['Defina pelo menos uma opção para este campo.'],
      });
    }

    const seen = new Set<string>();
    for (const option of cleaned) {
      if (seen.has(option.value)) {
        throw new ValidationError('Opções duplicadas.', {
          options: [`O valor "${option.value}" está repetido.`],
        });
      }
      seen.add(option.value);
    }

    return cleaned;
  }

  /** Remove regras que não se aplicam ao tipo e valida a coerência das restantes. */
  private static normalizeValidation(
    type: FieldType,
    rules: FieldValidationRules,
  ): FieldValidationRules {
    const applicable: Record<FieldType, Array<keyof FieldValidationRules>> = {
      TEXT: ['min', 'max', 'pattern', 'patternMessage'],
      TEXTAREA: ['min', 'max'],
      NUMBER: ['min', 'max', 'decimals'],
      DATE: ['minDate', 'maxDate'],
      EMAIL: [],
      PHONE: ['pattern', 'patternMessage'],
      SELECT: [],
      MULTISELECT: ['minItems', 'maxItems'],
      CHECKBOX: [],
      FILE: ['minItems', 'maxItems', 'acceptedExtensions', 'acceptedMimeTypes', 'maxFileSize'],
    };

    const result: FieldValidationRules = {};
    for (const key of applicable[type]) {
      const value = rules[key];
      if (value !== undefined && value !== null && value !== '') {
        (result as Record<string, unknown>)[key] = value;
      }
    }

    const assertRange = (
      minKey: 'min' | 'minItems',
      maxKey: 'max' | 'maxItems',
      message: string,
    ): void => {
      const min = result[minKey];
      const max = result[maxKey];
      if (typeof min === 'number' && typeof max === 'number' && min > max) {
        throw new ValidationError('Limites incoerentes.', { validation: [message] });
      }
    };

    assertRange('min', 'max', 'O valor mínimo não pode ser superior ao máximo.');
    assertRange('minItems', 'maxItems', 'O mínimo de itens não pode ser superior ao máximo.');

    if (result.minDate && result.maxDate && result.minDate > result.maxDate) {
      throw new ValidationError('Datas incoerentes.', {
        validation: ['A data mínima não pode ser posterior à data máxima.'],
      });
    }

    if (result.pattern) {
      try {
        new RegExp(result.pattern);
      } catch {
        throw new ValidationError('Expressão regular inválida.', {
          validation: ['A expressão regular indicada não é válida.'],
        });
      }
    }

    return result;
  }

  get key(): string {
    return this.props.key;
  }

  get type(): FieldType {
    return this.props.type;
  }

  get label(): string {
    return this.props.label;
  }

  get order(): number {
    return this.props.order;
  }

  get active(): boolean {
    return this.props.active;
  }

  get serviceId(): string {
    return this.props.serviceId;
  }

  get isFileField(): boolean {
    return this.props.type === 'FILE';
  }

  toDto(): FormFieldDto {
    return {
      id: this.id,
      key: this.props.key,
      label: this.props.label,
      type: this.props.type,
      placeholder: this.props.placeholder,
      helpText: this.props.helpText,
      required: this.props.required,
      order: this.props.order,
      width: this.props.width,
      options: this.props.options,
      validation: this.props.validation,
      active: this.props.active,
    };
  }
}
