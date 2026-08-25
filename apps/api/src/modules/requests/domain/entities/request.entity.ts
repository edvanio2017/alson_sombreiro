import { REFERENCE_PATTERN, type Priority } from '@alson/shared';
import { Entity } from '../../../../shared/domain/entity.base';
import { BusinessRuleError, ValidationError } from '../../../../shared/domain/domain-error';
import type { RequestStatus } from './request-status.entity';

export interface RequesterInfo {
  name: string;
  email: string;
  phone: string | null;
}

export interface RequestProps {
  reference: string;
  serviceId: string;
  serviceName: string;
  status: RequestStatus;
  assigneeId: string | null;
  priority: Priority;
  requester: RequesterInfo;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Pedido de serviço: raiz de agregado do Mini CRM.
 *
 * Concentra as regras de transição do pipeline: o que pode mudar, quando um
 * pedido se considera fechado e que alterações justificam notificar o cliente.
 */
export class Request extends Entity<RequestProps> {
  private constructor(id: string, props: RequestProps) {
    super(id, props);
  }

  static create(id: string, props: RequestProps): Request {
    if (!REFERENCE_PATTERN.test(props.reference)) {
      throw new ValidationError('Número de referência inválido.', {
        reference: ['A referência deve seguir o formato AS-AAAA-NNNNNN.'],
      });
    }
    return new Request(id, props);
  }

  get reference(): string {
    return this.props.reference;
  }

  get status(): RequestStatus {
    return this.props.status;
  }

  get assigneeId(): string | null {
    return this.props.assigneeId;
  }

  get priority(): Priority {
    return this.props.priority;
  }

  get requester(): RequesterInfo {
    return this.props.requester;
  }

  get serviceName(): string {
    return this.props.serviceName;
  }

  get isClosed(): boolean {
    return this.props.status.isFinal;
  }

  /**
   * Transição de estado.
   *
   * O pipeline é deliberadamente livre (não há máquina de estados rígida):
   * os estados são configuráveis no backoffice e a operação real exige poder
   * recuar um pedido. As regras que se mantêm são: o estado tem de estar
   * activo e tem de ser diferente do actual.
   */
  transitionTo(next: RequestStatus): { from: RequestStatus; to: RequestStatus } {
    if (!next.active) {
      throw new BusinessRuleError(
        `O estado "${next.name}" está desactivado e não pode ser atribuído.`,
      );
    }
    if (next.id === this.props.status.id) {
      throw new BusinessRuleError(`O pedido já se encontra no estado "${next.name}".`);
    }

    const from = this.props.status;
    this.props.status = next;
    this.props.closedAt = next.isFinal ? new Date() : null;
    this.props.updatedAt = new Date();

    return { from, to: next };
  }

  assignTo(userId: string | null): { from: string | null; to: string | null } {
    if (userId === this.props.assigneeId) {
      throw new BusinessRuleError('O pedido já está atribuído a este utilizador.');
    }
    const from = this.props.assigneeId;
    this.props.assigneeId = userId;
    this.props.updatedAt = new Date();
    return { from, to: userId };
  }

  changePriority(priority: Priority): { from: Priority; to: Priority } {
    if (priority === this.props.priority) {
      throw new BusinessRuleError(`O pedido já tem prioridade "${priority}".`);
    }
    const from = this.props.priority;
    this.props.priority = priority;
    this.props.updatedAt = new Date();
    return { from, to: priority };
  }

  /** O requerente só é notificado se o estado de destino assim o determinar. */
  shouldNotifyRequester(to: RequestStatus): boolean {
    return to.notifyRequester && Boolean(this.props.requester.email);
  }

  /** Dias decorridos até ao fecho. Alimenta o indicador de tempo médio. */
  get resolutionDays(): number | null {
    if (!this.props.closedAt) return null;
    const milliseconds = this.props.closedAt.getTime() - this.props.createdAt.getTime();
    return Math.max(0, Math.round(milliseconds / 86_400_000));
  }
}
