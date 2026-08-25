import { slugify, type ServiceDetailDto, type ServiceSummaryDto } from '@alson/shared';
import { Entity } from '../../../../shared/domain/entity.base';
import { BusinessRuleError, ValidationError } from '../../../../shared/domain/domain-error';
import type { FormField } from './form-field.entity';

export interface ServiceProps {
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  benefits: string[];
  icon: string | null;
  coverImage: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  featured: boolean;
  order: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  fields: FormField[];
}

/**
 * Serviço prestado pela Alson Sombreiro.
 *
 * É a raiz de agregado do catálogo: um serviço é dono dos seus campos de
 * formulário e é através dele que se garante a unicidade das chaves.
 */
export class Service extends Entity<ServiceProps> {
  private constructor(id: string, props: ServiceProps) {
    super(id, props);
  }

  static create(id: string, props: ServiceProps): Service {
    const name = props.name.trim();
    if (name.length < 3) {
      throw new ValidationError('Nome de serviço inválido.', {
        name: ['O nome do serviço deve ter pelo menos 3 caracteres.'],
      });
    }

    const slug = slugify(props.slug || name);
    if (!slug) {
      throw new ValidationError('Não foi possível gerar um endereço para este serviço.', {
        slug: ['Indique um nome com caracteres alfanuméricos.'],
      });
    }

    return new Service(id, { ...props, name, slug });
  }

  get slug(): string {
    return this.props.slug;
  }

  get name(): string {
    return this.props.name;
  }

  get active(): boolean {
    return this.props.active;
  }

  get fields(): FormField[] {
    return [...this.props.fields].sort((a, b) => a.order - b.order);
  }

  /** Campos activos, ordenados. É o que o site público recebe. */
  get publicFields(): FormField[] {
    return this.fields.filter((field) => field.active);
  }

  /** Um serviço só pode ser publicado se tiver formulário definido. */
  assertPublishable(): void {
    if (this.publicFields.length === 0) {
      throw new BusinessRuleError(
        `O serviço "${this.props.name}" não tem campos de formulário activos. Defina o formulário antes de o publicar.`,
      );
    }
  }

  assertFieldKeyIsAvailable(key: string, exceptFieldId?: string): void {
    const conflict = this.props.fields.find(
      (field) => field.key === key.trim().toLowerCase() && field.id !== exceptFieldId,
    );
    if (conflict) {
      throw new ValidationError('Chave de campo já utilizada.', {
        key: [`Já existe um campo com a chave "${key}" neste serviço.`],
      });
    }
  }

  toSummaryDto(): ServiceSummaryDto {
    return {
      id: this.id,
      slug: this.props.slug,
      name: this.props.name,
      shortDescription: this.props.shortDescription,
      icon: this.props.icon,
      coverImage: this.props.coverImage,
      featured: this.props.featured,
      order: this.props.order,
      active: this.props.active,
    };
  }

  /**
   * @param onlyActiveFields `true` para o site público (esconde campos
   * desactivados), `false` para o backoffice (mostra tudo).
   */
  toDetailDto(onlyActiveFields = true): ServiceDetailDto {
    const fields = onlyActiveFields ? this.publicFields : this.fields;

    return {
      ...this.toSummaryDto(),
      description: this.props.description,
      benefits: this.props.benefits,
      metaTitle: this.props.metaTitle,
      metaDescription: this.props.metaDescription,
      ogImage: this.props.ogImage,
      fields: fields.map((field) => field.toDto()),
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
