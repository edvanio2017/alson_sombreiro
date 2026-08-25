/**
 * Tema do cabeçalho.
 *
 * Nas páginas que abrem com um hero escuro a passar por baixo do cabeçalho
 * fixo, este tem de aparecer em versão clara (logótipo e links brancos)
 * enquanto está sobreposto ao hero; ao fazer scroll ganha fundo branco e volta
 * à versão escura.
 *
 * A informação vive em `route.meta`, declarada pela própria página com
 * `definePageMeta({ heroUnderHeader: true })`. A alternativa, estado
 * partilhado escrito no `setup` da página, dependia de o cabeçalho ser
 * renderizado depois da página, o que não é garantido nem em SSR nem na
 * hidratação, e produzia o logótipo branco sobre fundo branco.
 */
export function useHeaderOverDark() {
  const route = useRoute();
  return computed(() => route.meta.heroUnderHeader === true);
}
