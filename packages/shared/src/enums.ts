/**
 * Tipos de campo suportados pelo construtor de formulários do backoffice.
 * Este enumerado é a fonte única de verdade: a API valida contra ele,
 * o construtor do backoffice oferece exactamente estas opções e o site
 * público sabe renderizar cada uma delas.
 */
export const FIELD_TYPES = [
  'TEXT',
  'TEXTAREA',
  'NUMBER',
  'DATE',
  'EMAIL',
  'PHONE',
  'SELECT',
  'MULTISELECT',
  'CHECKBOX',
  'FILE',
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

/** Tipos que exigem uma lista de opções configurada. */
export const CHOICE_FIELD_TYPES: readonly FieldType[] = ['SELECT', 'MULTISELECT'];

/** Tipos cujo valor submetido é uma colecção. */
export const MULTI_VALUE_FIELD_TYPES: readonly FieldType[] = ['MULTISELECT', 'FILE'];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  TEXT: 'Texto',
  TEXTAREA: 'Texto longo',
  NUMBER: 'Número',
  DATE: 'Data',
  EMAIL: 'E-mail',
  PHONE: 'Telefone',
  SELECT: 'Lista de selecção',
  MULTISELECT: 'Selecção múltipla',
  CHECKBOX: 'Caixa de confirmação',
  FILE: 'Upload de ficheiro',
};

/** Perfis de acesso (RBAC). */
export const ROLES = ['ADMIN', 'GESTOR', 'AGENTE'] as const;
export type RoleName = (typeof ROLES)[number];

export const ROLE_LABELS: Record<RoleName, string> = {
  ADMIN: 'Administrador',
  GESTOR: 'Gestor',
  AGENTE: 'Agente',
};

/** Prioridade atribuível a um pedido no Mini CRM. */
export const PRIORITIES = ['BAIXA', 'NORMAL', 'ALTA', 'URGENTE'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<Priority, string> = {
  BAIXA: 'Baixa',
  NORMAL: 'Normal',
  ALTA: 'Alta',
  URGENTE: 'Urgente',
};

/** Categorias de evento registadas na timeline de um pedido. */
export const HISTORY_EVENTS = [
  'CRIADO',
  'ESTADO_ALTERADO',
  'RESPONSAVEL_ALTERADO',
  'PRIORIDADE_ALTERADA',
  'NOTA_ADICIONADA',
  'ANEXO_ADICIONADO',
  'ANEXO_REMOVIDO',
  'DADOS_ALTERADOS',
] as const;
export type HistoryEvent = (typeof HISTORY_EVENTS)[number];

export const HISTORY_EVENT_LABELS: Record<HistoryEvent, string> = {
  CRIADO: 'Pedido criado',
  ESTADO_ALTERADO: 'Estado alterado',
  RESPONSAVEL_ALTERADO: 'Responsável alterado',
  PRIORIDADE_ALTERADA: 'Prioridade alterada',
  NOTA_ADICIONADA: 'Nota interna adicionada',
  ANEXO_ADICIONADO: 'Anexo adicionado',
  ANEXO_REMOVIDO: 'Anexo removido',
  DADOS_ALTERADOS: 'Dados do pedido alterados',
};

/** Acções auditáveis registadas no AuditLog. */
export const AUDIT_ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];
