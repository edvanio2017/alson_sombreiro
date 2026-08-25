import { Injectable, Logger } from '@nestjs/common';
import type { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ActorContext } from '../../application/pagination';

export interface AuditEntry {
  entity: string;
  entityId: string;
  action: AuditAction;
  changes?: Record<string, { from: unknown; to: unknown }> | null;
  actor?: ActorContext | null;
}

/**
 * Serviço de auditoria transversal.
 *
 * Registar auditoria nunca deve fazer falhar a operação de negócio: qualquer
 * erro é apenas registado no log da aplicação.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    try {
      await client.auditLog.create({
        data: {
          entity: entry.entity,
          entityId: entry.entityId,
          action: entry.action,
          changes: (entry.changes ?? undefined) as Prisma.InputJsonValue | undefined,
          actorId: entry.actor?.userId ?? null,
          ipAddress: entry.actor?.ipAddress ?? null,
          userAgent: entry.actor?.userAgent ?? null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Falha ao registar auditoria de ${entry.entity}#${entry.entityId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Calcula o diff entre dois estados, ignorando campos não auditáveis.
   * Devolve `null` quando nada mudou, evitando ruído na auditoria.
   */
  diff(
    before: object,
    after: object,
    ignore: string[] = ['updatedAt', 'createdAt', 'passwordHash'],
  ): Record<string, { from: unknown; to: unknown }> | null {
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    const previous = before as Record<string, unknown>;

    for (const [key, nextValue] of Object.entries(after)) {
      if (ignore.includes(key) || nextValue === undefined) continue;
      const previousValue = previous[key];
      if (JSON.stringify(previousValue) === JSON.stringify(nextValue)) continue;
      changes[key] = { from: previousValue ?? null, to: nextValue ?? null };
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }
}
