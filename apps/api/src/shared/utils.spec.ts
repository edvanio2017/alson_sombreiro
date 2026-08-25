import { formatAngolanPhone, formatReference, slugify, toFieldKey } from '@alson/shared';

describe('slugify', () => {
  it('remove acentos e normaliza espaços', () => {
    expect(slugify('Avaliação Imobiliária')).toBe('avaliacao-imobiliaria');
    expect(slugify('  Registo   e Legalização  ')).toBe('registo-e-legalizacao');
  });

  it('trata o underscore como separador em vez de o eliminar', () => {
    // Regressão: `em_triagem` chegou a colapsar em `emtriagem`, o que partia
    // a correspondência de chaves de estados e de campos de formulário.
    expect(slugify('em_triagem')).toBe('em-triagem');
    expect(slugify('numero_bi')).toBe('numero-bi');
  });

  it('descarta pontuação', () => {
    expect(slugify('FESADA: Centralidades!')).toBe('fesada-centralidades');
  });
});

describe('toFieldKey', () => {
  it('deriva a chave técnica a partir do rótulo', () => {
    expect(toFieldKey('Número do Bilhete de Identidade')).toBe('numero_do_bilhete_de_identidade');
  });

  it('preserva uma chave já escrita em snake_case', () => {
    expect(toFieldKey('numero_bi')).toBe('numero_bi');
    expect(toFieldKey('area_m2')).toBe('area_m2');
  });

  it('prefixa chaves que não começam por letra', () => {
    expect(toFieldKey('2024 Receitas')).toBe('campo_2024_receitas');
  });
});

describe('formatReference', () => {
  it('gera a referência no formato AS-AAAA-NNNNNN', () => {
    expect(formatReference(2026, 7)).toBe('AS-2026-000007');
    expect(formatReference(2026, 123456)).toBe('AS-2026-123456');
  });
});

describe('formatAngolanPhone', () => {
  it('normaliza para +244 9XX XXX XXX', () => {
    expect(formatAngolanPhone('923075864')).toBe('+244 923 075 864');
    expect(formatAngolanPhone('+244923075864')).toBe('+244 923 075 864');
  });

  it('devolve o valor original quando não reconhece o formato', () => {
    expect(formatAngolanPhone('12345')).toBe('12345');
  });
});
