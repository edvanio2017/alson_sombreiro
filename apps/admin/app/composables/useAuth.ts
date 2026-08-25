import type { AuthSessionDto, RoleName, UserSummaryDto } from '@alson/shared';

const ACCESS_KEY = 'alson.access_token';
const REFRESH_KEY = 'alson.refresh_token';

/**
 * Sessão do backoffice.
 *
 * O access token é curto (15 min) e o refresh é rodado a cada renovação: o
 * token usado é revogado no servidor e substituído por um novo. Ambos ficam em
 * `localStorage`. A alternativa (cookie HttpOnly) exigiria que a API e o
 * backoffice partilhassem domínio, o que não se pode assumir no alojamento.
 */
export function useAuth() {
  const user = useState<UserSummaryDto | null>('auth.user', () => null);
  const initialised = useState<boolean>('auth.initialised', () => false);
  const config = useRuntimeConfig();

  function readToken(key: string): string | null {
    if (import.meta.server) return null;
    return localStorage.getItem(key);
  }

  function persist(session: AuthSessionDto): void {
    localStorage.setItem(ACCESS_KEY, session.accessToken);
    localStorage.setItem(REFRESH_KEY, session.refreshToken);
    user.value = session.user;
  }

  function clear(): void {
    if (import.meta.client) {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
    }
    user.value = null;
  }

  async function login(email: string, password: string): Promise<void> {
    const session = await $fetch<AuthSessionDto>('/auth/login', {
      baseURL: config.public.apiBase,
      method: 'POST',
      body: { email, password },
    });
    persist(session);
  }

  async function logout(): Promise<void> {
    const refreshToken = readToken(REFRESH_KEY);
    try {
      await $fetch('/auth/logout', {
        baseURL: config.public.apiBase,
        method: 'POST',
        headers: { Authorization: `Bearer ${readToken(ACCESS_KEY)}` },
        body: { refreshToken },
      });
    } catch {
      // Terminar sessão localmente tem de funcionar mesmo com a API em baixo.
    }
    clear();
    await navigateTo('/login');
  }

  /** Troca o refresh token por um novo par. Devolve `false` se a sessão morreu. */
  async function refresh(): Promise<boolean> {
    const refreshToken = readToken(REFRESH_KEY);
    if (!refreshToken) return false;

    try {
      const session = await $fetch<AuthSessionDto>('/auth/refresh', {
        baseURL: config.public.apiBase,
        method: 'POST',
        body: { refreshToken },
      });
      persist(session);
      return true;
    } catch {
      clear();
      return false;
    }
  }

  /** Restaura a sessão a partir do token guardado, no arranque da aplicação. */
  async function restore(): Promise<void> {
    if (initialised.value) return;
    initialised.value = true;

    if (!readToken(ACCESS_KEY)) return;

    try {
      user.value = await $fetch<UserSummaryDto>('/auth/me', {
        baseURL: config.public.apiBase,
        headers: { Authorization: `Bearer ${readToken(ACCESS_KEY)}` },
      });
    } catch {
      // Access token expirado: tenta renovar antes de desistir.
      if (await refresh()) {
        try {
          user.value = await $fetch<UserSummaryDto>('/auth/me', {
            baseURL: config.public.apiBase,
            headers: { Authorization: `Bearer ${readToken(ACCESS_KEY)}` },
          });
        } catch {
          clear();
        }
      }
    }
  }

  /** RBAC no cliente. Espelha a hierarquia aplicada pela API. */
  const HIERARCHY: Record<RoleName, number> = { ADMIN: 3, GESTOR: 2, AGENTE: 1 };

  function can(minimumRole: RoleName): boolean {
    if (!user.value) return false;
    return HIERARCHY[user.value.role] >= HIERARCHY[minimumRole];
  }

  return {
    user: readonly(user),
    isAuthenticated: computed(() => user.value !== null),
    accessToken: () => readToken(ACCESS_KEY),
    login,
    logout,
    refresh,
    restore,
    clear,
    can,
  };
}
