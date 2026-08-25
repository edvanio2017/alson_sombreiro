import type { RoleName } from '@alson/shared';
import { Entity } from '../../../../shared/domain/entity.base';
import { BusinessRuleError, ValidationError } from '../../../../shared/domain/domain-error';

export interface UserProps {
  name: string;
  email: string;
  passwordHash: string;
  phone: string | null;
  avatarUrl: string | null;
  active: boolean;
  role: RoleName;
  roleId: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Utilizador do backoffice.
 *
 * Concentra as invariantes de identidade: e-mail válido e normalizado,
 * nome não vazio e a regra de que uma conta inactiva não pode autenticar-se.
 */
export class User extends Entity<UserProps> {
  private constructor(id: string, props: UserProps) {
    super(id, props);
  }

  static create(id: string, props: UserProps): User {
    const email = props.email.trim().toLowerCase();
    const name = props.name.trim();

    if (!EMAIL_PATTERN.test(email)) {
      throw new ValidationError('Endereço de e-mail inválido.', {
        email: ['Introduza um endereço de e-mail válido.'],
      });
    }
    if (name.length < 3) {
      throw new ValidationError('Nome demasiado curto.', {
        name: ['O nome deve ter pelo menos 3 caracteres.'],
      });
    }

    return new User(id, { ...props, email, name });
  }

  get name(): string {
    return this.props.name;
  }

  get email(): string {
    return this.props.email;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get role(): RoleName {
    return this.props.role;
  }

  get roleId(): string {
    return this.props.roleId;
  }

  get active(): boolean {
    return this.props.active;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  get lastLoginAt(): Date | null {
    return this.props.lastLoginAt;
  }

  get phone(): string | null {
    return this.props.phone;
  }

  get avatarUrl(): string | null {
    return this.props.avatarUrl;
  }

  /** Só contas activas e não removidas podem iniciar sessão. */
  get canAuthenticate(): boolean {
    return this.props.active && this.props.deletedAt === null;
  }

  isAdmin(): boolean {
    return this.props.role === 'ADMIN';
  }

  /**
   * Um utilizador não se pode desactivar nem apagar a si próprio, evitando que
   * o último administrador se tranque fora do sistema por engano.
   */
  assertCanBeModifiedBy(actorId: string, operation: 'desactivar' | 'remover'): void {
    if (this.id === actorId) {
      throw new BusinessRuleError(`Não é possível ${operation} a sua própria conta.`);
    }
  }

  registerLogin(at: Date = new Date()): void {
    this.props.lastLoginAt = at;
  }

  changePassword(passwordHash: string): void {
    this.props.passwordHash = passwordHash;
    this.props.updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.id,
      name: this.props.name,
      email: this.props.email,
      phone: this.props.phone,
      avatarUrl: this.props.avatarUrl,
      role: this.props.role,
      active: this.props.active,
      lastLoginAt: this.props.lastLoginAt,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
