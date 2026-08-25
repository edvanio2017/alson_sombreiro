import { Inject, Injectable } from '@nestjs/common';
import type { RequestStatusDto } from '@alson/shared';
import { BusinessRuleError, NotFoundError } from '../../../../shared/domain/domain-error';
import type { ActorContext } from '../../../../shared/application/pagination';
import { AuditService } from '../../../../shared/infrastructure/audit/audit.service';
import { RequestStatus } from '../../domain/entities/request-status.entity';
import {
  REQUEST_STATUS_REPOSITORY,
  type RequestStatusRepository,
  type RequestStatusWriteData,
} from '../../domain/repositories/request-status.repository';

/**
 * Configuração do pipeline (as colunas do Kanban).
 *
 * Invariantes garantidas aqui:
 *  - existe sempre exactamente um estado inicial;
 *  - o último estado activo não pode ser desactivado;
 *  - estados com pedidos associados não são apagados.
 */
@Injectable()
export class ManageStatusesUseCase {
  constructor(
    @Inject(REQUEST_STATUS_REPOSITORY) private readonly statuses: RequestStatusRepository,
    private readonly audit: AuditService,
  ) {}

  async list(onlyActive = false): Promise<RequestStatusDto[]> {
    const statuses = await this.statuses.list(onlyActive);
    return statuses.map((status) => status.toDto());
  }

  async create(
    input: RequestStatusWriteData & { name: string },
    actor: ActorContext,
  ): Promise<RequestStatusDto> {
    // Valida a definição no domínio antes de persistir.
    RequestStatus.create('novo', {
      key: input.key ?? input.name,
      name: input.name,
      color: input.color ?? '#64748B',
      order: input.order ?? 0,
      isInitial: input.isInitial ?? false,
      isFinal: input.isFinal ?? false,
      notifyRequester: input.notifyRequester ?? false,
      active: input.active ?? true,
    });

    const created = await this.statuses.create(input);

    if (input.isInitial) {
      await this.statuses.clearInitialFlag(created.id);
    }

    await this.audit.record({
      entity: 'RequestStatus',
      entityId: created.id,
      action: 'CREATE',
      changes: { name: { from: null, to: created.name } },
      actor,
    });

    return created.toDto();
  }

  async update(
    id: string,
    input: RequestStatusWriteData,
    actor: ActorContext,
  ): Promise<RequestStatusDto> {
    const existing = await this.statuses.findById(id);
    if (!existing) throw new NotFoundError('Estado', id);

    // Não se retira a marca de inicial sem a passar a outro estado.
    if (input.isInitial === false && existing.isInitial) {
      throw new BusinessRuleError(
        'O pipeline tem de ter um estado inicial. Marque outro estado como inicial em alternativa.',
      );
    }

    if (input.active === false) {
      if (existing.isInitial) {
        throw new BusinessRuleError('O estado inicial do pipeline não pode ser desactivado.');
      }
      const active = await this.statuses.list(true);
      if (active.length <= 1) {
        throw new BusinessRuleError('O pipeline tem de ter pelo menos um estado activo.');
      }
      const pending = await this.statuses.countRequests(id);
      if (pending > 0) {
        throw new BusinessRuleError(
          `Existem ${pending} pedido(s) neste estado. Mova-os antes de o desactivar.`,
        );
      }
    }

    const merged = { ...existing.toDto(), ...input };
    RequestStatus.create(id, {
      key: merged.key,
      name: merged.name,
      color: merged.color,
      order: merged.order,
      isInitial: merged.isInitial,
      isFinal: merged.isFinal,
      notifyRequester: merged.notifyRequester,
      active: merged.active,
    });

    const updated = await this.statuses.update(id, input);

    if (input.isInitial === true) {
      await this.statuses.clearInitialFlag(id);
    }

    const changes = this.audit.diff(existing.toDto(), updated.toDto(), ['id']);
    if (changes) {
      await this.audit.record({
        entity: 'RequestStatus',
        entityId: id,
        action: 'UPDATE',
        changes,
        actor,
      });
    }

    return updated.toDto();
  }

  async remove(id: string, actor: ActorContext): Promise<void> {
    const existing = await this.statuses.findById(id);
    if (!existing) throw new NotFoundError('Estado', id);

    if (existing.isInitial) {
      throw new BusinessRuleError('O estado inicial do pipeline não pode ser removido.');
    }

    const count = await this.statuses.countRequests(id);
    if (count > 0) {
      throw new BusinessRuleError(
        `Não é possível remover "${existing.name}": existem ${count} pedido(s) neste estado.`,
      );
    }

    await this.statuses.delete(id);
    await this.audit.record({ entity: 'RequestStatus', entityId: id, action: 'DELETE', actor });
  }

  async reorder(orderedIds: string[], actor: ActorContext): Promise<RequestStatusDto[]> {
    const all = await this.statuses.list(false);
    const known = new Set(all.map((status) => status.id));

    const unknown = orderedIds.filter((id) => !known.has(id));
    if (unknown.length > 0) throw new NotFoundError('Estado', unknown.join(', '));
    if (orderedIds.length !== known.size) {
      throw new BusinessRuleError('A reordenação tem de incluir todos os estados.');
    }

    await this.statuses.reorder(orderedIds);
    await this.audit.record({
      entity: 'RequestStatus',
      entityId: 'pipeline',
      action: 'UPDATE',
      changes: { order: { from: all.map((s) => s.id), to: orderedIds } },
      actor,
    });

    return this.list(false);
  }
}
