import type {
  AttachmentDto,
  DashboardMetricsDto,
  FieldType,
  HistoryEvent,
  Priority,
  RequestDetailDto,
  RequestListItemDto,
} from '@alson/shared';
import type { NormalizedPagination } from '../../../../shared/application/pagination';
import type { Request } from '../entities/request.entity';

export const REQUEST_REPOSITORY = Symbol('REQUEST_REPOSITORY');

export interface RequestFilters {
  search?: string;
  serviceId?: string;
  statusId?: string;
  assigneeId?: string | 'unassigned';
  priority?: Priority;
  dateFrom?: Date;
  dateTo?: Date;
  /** `true` esconde os pedidos em estados finais. */
  openOnly?: boolean;
}

export type RequestSortField = 'createdAt' | 'updatedAt' | 'priority' | 'reference';

export interface RequestSort {
  field: RequestSortField;
  direction: 'asc' | 'desc';
}

export interface SubmittedFieldValue {
  fieldId: string | null;
  fieldKey: string;
  label: string;
  type: FieldType;
  value: unknown;
  displayValue: string;
  order: number;
}

export interface AttachmentToPersist {
  fieldKey: string | null;
  originalName: string;
  storedName: string;
  path: string;
  mimeType: string;
  size: number;
  checksum: string;
  uploadedById?: string | null;
}

export interface CreateRequestData {
  reference: string;
  serviceId: string;
  statusId: string;
  priority: Priority;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string | null;
  sourceIp: string | null;
  sourceAgent: string | null;
  values: SubmittedFieldValue[];
  attachments: AttachmentToPersist[];
}

export interface HistoryEntryData {
  requestId: string;
  event: HistoryEvent;
  description: string;
  fromValue?: string | null;
  toValue?: string | null;
  authorId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface KanbanColumn {
  status: { id: string; key: string; name: string; color: string; order: number };
  total: number;
  items: RequestListItemDto[];
}

export interface RequestRepository {
  /** Gera a próxima referência do ano de forma atómica. */
  nextReference(year: number): Promise<string>;

  create(data: CreateRequestData): Promise<RequestDetailDto>;
  findById(id: string): Promise<Request | null>;
  findDetailById(id: string): Promise<RequestDetailDto | null>;
  /** Consulta pública: exige referência + e-mail do requerente. */
  findByReferenceAndEmail(reference: string, email: string): Promise<RequestDetailDto | null>;

  list(
    filters: RequestFilters,
    pagination: NormalizedPagination,
    sort: RequestSort,
  ): Promise<{ items: RequestListItemDto[]; total: number }>;

  /** Kanban: uma coluna por estado activo, com os pedidos mais recentes. */
  kanban(filters: RequestFilters, limitPerColumn: number): Promise<KanbanColumn[]>;

  updateStatus(id: string, statusId: string, closedAt: Date | null): Promise<void>;
  updateAssignee(id: string, assigneeId: string | null): Promise<void>;
  updatePriority(id: string, priority: Priority): Promise<void>;

  appendHistory(data: HistoryEntryData): Promise<void>;

  addNote(requestId: string, authorId: string, body: string): Promise<{ id: string }>;
  updateNote(noteId: string, body: string): Promise<{ authorId: string | null }>;
  deleteNote(noteId: string): Promise<{ authorId: string | null }>;
  /** `null` quando a nota não existe; caso contrário o autor (que pode ser nulo). */
  findNoteAuthor(noteId: string): Promise<{ authorId: string | null } | null>;

  addAttachments(
    requestId: string,
    attachments: AttachmentToPersist[],
  ): Promise<AttachmentDto[]>;
  findAttachment(
    attachmentId: string,
  ): Promise<{ id: string; requestId: string; path: string; originalName: string; mimeType: string } | null>;
  softDeleteAttachment(attachmentId: string): Promise<void>;

  metrics(filters: { dateFrom?: Date; dateTo?: Date }): Promise<DashboardMetricsDto>;
}
