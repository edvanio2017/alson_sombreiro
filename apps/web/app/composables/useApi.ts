import type { ApiErrorResponse } from '@alson/shared';

/**
 * Cliente HTTP do site institucional.
 *
 * No servidor (SSR) usa-se `apiBaseServer`, que dentro do Docker aponta para
 * o serviço `api` na rede interna; no browser usa-se o URL público.
 */
export function useApiBase(): string {
  const config = useRuntimeConfig();
  return import.meta.server ? config.apiBaseServer : config.public.apiBase;
}

export interface ApiFailure {
  status: number;
  message: string;
  /** Erros de validação indexados pela chave do campo. */
  details: Record<string, string[]>;
}

/** Converte qualquer erro de rede/HTTP numa forma previsível para a UI. */
export function toApiFailure(error: unknown): ApiFailure {
  const candidate = error as { statusCode?: number; data?: ApiErrorResponse; message?: string };
  const payload = candidate?.data;

  return {
    status: payload?.statusCode ?? candidate?.statusCode ?? 0,
    message:
      payload?.message ??
      (candidate?.statusCode === 429
        ? 'Foram feitos demasiados pedidos. Aguarde alguns minutos e tente novamente.'
        : 'Não foi possível contactar o servidor. Verifique a sua ligação e tente novamente.'),
    details: payload?.details ?? {},
  };
}

/** `$fetch` já apontado para a API, para chamadas imperativas (submissões). */
export function useApiFetch() {
  const baseURL = useApiBase();
  return $fetch.create({ baseURL });
}

/**
 * `useFetch` com o `baseURL` correcto, usado nas páginas para que os dados
 * sejam obtidos durante o SSR e reaproveitados na hidratação.
 */
export function useApiData<T>(
  url: string | (() => string),
  options: Parameters<typeof useFetch<T>>[1] = {},
) {
  const baseURL = useApiBase();
  return useFetch<T>(url, { baseURL, ...options });
}
