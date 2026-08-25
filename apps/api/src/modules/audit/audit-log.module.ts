import { Controller, Get, Module, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AUDIT_ACTIONS, type AuditLogDto } from '@alson/shared';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import { ZodValidationPipe } from '../../shared/presentation/pipes/zod-validation.pipe';
import { normalizePagination, paginate } from '../../shared/application/pagination';
import { Roles } from '../iam/presentation/decorators/roles.decorator';

const auditQuerySchema = z.object({
  entity: z.string().trim().max(60).optional(),
  entityId: z.string().trim().max(60).optional(),
  actorId: z.string().uuid().optional(),
  action: z.enum(AUDIT_ACTIONS).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().optional(),
  perPage: z.coerce.number().int().positive().max(100).optional(),
});
type AuditQuery = z.infer<typeof auditQuerySchema>;

/**
 * Consulta do registo de auditoria.
 *
 * É deliberadamente só de leitura: os registos são escritos pelo
 * `AuditService` e nunca podem ser alterados ou apagados pela API.
 */
@ApiTags('Backoffice · Auditoria')
@ApiBearerAuth()
@Controller('audit-logs')
@Roles('ADMIN')
export class AuditLogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Consultar o registo de auditoria' })
  @ApiResponse({ status: 200, description: 'Lista paginada de alterações registadas.' })
  async list(@Query(new ZodValidationPipe(auditQuerySchema)) query: AuditQuery) {
    const pagination = normalizePagination({ page: query.page, perPage: query.perPage });

    const where = {
      ...(query.entity ? { entity: query.entity } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: query.dateFrom } : {}),
              ...(query.dateTo ? { lte: query.dateTo } : {}),
            },
          }
        : {}),
    };

    const [records, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: { id: true, name: true, email: true, active: true, role: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const items: AuditLogDto[] = records.map((record) => ({
      id: record.id,
      entity: record.entity,
      entityId: record.entityId,
      action: record.action,
      changes: record.changes as AuditLogDto['changes'],
      actor: record.actor
        ? {
            id: record.actor.id,
            name: record.actor.name,
            email: record.actor.email,
            active: record.actor.active,
            role: record.actor.role.name,
          }
        : null,
      ipAddress: record.ipAddress,
      createdAt: record.createdAt.toISOString(),
    }));

    return paginate(items, total, pagination);
  }
}

@Module({ controllers: [AuditLogController] })
export class AuditLogModule {}
