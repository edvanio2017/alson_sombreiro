import { Inject, Injectable } from '@nestjs/common';
import type { ServiceDetailDto, ServiceSummaryDto } from '@alson/shared';
import { NotFoundError } from '../../../../shared/domain/domain-error';
import {
  SERVICE_REPOSITORY,
  type ServiceRepository,
} from '../../domain/repositories/service.repository';

/**
 * Leitura do catálogo pelo site institucional.
 * Devolve apenas serviços publicados e campos activos.
 */
@Injectable()
export class GetPublicCatalogUseCase {
  constructor(@Inject(SERVICE_REPOSITORY) private readonly services: ServiceRepository) {}

  async listServices(featuredOnly = false): Promise<ServiceSummaryDto[]> {
    const services = await this.services.listAll({
      active: true,
      ...(featuredOnly ? { featured: true } : {}),
    });
    return services.map((service) => service.toSummaryDto());
  }

  /** Detalhe + schema do formulário a partir do slug amigável. */
  async getBySlug(slug: string): Promise<ServiceDetailDto> {
    const service = await this.services.findBySlug(slug, true);
    if (!service) throw new NotFoundError('Serviço', slug);
    return service.toDetailDto(true);
  }

  /** Slugs publicados, para alimentar o sitemap.xml do site. */
  async listSlugs(): Promise<Array<{ slug: string; updatedAt: string }>> {
    const services = await this.services.listAll({ active: true });
    return services.map((service) => ({
      slug: service.slug,
      updatedAt: service.toDetailDto().updatedAt,
    }));
  }
}
