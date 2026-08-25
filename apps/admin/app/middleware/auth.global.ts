/**
 * Protege todas as rotas do backoffice.
 *
 * A sessão é restaurada uma única vez, antes da primeira navegação, para que um
 * refresh de página não atire o utilizador para o ecrã de login.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // A aplicação é SPA; não há execução relevante no servidor.
  if (import.meta.server) return;

  const auth = useAuth();
  await auth.restore();

  const isLoginPage = to.path === '/login';

  if (!auth.isAuthenticated.value && !isLoginPage) {
    // Guarda o destino para regressar a ele após a autenticação.
    return navigateTo({ path: '/login', query: to.fullPath !== '/' ? { destino: to.fullPath } : {} });
  }

  if (auth.isAuthenticated.value && isLoginPage) {
    return navigateTo('/');
  }
});
