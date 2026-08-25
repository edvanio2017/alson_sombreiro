import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  formatReference,
  type AttachmentDto,
  type DashboardMetricsDto,
  type NoteDto,
  type Priority,
  type RequestDetailDto,
  type RequestHistoryDto,
  type RequestListItemDto,
  type UserSummaryDto,
} from '@alson/shared';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { NotFoundError } from '../../../shared/domain/domain-error';
import type { NormalizedPagination } from '../../../shared/application/pagination';
import { Request } from '../domain/entities/request.entity';
import { RequestStatus } from '../domain/entities/request-status.entity';
import type {
  AttachmentToPersist,
  CreateRequestData,
  HistoryEntryData,
  KanbanColumn,
  RequestFilters,
  RequestRepository,
  RequestSort,
} from '../domain/repositories/request.repository';

/** Selecções reutilizadas, para manter as consultas consistentes. */
const userSelect = {
  id: true,
  name: true,
  email: true,
  active: true,
  role: { select: { name: true } },
} satisfies Prisma.UserSelect;

const listInclude = {
  service: { select: { id: true, name: true, slug: true } },
  status: true,
  assignee: { select: userSelect },
} satisfies Prisma.RequestInclude;

type ListRecord = Prisma.RequestGetPayload<{ include: typeof listInclude }>;

@Injectable()
export class PrismaRequestRepository implements RequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  /* ------------------------------ Mapeadores ------------------------------ */

  private toUserDto(
    user: { id: string; name: string; email: string; active: boolean; role: { name: string } } | null,
  ): UserSummaryDto | null {
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      active: user.active,
      role: user.role.name as UserSummaryDto['role'],
    };
  }

  private toListItem(record: ListRecord): RequestListItemDto {
    return {
      id: record.id,
      reference: record.reference,
      requesterName: record.requesterName,
      requesterEmail: record.requesterEmail,
      requesterPhone: record.requesterPhone,
      service: record.service,
      status: {
        id: record.status.id,
        key: record.status.key,
        name: record.status.name,
        color: record.status.color,
        order: record.status.order,
        isInitial: record.status.isInitial,
        isFinal: record.status.isFinal,
        notifyRequester: record.status.notifyRequester,
        active: record.status.active,
      },
      priority: record.priority,
      assignee: this.toUserDto(record.assignee),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  /* ------------------------------ Referência ------------------------------ */

  /**
   * Gera a referência do ano de forma atómica.
   *
   * O `UPDATE ... RETURNING` incrementa e lê numa única instrução, pelo que
   * duas submissões simultâneas nunca recebem o mesmo número.
   */
  async nextReference(year: number): Promise<string> {
    const rows = await this.prisma.$queryRaw<Array<{ sequence: number }>>`
      INSERT INTO reference_counters (year, sequence, updated_at)
      VALUES (${year}, 1, NOW())
      ON CONFLICT (year)
      DO UPDATE SET sequence = reference_counters.sequence + 1, updated_at = NOW()
      RETURNING sequence;
    `;

    return formatReference(year, rows[0].sequence);
  }

  /* -------------------------------- Escrita ------------------------------- */

  async create(data: CreateRequestData): Promise<RequestDetailDto> {
    const created = await this.prisma.$transaction(async (tx) => {
      const request = await tx.request.create({
        data: {
          reference: data.reference,
          serviceId: data.serviceId,
          statusId: data.statusId,
          priority: data.priority,
          requesterName: data.requesterName,
          requesterEmail: data.requesterEmail,
          requesterPhone: data.requesterPhone,
          sourceIp: data.sourceIp,
          sourceAgent: data.sourceAgent,
          values: {
            create: data.values.map((value) => ({
              fieldId: value.fieldId,
              fieldKey: value.fieldKey,
              label: value.label,
              type: value.type,
              value: (value.value ?? null) as Prisma.InputJsonValue,
              displayValue: value.displayValue,
              order: value.order,
            })),
          },
          attachments: {
            create: data.attachments.map((attachment) => ({
              fieldKey: attachment.fieldKey,
              originalName: attachment.originalName,
              storedName: attachment.storedName,
              path: attachment.path,
              mimeType: attachment.mimeType,
              size: attachment.size,
              checksum: attachment.checksum,
              uploadedById: attachment.uploadedById ?? null,
            })),
          },
        },
        select: { id: true },
      });

      return request.id;
    });

    const detail = await this.findDetailById(created);
    if (!detail) throw new NotFoundError('Pedido', created);
    return detail;
  }

  /* -------------------------------- Leitura ------------------------------- */

  async findById(id: string): Promise<Request | null> {
    const record = await this.prisma.request.findUnique({
      where: { id },
      include: { status: true, service: { select: { name: true } } },
    });
    if (!record) return null;

    return Request.create(record.id, {
      reference: record.reference,
      serviceId: record.serviceId,
      serviceName: record.service.name,
      status: RequestStatus.create(record.status.id, {
        key: record.status.key,
        name: record.status.name,
        color: record.status.color,
        order: record.status.order,
        isInitial: record.status.isInitial,
        isFinal: record.status.isFinal,
        notifyRequester: record.status.notifyRequester,
        active: record.status.active,
      }),
      assigneeId: record.assigneeId,
      priority: record.priority,
      requester: {
        name: record.requesterName,
        email: record.requesterEmail,
        phone: record.requesterPhone,
      },
      closedAt: record.closedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  async findDetailById(id: string): Promise<RequestDetailDto | null> {
    const record = await this.prisma.request.findUnique({
      where: { id },
      include: {
        ...listInclude,
        values: { orderBy: { order: 'asc' } },
        attachments: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
        history: {
          orderBy: { createdAt: 'desc' },
          include: { author: { select: userSelect } },
        },
        notes: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          include: { author: { select: userSelect } },
        },
      },
    });

    if (!record) return null;

    const attachments: AttachmentDto[] = record.attachments.map((attachment) => ({
      id: attachment.id,
      fieldKey: attachment.fieldKey,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      size: attachment.size,
      downloadUrl: `/requests/${record.id}/attachments/${attachment.id}`,
      uploadedAt: attachment.createdAt.toISOString(),
    }));

    const history: RequestHistoryDto[] = record.history.map((entry) => ({
      id: entry.id,
      event: entry.event,
      description: entry.description,
      fromValue: entry.fromValue,
      toValue: entry.toValue,
      author: this.toUserDto(entry.author),
      createdAt: entry.createdAt.toISOString(),
    }));

    const notes: NoteDto[] = record.notes.map((note) => ({
      id: note.id,
      body: note.body,
      author: this.toUserDto(note.author),
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    }));

    return {
      ...this.toListItem(record),
      values: record.values.map((value) => ({
        fieldKey: value.fieldKey,
        label: value.label,
        type: value.type,
        value: value.value as RequestDetailDto['values'][number]['value'],
        displayValue: value.displayValue,
      })),
      attachments,
      history,
      notes,
    };
  }

  async findByReferenceAndEmail(
    reference: string,
    email: string,
  ): Promise<RequestDetailDto | null> {
    const record = await this.prisma.request.findFirst({
      where: { reference, requesterEmail: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });
    return record ? this.findDetailById(record.id) : null;
  }

  /* -------------------------------- Filtros ------------------------------- */

  private buildWhere(filters: RequestFilters): Prisma.RequestWhereInput {
    const where: Prisma.RequestWhereInput = {};

    if (filters.serviceId) where.serviceId = filters.serviceId;
    if (filters.statusId) where.statusId = filters.statusId;
    if (filters.priority) where.priority = filters.priority;

    if (filters.assigneeId === 'unassigned') {
      where.assigneeId = null;
    } else if (filters.assigneeId) {
      where.assigneeId = filters.assigneeId;
    }

    if (filters.openOnly) {
      where.status = { isFinal: false };
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lte: filters.dateTo } : {}),
      };
    }

    if (filters.search) {
      const search = filters.search.trim();
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { requesterName: { contains: search, mode: 'insensitive' } },
        { requesterEmail: { contains: search, mode: 'insensitive' } },
        { requesterPhone: { contains: search, mode: 'insensitive' } },
        // Pesquisa também dentro das respostas do formulário.
        { values: { some: { displayValue: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    return where;
  }

  async list(
    filters: RequestFilters,
    pagination: NormalizedPagination,
    sort: RequestSort,
  ): Promise<{ items: RequestListItemDto[]; total: number }> {
    const where = this.buildWhere(filters);

    const [records, total] = await this.prisma.$transaction([
      this.prisma.request.findMany({
        where,
        include: listInclude,
        orderBy: { [sort.field]: sort.direction },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.request.count({ where }),
    ]);

    return { items: records.map((record) => this.toListItem(record)), total };
  }

  async kanban(filters: RequestFilters, limitPerColumn: number): Promise<KanbanColumn[]> {
    const statuses = await this.prisma.requestStatus.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    });

    // O filtro de estado não se aplica ao Kanban: as colunas são os estados.
    const baseWhere = this.buildWhere({ ...filters, statusId: undefined });

    const columns = await Promise.all(
      statuses.map(async (status) => {
        const where: Prisma.RequestWhereInput = { ...baseWhere, statusId: status.id };

        const [records, total] = await this.prisma.$transaction([
          this.prisma.request.findMany({
            where,
            include: listInclude,
            orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
            take: limitPerColumn,
          }),
          this.prisma.request.count({ where }),
        ]);

        return {
          status: {
            id: status.id,
            key: status.key,
            name: status.name,
            color: status.color,
            order: status.order,
          },
          total,
          items: records.map((record) => this.toListItem(record)),
        };
      }),
    );

    return columns;
  }

  /* ------------------------------ Actualizações --------------------------- */

  async updateStatus(id: string, statusId: string, closedAt: Date | null): Promise<void> {
    await this.prisma.request.update({ where: { id }, data: { statusId, closedAt } });
  }

  async updateAssignee(id: string, assigneeId: string | null): Promise<void> {
    await this.prisma.request.update({ where: { id }, data: { assigneeId } });
  }

  async updatePriority(id: string, priority: Priority): Promise<void> {
    await this.prisma.request.update({ where: { id }, data: { priority } });
  }

  async appendHistory(data: HistoryEntryData): Promise<void> {
    await this.prisma.requestHistory.create({
      data: {
        requestId: data.requestId,
        event: data.event,
        description: data.description,
        fromValue: data.fromValue ?? null,
        toValue: data.toValue ?? null,
        authorId: data.authorId ?? null,
        metadata: (data.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  /* --------------------------------- Notas -------------------------------- */

  async addNote(requestId: string, authorId: string, body: string): Promise<{ id: string }> {
    return this.prisma.note.create({
      data: { requestId, authorId, body },
      select: { id: true },
    });
  }

  async updateNote(noteId: string, body: string): Promise<{ authorId: string | null }> {
    return this.prisma.note.update({
      where: { id: noteId },
      data: { body },
      select: { authorId: true },
    });
  }

  async deleteNote(noteId: string): Promise<{ authorId: string | null }> {
    return this.prisma.note.update({
      where: { id: noteId },
      data: { deletedAt: new Date() },
      select: { authorId: true },
    });
  }

  async findNoteAuthor(noteId: string): Promise<{ authorId: string | null } | null> {
    // Devolver o registo (e não só o id) distingue "nota inexistente" de
    // "nota cujo autor já foi removido".
    return this.prisma.note.findFirst({
      where: { id: noteId, deletedAt: null },
      select: { authorId: true },
    });
  }

  /* -------------------------------- Anexos -------------------------------- */

  async addAttachments(
    requestId: string,
    attachments: AttachmentToPersist[],
  ): Promise<AttachmentDto[]> {
    const created = await this.prisma.$transaction(
      attachments.map((attachment) =>
        this.prisma.attachment.create({
          data: {
            requestId,
            fieldKey: attachment.fieldKey,
            originalName: attachment.originalName,
            storedName: attachment.storedName,
            path: attachment.path,
            mimeType: attachment.mimeType,
            size: attachment.size,
            checksum: attachment.checksum,
            uploadedById: attachment.uploadedById ?? null,
          },
        }),
      ),
    );

    return created.map((attachment) => ({
      id: attachment.id,
      fieldKey: attachment.fieldKey,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      size: attachment.size,
      downloadUrl: `/requests/${requestId}/attachments/${attachment.id}`,
      uploadedAt: attachment.createdAt.toISOString(),
    }));
  }

  async findAttachment(attachmentId: string) {
    return this.prisma.attachment.findFirst({
      where: { id: attachmentId, deletedAt: null },
      select: { id: true, requestId: true, path: true, originalName: true, mimeType: true },
    });
  }

  async softDeleteAttachment(attachmentId: string): Promise<void> {
    await this.prisma.attachment.update({
      where: { id: attachmentId },
      data: { deletedAt: new Date() },
    });
  }

  /* ------------------------------ Indicadores ----------------------------- */

  async metrics(filters: { dateFrom?: Date; dateTo?: Date }): Promise<DashboardMetricsDto> {
    const where: Prisma.RequestWhereInput =
      filters.dateFrom || filters.dateTo
        ? {
            createdAt: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lte: filters.dateTo } : {}),
            },
          }
        : {};

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);

    const [total, abertos, concluidos, novos30Dias, byStatus, byService, byAssignee, closed] =
      await this.prisma.$transaction([
        this.prisma.request.count({ where }),
        this.prisma.request.count({ where: { ...where, status: { isFinal: false } } }),
        this.prisma.request.count({ where: { ...where, status: { isFinal: true } } }),
        this.prisma.request.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        this.prisma.request.groupBy({ by: ['statusId'], where, _count: true, orderBy: { statusId: 'asc' } }),
        this.prisma.request.groupBy({ by: ['serviceId'], where, _count: true, orderBy: { serviceId: 'asc' } }),
        this.prisma.request.groupBy({ by: ['assigneeId'], where, _count: true, orderBy: { assigneeId: 'asc' } }),
        this.prisma.request.findMany({
          where: { ...where, closedAt: { not: null } },
          select: { createdAt: true, closedAt: true },
        }),
      ]);

    const [statuses, services, users] = await Promise.all([
      this.prisma.requestStatus.findMany({ orderBy: { order: 'asc' } }),
      this.prisma.service.findMany({ select: { id: true, name: true, slug: true } }),
      this.prisma.user.findMany({ select: { id: true, name: true } }),
    ]);

    // `_count: true` devolve um número; o Number() estreita o tipo genérico do Prisma.
    const statusCounts = new Map(byStatus.map((row) => [row.statusId, Number(row._count)]));
    const serviceCounts = new Map(byService.map((row) => [row.serviceId, Number(row._count)]));

    // Evolução mensal dos últimos 12 meses.
    const porPeriodo = await this.prisma.$queryRaw<Array<{ periodo: string; total: bigint }>>`
      SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS periodo,
             COUNT(*)::bigint AS total
      FROM requests
      WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '11 months'
      GROUP BY 1
      ORDER BY 1 ASC;
    `;

    const tempoMedio =
      closed.length > 0
        ? closed.reduce(
            (sum, row) =>
              sum + (row.closedAt!.getTime() - row.createdAt.getTime()) / 86_400_000,
            0,
          ) / closed.length
        : null;

    return {
      totals: {
        total,
        abertos,
        concluidos,
        novos30Dias,
        tempoMedioResolucaoDias: tempoMedio === null ? null : Math.round(tempoMedio * 10) / 10,
      },
      porEstado: statuses.map((status) => ({
        statusId: status.id,
        key: status.key,
        name: status.name,
        color: status.color,
        total: statusCounts.get(status.id) ?? 0,
      })),
      porServico: services
        .map((service) => ({
          serviceId: service.id,
          name: service.name,
          slug: service.slug,
          total: serviceCounts.get(service.id) ?? 0,
        }))
        .sort((a, b) => b.total - a.total),
      porPeriodo: porPeriodo.map((row) => ({ periodo: row.periodo, total: Number(row.total) })),
      porResponsavel: byAssignee
        .map((row) => ({
          userId: row.assigneeId,
          name: row.assigneeId
            ? (users.find((user) => user.id === row.assigneeId)?.name ?? 'Utilizador removido')
            : 'Sem responsável',
          total: Number(row._count),
        }))
        .sort((a, b) => b.total - a.total),
    };
  }
}
