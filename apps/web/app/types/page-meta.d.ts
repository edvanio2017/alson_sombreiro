/**
 * Metadados de página próprios do projecto.
 *
 * `heroUnderHeader` marca as páginas cujo hero escuro passa por baixo do
 * cabeçalho fixo. Ver `useHeaderOverDark()`.
 */
declare module '#app' {
  interface PageMeta {
    heroUnderHeader?: boolean;
  }
}

export {};
