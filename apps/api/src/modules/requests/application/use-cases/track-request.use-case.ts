import { Inject, Injectable } from '@nestjs/common';
import type { RequestStatusDto } from '@alson/shared';
import { NotFoundError } from '../../../../shared/domain/domain-error';
import {
  REQUEST_REPOSITORY,
  type RequestRepository,
} from '../../domain/repositories/request.repository';

export interface PublicRequestView {
  reference: string;
  serviceName: string;
  status: Pick<RequestStatusDto, 'name' | 'color' | 'isFinal'>;
  submittedAt: string;
  updatedAt: string;
  /** Timeline pública: apenas mudanças de estado, sem notas internas. */
  timeline: Array<{ description: string; date: string }>;
  attachmentCount: number;
}

/**
 * Consulta pública do estado de um pedido.
 *
 * Requer referência **e** e-mail do requerente: sem o par correcto não se
 * confirma sequer que a referência existe, para não expor dados de terceiros.
 * A vista devolvida é deliberadamente reduzida: nunca inclui notas internas,
 * responsável atribuído ou os valores submetidos.
 */
@Injectable()
export class TrackRequestUseCase {
  constructor(@Inject(REQUEST_REPOSITORY) private readonly requests: RequestRepository) {}

  async execute(reference: string, email: string): Promise<PublicRequestView> {
    const detail = await this.requests.findByReferenceAndEmail(
      reference.trim().toUpperCase(),
      email.trim().toLowerCase(),
    );

    if (!detail) {
      throw new NotFoundError('Pedido');
    }

    return {
      reference: detail.reference,
      serviceName: detail.service.name,
      status: {
        name: detail.status.name,
        color: detail.status.color,
        isFinal: detail.status.isFinal,
      },
      submittedAt: detail.createdAt,
      updatedAt: detail.updatedAt,
      timeline: detail.history
        .filter((entry) => entry.event === 'CRIADO' || entry.event === 'ESTADO_ALTERADO')
        .map((entry) => ({
          // A descrição interna pode conter notas do gestor: publica-se apenas
          // a informação essencial de estado.
          description:
            entry.event === 'CRIADO'
              ? 'Pedido recebido.'
              : entry.toValue
                ? `Estado actualizado para "${entry.toValue}".`
                : 'Estado do pedido actualizado.',
          date: entry.createdAt,
        })),
      attachmentCount: detail.attachments.length,
    };
  }
}
