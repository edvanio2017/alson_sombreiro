import { buildInitialValues, validateFormData, type FormFieldDto } from '@alson/shared';

/**
 * O motor de validação de formulários dinâmicos é o componente mais crítico do
 * sistema: é ele que garante que um formulário definido no backoffice é
 * aplicado com o mesmo rigor no browser e na API.
 */

const field = (overrides: Partial<FormFieldDto> & Pick<FormFieldDto, 'key' | 'type'>): FormFieldDto => ({
  id: `id-${overrides.key}`,
  label: overrides.label ?? overrides.key,
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

describe('validateFormData', () => {
  describe('obrigatoriedade', () => {
    it('rejeita um campo obrigatório em falta', () => {
      const fields = [field({ key: 'nome', type: 'TEXT', required: true })];

      const result = validateFormData(fields, {});

      expect(result.success).toBe(false);
      expect(result.errors.nome).toEqual(['Este campo é obrigatório.']);
    });

    it('rejeita um campo obrigatório preenchido apenas com espaços', () => {
      const fields = [field({ key: 'nome', type: 'TEXT', required: true })];

      const result = validateFormData(fields, { nome: '   ' });

      expect(result.success).toBe(false);
      expect(result.errors.nome).toEqual(['Este campo é obrigatório.']);
    });

    it('aceita um campo opcional vazio e normaliza-o para null', () => {
      const fields = [field({ key: 'observacoes', type: 'TEXTAREA', required: false })];

      const result = validateFormData(fields, { observacoes: '' });

      expect(result.success).toBe(true);
      expect(result.data.observacoes).toBeNull();
    });

    it('exige confirmação explícita num checkbox obrigatório', () => {
      const fields = [field({ key: 'consentimento', type: 'CHECKBOX', required: true })];

      expect(validateFormData(fields, { consentimento: false }).success).toBe(false);
      expect(validateFormData(fields, { consentimento: true }).success).toBe(true);
    });
  });

  describe('regras por tipo', () => {
    it('aplica comprimento mínimo e máximo em texto', () => {
      const fields = [
        field({ key: 'municipio', type: 'TEXT', required: true, validation: { min: 3, max: 10 } }),
      ];

      expect(validateFormData(fields, { municipio: 'ab' }).errors.municipio).toEqual([
        'Deve ter no mínimo 3 caracteres.',
      ]);
      expect(validateFormData(fields, { municipio: 'a'.repeat(11) }).errors.municipio).toEqual([
        'Deve ter no máximo 10 caracteres.',
      ]);
      expect(validateFormData(fields, { municipio: 'Lobito' }).success).toBe(true);
    });

    it('aplica a expressão regular configurada com a mensagem definida', () => {
      const fields = [
        field({
          key: 'numero_bi',
          type: 'TEXT',
          required: true,
          validation: {
            pattern: '^[0-9]{9}[A-Za-z]{2}[0-9]{3}$',
            patternMessage: 'Formato de BI inválido.',
          },
        }),
      ];

      expect(validateFormData(fields, { numero_bi: '123' }).errors.numero_bi).toEqual([
        'Formato de BI inválido.',
      ]);
      expect(validateFormData(fields, { numero_bi: '004512378LA041' }).success).toBe(true);
    });

    it('ignora uma expressão regular inválida em vez de quebrar o formulário', () => {
      const fields = [
        field({ key: 'codigo', type: 'TEXT', required: true, validation: { pattern: '([' } }),
      ];

      expect(validateFormData(fields, { codigo: 'qualquer-valor' }).success).toBe(true);
    });

    it('converte e valida limites numéricos', () => {
      const fields = [
        field({ key: 'area_m2', type: 'NUMBER', required: true, validation: { min: 1, max: 500 } }),
      ];

      // Os valores chegam como texto do formulário HTML.
      const valid = validateFormData(fields, { area_m2: '120' });
      expect(valid.success).toBe(true);
      expect(valid.data.area_m2).toBe(120);

      expect(validateFormData(fields, { area_m2: '600' }).errors.area_m2).toEqual([
        'O valor máximo é 500.',
      ]);
      expect(validateFormData(fields, { area_m2: 'abc' }).success).toBe(false);
    });

    it('exige número inteiro quando decimals é 0', () => {
      const fields = [
        field({ key: 'quantidade', type: 'NUMBER', required: true, validation: { decimals: 0 } }),
      ];

      expect(validateFormData(fields, { quantidade: '3.5' }).errors.quantidade).toEqual([
        'Introduza um número inteiro.',
      ]);
      expect(validateFormData(fields, { quantidade: '3' }).success).toBe(true);
    });

    it('valida o intervalo de datas configurado', () => {
      const fields = [
        field({
          key: 'prazo',
          type: 'DATE',
          required: true,
          validation: { minDate: '2026-01-01', maxDate: '2026-12-31' },
        }),
      ];

      expect(validateFormData(fields, { prazo: '2025-06-01' }).success).toBe(false);
      expect(validateFormData(fields, { prazo: '2026-06-01' }).success).toBe(true);
      expect(validateFormData(fields, { prazo: '01/06/2026' }).success).toBe(false);
    });

    it('normaliza e valida e-mails', () => {
      const fields = [field({ key: 'email', type: 'EMAIL', required: true })];

      const result = validateFormData(fields, { email: '  MARIA@Exemplo.AO ' });
      expect(result.success).toBe(true);
      expect(result.data.email).toBe('maria@exemplo.ao');

      expect(validateFormData(fields, { email: 'sem-arroba' }).success).toBe(false);
    });

    it('aceita telefones angolanos em vários formatos', () => {
      const fields = [field({ key: 'telefone', type: 'PHONE', required: true })];

      for (const valid of ['+244923075864', '244 923 075 864', '923075864', '923-075-864']) {
        expect(validateFormData(fields, { telefone: valid }).success).toBe(true);
      }
      expect(validateFormData(fields, { telefone: '12345' }).success).toBe(false);
    });

    it('recusa valores fora das opções de uma lista de selecção', () => {
      const fields = [
        field({
          key: 'provincia',
          type: 'SELECT',
          required: true,
          options: [
            { label: 'Benguela', value: 'benguela' },
            { label: 'Luanda', value: 'luanda' },
          ],
        }),
      ];

      expect(validateFormData(fields, { provincia: 'porto' }).success).toBe(false);
      expect(validateFormData(fields, { provincia: 'benguela' }).success).toBe(true);
    });

    it('aplica limites de selecção múltipla', () => {
      const fields = [
        field({
          key: 'servicos',
          type: 'MULTISELECT',
          required: true,
          options: [
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b' },
            { label: 'C', value: 'c' },
          ],
          validation: { minItems: 2, maxItems: 2 },
        }),
      ];

      expect(validateFormData(fields, { servicos: ['a'] }).errors.servicos).toEqual([
        'Seleccione pelo menos 2 opção(ões).',
      ]);
      expect(validateFormData(fields, { servicos: ['a', 'b', 'c'] }).success).toBe(false);
      expect(validateFormData(fields, { servicos: ['a', 'b'] }).success).toBe(true);
    });
  });

  describe('campos de ficheiro', () => {
    const fileField = field({
      key: 'documentos',
      type: 'FILE',
      required: true,
      validation: {
        maxItems: 2,
        maxFileSize: 1024 * 1024,
        acceptedExtensions: ['pdf', 'png'],
      },
    });

    it('aceita ficheiros dentro dos limites configurados', () => {
      const result = validateFormData([fileField], {
        documentos: [{ name: 'titulo.pdf', size: 500_000, type: 'application/pdf' }],
      });

      expect(result.success).toBe(true);
    });

    it('rejeita extensões não permitidas', () => {
      const result = validateFormData([fileField], {
        documentos: [{ name: 'virus.exe', size: 1000, type: 'application/octet-stream' }],
      });

      expect(result.success).toBe(false);
      expect(result.errors.documentos[0]).toContain('Formato não aceite');
    });

    it('rejeita ficheiros acima do tamanho máximo', () => {
      const result = validateFormData([fileField], {
        documentos: [{ name: 'planta.pdf', size: 5 * 1024 * 1024, type: 'application/pdf' }],
      });

      expect(result.success).toBe(false);
      expect(result.errors.documentos[0]).toContain('excede o tamanho máximo');
    });

    it('rejeita mais ficheiros do que o permitido', () => {
      const files = Array.from({ length: 3 }, (_, index) => ({
        name: `doc-${index}.pdf`,
        size: 1000,
        type: 'application/pdf',
      }));

      const result = validateFormData([fileField], { documentos: files });

      expect(result.success).toBe(false);
      expect(result.errors.documentos).toEqual(['Pode anexar no máximo 2 ficheiro(s).']);
    });
  });

  describe('composição do formulário', () => {
    it('ignora campos desactivados', () => {
      const fields = [
        field({ key: 'antigo', type: 'TEXT', required: true, active: false }),
        field({ key: 'actual', type: 'TEXT', required: true }),
      ];

      const result = validateFormData(fields, { actual: 'valor' });

      expect(result.success).toBe(true);
      expect(result.data).not.toHaveProperty('antigo');
    });

    it('acumula erros de vários campos numa única resposta', () => {
      const fields = [
        field({ key: 'nome', type: 'TEXT', required: true }),
        field({ key: 'email', type: 'EMAIL', required: true }),
        field({ key: 'area', type: 'NUMBER', required: true, validation: { min: 10 } }),
      ];

      const result = validateFormData(fields, { email: 'invalido', area: '5' });

      expect(result.success).toBe(false);
      expect(Object.keys(result.errors).sort()).toEqual(['area', 'email', 'nome']);
    });
  });
});

describe('buildInitialValues', () => {
  it('devolve valores iniciais coerentes com cada tipo de campo', () => {
    const fields = [
      field({ key: 'nome', type: 'TEXT' }),
      field({ key: 'aceito', type: 'CHECKBOX' }),
      field({ key: 'servicos', type: 'MULTISELECT' }),
      field({ key: 'anexos', type: 'FILE' }),
      field({ key: 'oculto', type: 'TEXT', active: false }),
    ];

    expect(buildInitialValues(fields)).toEqual({
      nome: '',
      aceito: false,
      servicos: [],
      anexos: [],
    });
  });
});
