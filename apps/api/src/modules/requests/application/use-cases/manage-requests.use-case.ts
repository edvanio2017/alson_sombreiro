import { Inject, Injectable } from '@nestjs/common';
import {
  PRIORITY_LABELS,
  type PaginatedResult,
  type Priority,
  type RequestDetailDto,
  type RequestListItemDto,
} from '@alson/shared';
import { ForbiddenError, NotFoundError } from '../../../../shared/domain/domain-error';
import {
  normalizePagination,
  paginate,
  type ActorContext,
  type PaginationParams,
} from '../../../../shared/application/pagination';
import { AuditService } from '../../../../shared/infrastructure/audit/audit.service';
import { NotificationService } from '../../../../shared/infrastructure/mail/notification.service';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../iam/domain/repositories/user.repository';
import {
  REQUEST_REPOSITORY,
  type KanbanColumn,
  type RequestFilters,
  type RequestRepository,
  type RequestSort,
} from '../../domain/repositories/request.repository';
import {
  REQUEST_STATUS_REPOSITORY,
  type RequestStatusRepository,
} from '../../domain/repositories/request-status.repository';

/**
 * Operações do Mini CRM sobre um pedido.
 *
 * Todas as alterações de estado, responsável e prioridade escrevem na timeline
 * (`RequestHistory`) com autor e data. É esse registo que sustenta o critério
 * de aceitação da rastreabilidade.
 */
@Injectable()
export class ManageRequestsUseCase {
  constructor(
    @Inject(REQUEST_REPOSITORY) private readonly requests: RequestRepository,
    @Inject(REQUEST_STATUS_REPOSITORY) private readonly statuses: RequestStatusRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
  ) {}

  async list(
    filters: RequestFilters,
    pagination: PaginationParams,
    sort: RequestSort,
  ): Promise<PaginatedResult<RequestListItemDto>> {
    const normalized = normalizePagination(pagination);
    const { items, total } = await this.requests.list(filters, normalized, sort);
    return paginate(items, total, normalized);
  }

  async kanban(filters: RequestFilters, limitPerColumn = 50): Promise<KanbanColumn[]> {
    return this.requests.kanban(filters, limitPerColumn);
  }

  async findById(id: string): Promise<RequestDetailDto> {
    const detail = await this.requests.findDetailById(id);
    if (!detail) throw new NotFoundError('Pedido', id);
    return detail;
  }

  /* ------------------------------ Estado ---------------------------------- */

  async changeStatus(
    id: string,
    statusId: string,
    actor: ActorContext,
    note?: string,
  ): Promise<RequestDetailDto> {
    const request = await this.requests.findById(id);
    if (!request) throw new NotFoundError('Pedido', id);

    const nextStatus = await this.statuses.findById(statusId);
    if (!nextStatus) throw new NotFoundError('Estado', statusId);

    // A entidade valida a transição e actualiza o seu estado interno.
    const { from, to } = request.transitionTo(nextStatus);

    await this.requests.updateStatus(id, to.id, to.isFinal ? new Date() : null);

    await this.requests.appendHistory({
      requestId: id,
      event: 'ESTADO_ALTERADO',
      description: note?.trim()
        ? `Estado alterado de "${from.name}" para "${to.name}". ${note.trim()}`
        : `Estado alterado de "${from.name}" para "${to.name}".`,
      fromValue: from.name,
      toValue: to.name,
      authorId: actor.userId,
    });

    await this.audit.record({
      entity: 'Request',
      entityId: id,
      action: 'UPDATE',
      changes: { status: { from: from.name, to: to.name } },
      actor,
    });

    if (request.shouldNotifyRequester(to)) {
      await this.notifications.sendStatusChanged({
        to: request.requester.email,
        requesterName: request.requester.name,
        reference: request.reference,
        serviceName: request.serviceName,
        fromStatus: from.name,
        toStatus: to.name,
        statusColor: to.color,
        changedAt: new Date(),
      });
    }

    return this.findById(id);
  }

  /* --------------------------- Responsável -------------------------------- */

  async assign(
    id: string,
    assigneeId: string | null,
    actor: ActorContext,
  ): Promise<RequestDetailDto> {
    const request = await this.requests.findById(id);
    if (!request) throw new NotFoundError('Pedido', id);

    let assigneeName = 'Ninguém';
    if (assigneeId) {
      const assignee = await this.users.findById(assigneeId);
      if (!assignee || !assignee.canAuthenticate) {
        throw new NotFoundError('Utilizador', assigneeId);
      }
      assigneeName = assignee.name;
    }

    const previousId = request.assigneeId;
    request.assignTo(assigneeId);

    const previousName = previousId
      ? ((await this.users.findById(previousId))?.name ?? 'Utilizador removido')
      : 'Ninguém';

    await this.requests.updateAssignee(id, assigneeId);

    await this.requests.appendHistory({
      requestId: id,
      event: 'RESPONSAVEL_ALTERADO',
      description: assigneeId
        ? `Pedido atribuído a ${assigneeName}.`
        : 'Atribuição do pedido removida.',
      fromValue: previousName,
      toValue: assigneeName,
      authorId: actor.userId,
    });

    await this.audit.record({
      entity: 'Request',
      entityId: id,
      action: 'UPDATE',
      changes: { assignee: { from: previousName, to: assigneeName } },
      actor,
    });

    return this.findById(id);
  }

  /* --------------------------- Prioridade --------------------------------- */

  async changePriority(
    id: string,
    priority: Priority,
    actor: ActorContext,
  ): Promise<RequestDetailDto> {
    const request = await this.requests.findById(id);
    if (!request) throw new NotFoundError('Pedido', id);

    const { from, to } = request.changePriority(priority);
    await this.requests.updatePriority(id, to);

    await this.requests.appendHistory({
      requestId: id,
      event: 'PRIORIDADE_ALTERADA',
      description: `Prioridade alterada de "${PRIORITY_LABELS[from]}" para "${PRIORITY_LABELS[to]}".`,
      fromValue: PRIORITY_LABELS[from],
      toValue: PRIORITY_LABELS[to],
      authorId: actor.userId,
    });

    await this.audit.record({
      entity: 'Request',
      entityId: id,
      action: 'UPDATE',
      changes: { priority: { from, to } },
      actor,
    });

    return this.findById(id);
  }

  /* ----------------------------- Notas ------------------------------------ */

  async addNote(id: string, body: string, actor: ActorContext): Promise<RequestDetailDto> {
    const request = await this.requests.findById(id);
    if (!request) throw new NotFoundError('Pedido', id);

    const note = await this.requests.addNote(id, actor.userId, body.trim());

    await this.requests.appendHistory({
      requestId: id,
      event: 'NOTA_ADICIONADA',
      description: 'Nota interna adicionada.',
      authorId: actor.userId,
      metadata: { noteId: note.id },
    });

    await this.audit.record({ entity: 'Note', entityId: note.id, action: 'CREATE', actor });

    return this.findById(id);
  }

  async updateNote(
    requestId: string,
    noteId: string,
    body: string,
    actor: ActorContext,
  ): Promise<RequestDetailDto> {
    await this.assertNoteOwnership(noteId, actor);
    await this.requests.updateNote(noteId, body.trim());
    await this.audit.record({ entity: 'Note', entityId: noteId, action: 'UPDATE', actor });
    return this.findById(requestId);
  }

  async deleteNote(
    requestId: string,
    noteId: string,
    actor: ActorContext,
  ): Promise<RequestDetailDto> {
    await this.assertNoteOwnership(noteId, actor);
    await this.requests.deleteNote(noteId);
    await this.audit.record({ entity: 'Note', entityId: noteId, action: 'DELETE', actor });
    return this.findById(requestId);
  }

  /** Só o autor da nota, ou um administrador, a pode alterar ou remover. */
  private async assertNoteOwnership(noteId: string, actor: ActorContext): Promise<void> {
    const note = await this.requests.findNoteAuthor(noteId);
    if (!note) throw new NotFoundError('Nota', noteId);

    if (note.authorId !== actor.userId && actor.role !== 'ADMIN') {
      throw new ForbiddenError('Apenas o autor da nota (ou um administrador) a pode alterar.');
    }
  }
}
