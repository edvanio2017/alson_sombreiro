import { ValidationError } from '../../../../shared/domain/domain-error';
import { FormField, type FormFieldProps } from './form-field.entity';

const props = (overrides: Partial<FormFieldProps> = {}): FormFieldProps => ({
  serviceId: 'servico-1',
  key: 'numero_bi',
  label: 'Número do BI',
  type: 'TEXT',
  placeholder: null,
  helpText: null,
  required: false,
  order: 0,
  width: 2,
  options: [],
  validation: {},
  active: true,
  ...overrides,
});

describe('FormField (entidade de domínio)', () => {
  describe('chave técnica', () => {
    it('normaliza a chave para minúsculas', () => {
      const field = FormField.create('f1', props({ key: 'Numero_BI' }));
      expect(field.key).toBe('numero_bi');
    });

    it.each(['1_campo', 'campo-com-hifen', 'a', 'campo com espaços', 'çampo'])(
      'rejeita a chave inválida "%s"',
      (key) => {
        expect(() => FormField.create('f1', props({ key }))).toThrow(ValidationError);
      },
    );

    it('rejeita rótulos demasiado curtos', () => {
      expect(() => FormField.create('f1', props({ label: 'A' }))).toThrow(ValidationError);
    });
  });

  describe('opções de listas de selecção', () => {
    it('exige pelo menos uma opção num SELECT', () => {
      expect(() => FormField.create('f1', props({ type: 'SELECT', options: [] }))).toThrow(
        /Defina pelo menos uma opção|selecção sem opções/i,
      );
    });

    it('rejeita valores duplicados', () => {
      expect(() =>
        FormField.create(
          'f1',
          props({
            type: 'SELECT',
            options: [
              { label: 'Benguela', value: 'benguela' },
              { label: 'Benguela Sede', value: 'benguela' },
            ],
          }),
        ),
      ).toThrow(ValidationError);
    });

    it('descarta opções vazias e aceita as restantes', () => {
      const field = FormField.create(
        'f1',
        props({
          type: 'SELECT',
          options: [
            { label: 'Luanda', value: 'luanda' },
            { label: '   ', value: '' },
          ],
        }),
      );

      expect(field.toDto().options).toEqual([{ label: 'Luanda', value: 'luanda' }]);
    });

    it('descarta opções em tipos que não são listas', () => {
      const field = FormField.create(
        'f1',
        props({ type: 'TEXT', options: [{ label: 'X', value: 'x' }] }),
      );

      expect(field.toDto().options).toEqual([]);
    });
  });

  describe('regras de validação', () => {
    it('remove regras que não se aplicam ao tipo do campo', () => {
      const field = FormField.create(
        'f1',
        props({
          type: 'EMAIL',
          validation: { min: 5, max: 10, pattern: '^a', maxFileSize: 1000 },
        }),
      );

      // Um campo de e-mail não tem limites de comprimento configuráveis.
      expect(field.toDto().validation).toEqual({});
    });

    it('mantém apenas as regras aplicáveis a campos de ficheiro', () => {
      const field = FormField.create(
        'f1',
        props({
          type: 'FILE',
          validation: { maxItems: 3, maxFileSize: 2048, acceptedExtensions: ['pdf'], min: 5 },
        }),
      );

      expect(field.toDto().validation).toEqual({
        maxItems: 3,
        maxFileSize: 2048,
        acceptedExtensions: ['pdf'],
      });
    });

    it('rejeita mínimo superior ao máximo', () => {
      expect(() =>
        FormField.create('f1', props({ type: 'NUMBER', validation: { min: 100, max: 10 } })),
      ).toThrow(ValidationError);
    });

    it('rejeita data mínima posterior à máxima', () => {
      expect(() =>
        FormField.create(
          'f1',
          props({ type: 'DATE', validation: { minDate: '2026-12-31', maxDate: '2026-01-01' } }),
        ),
      ).toThrow(ValidationError);
    });

    it('rejeita expressões regulares inválidas', () => {
      expect(() =>
        FormField.create('f1', props({ type: 'TEXT', validation: { pattern: '([' } })),
      ).toThrow(ValidationError);
    });
  });

  it('identifica campos de ficheiro', () => {
    expect(FormField.create('f1', props({ type: 'FILE' })).isFileField).toBe(true);
    expect(FormField.create('f2', props({ type: 'TEXT' })).isFileField).toBe(false);
  });
});
