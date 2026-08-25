import { slugify, type RequestStatusDto } from '@alson/shared';
import { Entity } from '../../../../shared/domain/entity.base';
import { ValidationError } from '../../../../shared/domain/domain-error';

export interface RequestStatusProps {
  key: string;
  name: string;
  color: string;
  order: number;
  isInitial: boolean;
  isFinal: boolean;
  notifyRequester: boolean;
  active: boolean;
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** Estado configurável do pipeline (coluna do Kanban). */
export class RequestStatus extends Entity<RequestStatusProps> {
  private constructor(id: string, props: RequestStatusProps) {
    super(id, props);
  }

  static create(id: string, props: RequestStatusProps): RequestStatus {
    const name = props.name.trim();
    if (name.length < 2) {
      throw new ValidationError('Nome de estado inválido.', {
        name: ['O nome do estado deve ter pelo menos 2 caracteres.'],
      });
    }

    const color = props.color?.trim() || '#64748B';
    if (!HEX_COLOR.test(color)) {
      throw new ValidationError('Cor inválida.', {
        color: ['Indique uma cor em hexadecimal, por exemplo #1E293B.'],
      });
    }

    if (props.isInitial && props.isFinal) {
      throw new ValidationError('Estado incoerente.', {
        isFinal: ['Um estado não pode ser simultaneamente inicial e final.'],
      });
    }

    const key = slugify(props.key || name).replace(/-/g, '_');
    if (!key) {
      throw new ValidationError('Chave de estado inválida.', {
        key: ['Indique um nome com caracteres alfanuméricos.'],
      });
    }

    return new RequestStatus(id, { ...props, name, color, key });
  }

  get key(): string {
    return this.props.key;
  }

  get name(): string {
    return this.props.name;
  }

  get color(): string {
    return this.props.color;
  }

  get isInitial(): boolean {
    return this.props.isInitial;
  }

  get isFinal(): boolean {
    return this.props.isFinal;
  }

  get notifyRequester(): boolean {
    return this.props.notifyRequester;
  }

  get active(): boolean {
    return this.props.active;
  }

  get order(): number {
    return this.props.order;
  }

  toDto(): RequestStatusDto {
    return {
      id: this.id,
      key: this.props.key,
      name: this.props.name,
      color: this.props.color,
      order: this.props.order,
      isInitial: this.props.isInitial,
      isFinal: this.props.isFinal,
      notifyRequester: this.props.notifyRequester,
      active: this.props.active,
    };
  }
}
