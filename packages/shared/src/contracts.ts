import type { AuditAction, FieldType, HistoryEvent, Priority, RoleName } from './enums.js';

/* -------------------------------------------------------------------------- */
/*  Regras de validação por campo (guardadas em JSON na coluna `validation`)   */
/* -------------------------------------------------------------------------- */

export interface FieldValidationRules {
  /** Comprimento mínimo (texto) ou valor mínimo (número). */
  min?: number | null;
  /** Comprimento máximo (texto) ou valor máximo (número). */
  max?: number | null;
  /** Expressão regular aplicada a campos de texto. */
  pattern?: string | null;
  /** Mensagem apresentada quando `pattern` falha. */
  patternMessage?: string | null;
  /** Data mínima (ISO `YYYY-MM-DD`) para campos de data. */
  minDate?: string | null;
  /** Data máxima (ISO `YYYY-MM-DD`) para campos de data. */
  maxDate?: string | null;
  /** Nº mínimo de opções/ficheiros seleccionados. */
  minItems?: number | null;
  /** Nº máximo de opções/ficheiros seleccionados. */
  maxItems?: number | null;
  /** Extensões aceites em campos de ficheiro, ex.: `['pdf','png']`. */
  acceptedExtensions?: string[] | null;
  /** Mime types aceites em campos de ficheiro. */
  acceptedMimeTypes?: string[] | null;
  /** Tamanho máximo por ficheiro, em bytes. */
  maxFileSize?: number | null;
  /** Nº de casas decimais permitidas num campo numérico (0 = inteiro). */
  decimals?: number | null;
}

export interface FieldOption {
  label: string;
  value: string;
}

/* -------------------------------------------------------------------------- */
/*  Formulário dinâmico                                                       */
/* -------------------------------------------------------------------------- */

export interface FormFieldDto {
  id: string;
  /** Chave técnica única dentro do serviço, ex.: `numero_bi`. */
  key: string;
  label: string;
  type: FieldType;
  placeholder: string | null;
  helpText: string | null;
  required: boolean;
  order: number;
  /** Largura no grid do formulário: 1 = meia coluna, 2 = coluna inteira. */
  width: 1 | 2;
  options: FieldOption[];
  validation: FieldValidationRules;
  active: boolean;
}

export interface ServiceSummaryDto {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  icon: string | null;
  coverImage: string | null;
  featured: boolean;
  order: number;
  active: boolean;
}

export interface ServiceDetailDto extends ServiceSummaryDto {
  description: string;
  benefits: string[];
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  /** Campos activos ordenados. O site público renderiza a partir daqui. */
  fields: FormFieldDto[];
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/*  Pedidos                                                                   */
/* -------------------------------------------------------------------------- */

export interface RequestStatusDto {
  id: string;
  key: string;
  name: string;
  /** Cor hexadecimal usada nos badges e nas colunas do Kanban. */
  color: string;
  order: number;
  /** Estado atribuído automaticamente a novos pedidos. */
  isInitial: boolean;
  /** Estado terminal (Concluído / Cancelado). */
  isFinal: boolean;
  /** Dispara e-mail ao requerente quando o pedido entra neste estado. */
  notifyRequester: boolean;
  active: boolean;
}

export interface AttachmentDto {
  id: string;
  fieldKey: string | null;
  originalName: string;
  mimeType: string;
  size: number;
  downloadUrl: string;
  uploadedAt: string;
}

export interface RequestFieldValueDto {
  fieldKey: string;
  label: string;
  type: FieldType;
  /** Valor normalizado tal como submetido. */
  value: string | number | boolean | string[] | null;
  /** Representação legível para listagens e e-mails. */
  displayValue: string;
}

export interface UserSummaryDto {
  id: string;
  name: string;
  email: string;
  role: RoleName;
  active: boolean;
}

export interface RequestListItemDto {
  id: string;
  reference: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string | null;
  service: Pick<ServiceSummaryDto, 'id' | 'name' | 'slug'>;
  status: RequestStatusDto;
  priority: Priority;
  assignee: UserSummaryDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface RequestHistoryDto {
  id: string;
  event: HistoryEvent;
  description: string;
  fromValue: string | null;
  toValue: string | null;
  author: UserSummaryDto | null;
  createdAt: string;
}

export interface NoteDto {
  id: string;
  body: string;
  author: UserSummaryDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface RequestDetailDto extends RequestListItemDto {
  values: RequestFieldValueDto[];
  attachments: AttachmentDto[];
  history: RequestHistoryDto[];
  notes: NoteDto[];
}

/* -------------------------------------------------------------------------- */
/*  Autenticação                                                              */
/* -------------------------------------------------------------------------- */

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthSessionDto extends AuthTokensDto {
  user: UserSummaryDto;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: RoleName;
  /** Identificador da sessão de refresh, que permite revogação. */
  sid?: string;
}

/* -------------------------------------------------------------------------- */
/*  Dashboard                                                                 */
/* -------------------------------------------------------------------------- */

export interface DashboardMetricsDto {
  totals: {
    total: number;
    abertos: number;
    concluidos: number;
    /** Pedidos criados nos últimos 30 dias. */
    novos30Dias: number;
    /** Tempo médio de resolução em dias. */
    tempoMedioResolucaoDias: number | null;
  };
  porEstado: Array<{ statusId: string; key: string; name: string; color: string; total: number }>;
  porServico: Array<{ serviceId: string; name: string; slug: string; total: number }>;
  porPeriodo: Array<{ periodo: string; total: number }>;
  porResponsavel: Array<{ userId: string | null; name: string; total: number }>;
}

/* -------------------------------------------------------------------------- */
/*  Utilitários de API                                                        */
/* -------------------------------------------------------------------------- */

export interface PaginatedResult<T> {
  items: T[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  /** Erros de validação indexados pela chave do campo. */
  details?: Record<string, string[]>;
  timestamp: string;
  path: string;
}

export interface AuditLogDto {
  id: string;
  entity: string;
  entityId: string;
  action: AuditAction;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  actor: UserSummaryDto | null;
  ipAddress: string | null;
  createdAt: string;
}
