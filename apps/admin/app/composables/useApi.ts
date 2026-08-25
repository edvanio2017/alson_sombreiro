import type { ApiErrorResponse } from '@alson/shared';

export interface ApiFailure {
  status: number;
  message: string;
  details: Record<string, string[]>;
}

export function toApiFailure(error: unknown): ApiFailure {
  const candidate = error as { statusCode?: number; data?: ApiErrorResponse; message?: string };
  const payload = candidate?.data;

  return {
    status: payload?.statusCode ?? candidate?.statusCode ?? 0,
    message:
      payload?.message ??
      (candidate?.statusCode === 429
        ? 'Demasiados pedidos. Aguarde um momento.'
        : 'Não foi possível contactar o servidor.'),
    details: payload?.details ?? {},
  };
}

/**
 * Cliente HTTP autenticado.
 *
 * Junta o token a cada pedido e, perante um 401, tenta renovar a sessão uma
 * única vez antes de repetir a chamada, para que o utilizador não seja expulso a meio de
 * uma tarefa só porque o access token expirou.
 */
export function useApi() {
  const config = useRuntimeConfig();
  const auth = useAuth();

  async function request<T>(url: string, options: Record<string, unknown> = {}): Promise<T> {
    const call = (): Promise<T> =>
      $fetch<T>(url, {
        baseURL: config.public.apiBase,
        ...options,
        headers: {
          ...((options.headers as Record<string, string>) ?? {}),
          ...(auth.accessToken() ? { Authorization: `Bearer ${auth.accessToken()}` } : {}),
        },
      });

    try {
      return await call();
    } catch (error) {
      const failure = toApiFailure(error);

      if (failure.status === 401) {
        if (await auth.refresh()) return call();

        auth.clear();
        await navigateTo('/login');
      }

      throw error;
    }
  }

  return {
    get: <T>(url: string, params?: Record<string, unknown>) =>
      request<T>(url, { method: 'GET', params }),
    post: <T>(url: string, body?: unknown) => request<T>(url, { method: 'POST', body }),
    patch: <T>(url: string, body?: unknown) => request<T>(url, { method: 'PATCH', body }),
    delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
    /** Descarrega um anexo respeitando o cabeçalho de autenticação. */
    download: async (url: string, filename: string): Promise<void> => {
      const blob = await request<Blob>(url, { method: 'GET', responseType: 'blob' });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    },
    raw: request,
  };
}
