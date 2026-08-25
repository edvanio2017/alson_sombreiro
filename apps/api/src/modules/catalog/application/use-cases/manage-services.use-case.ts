import { Inject, Injectable } from '@nestjs/common';
import { slugify, type PaginatedResult, type ServiceDetailDto, type ServiceSummaryDto } from '@alson/shared';
import { BusinessRuleError, ConflictError, NotFoundError } from '../../../../shared/domain/domain-error';
import {
  normalizePagination,
  paginate,
  type ActorContext,
  type PaginationParams,
} from '../../../../shared/application/pagination';
import { AuditService } from '../../../../shared/infrastructure/audit/audit.service';
import {
  SERVICE_REPOSITORY,
  type ServiceFilters,
  type ServiceRepository,
  type ServiceWriteData,
} from '../../domain/repositories/service.repository';

export interface CreateServiceInput extends ServiceWriteData {
  name: string;
  shortDescription: string;
}

/** CRUD de serviços do backoffice. */
@Injectable()
export class ManageServicesUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY) private readonly services: ServiceRepository,
    private readonly audit: AuditService,
  ) {}

  async list(
    filters: ServiceFilters,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<ServiceSummaryDto & { fieldCount: number }>> {
    const normalized = normalizePagination(pagination);
    const { items, total } = await this.services.list(filters, normalized);

    return paginate(
      items.map((service) => ({
        ...service.toSummaryDto(),
        fieldCount: service.publicFields.length,
      })),
      total,
      normalized,
    );
  }

  async findById(id: string): Promise<ServiceDetailDto> {
    const service = await this.services.findById(id, true);
    if (!service) throw new NotFoundError('Serviço', id);
    // O backoffice vê também os campos desactivados.
    return service.toDetailDto(false);
  }

  async create(input: CreateServiceInput, actor: ActorContext): Promise<ServiceDetailDto> {
    const slug = await this.resolveSlug(input.slug || input.name);

    const service = await this.services.create({
      ...input,
      slug,
      name: input.name.trim(),
      // Um serviço nasce despublicado: só se publica depois de ter formulário.
      active: false,
    });

    await this.audit.record({
      entity: 'Service',
      entityId: service.id,
      action: 'CREATE',
      changes: { name: { from: null, to: service.name }, slug: { from: null, to: service.slug } },
      actor,
    });

    return service.toDetailDto(false);
  }

  async update(
    id: string,
    input: ServiceWriteData,
    actor: ActorContext,
  ): Promise<ServiceDetailDto> {
    const existing = await this.services.findById(id, true);
    if (!existing) throw new NotFoundError('Serviço', id);

    // Publicar exige formulário definido.
    if (input.active === true) {
      existing.assertPublishable();
    }

    const slug =
      input.slug !== undefined && slugify(input.slug) !== existing.slug
        ? await this.resolveSlug(input.slug, id)
        : undefined;

    const updated = await this.services.update(id, { ...input, ...(slug ? { slug } : {}) });

    const changes = this.audit.diff(
      existing.toDetailDto(false),
      updated.toDetailDto(false),
      ['updatedAt', 'createdAt', 'fields', 'id'],
    );

    if (changes) {
      await this.audit.record({ entity: 'Service', entityId: id, action: 'UPDATE', changes, actor });
    }

    return updated.toDetailDto(false);
  }

  async remove(id: string, actor: ActorContext): Promise<void> {
    const service = await this.services.findById(id, true);
    if (!service) throw new NotFoundError('Serviço', id);

    // Serviços com pedidos associados nunca são apagados, apenas despublicados,
    // para que o histórico dos pedidos continue íntegro.
    const requestCount = await this.services.countRequests(id);
    if (requestCount > 0) {
      throw new BusinessRuleError(
        `Não é possível remover "${service.name}": existem ${requestCount} pedido(s) associados. Despublique o serviço em alternativa.`,
      );
    }

    await this.services.softDelete(id);
    await this.audit.record({ entity: 'Service', entityId: id, action: 'DELETE', actor });
  }

  /** Garante unicidade do slug, acrescentando um sufixo numérico se preciso. */
  private async resolveSlug(source: string, exceptId?: string): Promise<string> {
    const base = slugify(source);
    if (!base) {
      throw new ConflictError('Não foi possível gerar um endereço para este serviço.');
    }

    let candidate = base;
    let suffix = 2;
    while (await this.services.slugExists(candidate, exceptId)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }
}
