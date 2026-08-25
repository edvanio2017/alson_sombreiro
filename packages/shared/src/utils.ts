/** Utilitários partilhados entre a API e os frontends. */

/** Converte um texto em slug seguro para URL (sem acentos, minúsculas). */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    // O underscore é preservado nesta passagem para que seja tratado como
    // separador na seguinte. Sem isto, `em_triagem` colapsaria em `emtriagem`.
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Normaliza um label em chave técnica de campo (`Número do BI` -> `numero_do_bi`). */
export function toFieldKey(value: string): string {
  const slug = slugify(value).replace(/-/g, '_');
  return /^[a-z]/.test(slug) ? slug : `campo_${slug || 'sem_nome'}`;
}

/**
 * Formato do número de referência de um pedido: `AS-2026-000123`.
 * O prefixo identifica a Alson Sombreiro e o ano facilita o arquivo.
 */
export function formatReference(year: number, sequence: number): string {
  return `AS-${year}-${String(sequence).padStart(6, '0')}`;
}

export const REFERENCE_PATTERN = /^AS-\d{4}-\d{6}$/;

/** Formata uma data ISO no formato longo em português. */
export function formatDate(value: string | Date, withTime = false): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

/** Distância temporal legível ("há 3 dias"). */
export function timeAgo(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  const units: Array<[number, string, string]> = [
    [31_536_000, 'ano', 'anos'],
    [2_592_000, 'mês', 'meses'],
    [86_400, 'dia', 'dias'],
    [3_600, 'hora', 'horas'],
    [60, 'minuto', 'minutos'],
  ];

  for (const [size, singular, plural] of units) {
    const amount = Math.floor(seconds / size);
    if (amount >= 1) return `há ${amount} ${amount === 1 ? singular : plural}`;
  }
  return 'agora mesmo';
}

/** Normaliza um telefone angolano para o formato `+244 9XX XXX XXX`. */
export function formatAngolanPhone(value: string): string {
  const digits = value.replace(/\D/g, '').replace(/^244/, '');
  if (digits.length !== 9) return value;
  return `+244 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}
