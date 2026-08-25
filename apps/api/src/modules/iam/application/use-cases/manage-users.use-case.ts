import { Inject, Injectable } from '@nestjs/common';
import type { PaginatedResult, RoleName, UserSummaryDto } from '@alson/shared';
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from '../../../../shared/domain/domain-error';
import {
  normalizePagination,
  paginate,
  type ActorContext,
  type PaginationParams,
} from '../../../../shared/application/pagination';
import { AuditService } from '../../../../shared/infrastructure/audit/audit.service';
import { NotificationService } from '../../../../shared/infrastructure/mail/notification.service';
import {
  USER_REPOSITORY,
  type UserFilters,
  type UserRepository,
} from '../../domain/repositories/user.repository';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository';
import { PASSWORD_HASHER, type PasswordHasherPort } from '../ports/password-hasher.port';
import type { User } from '../../domain/entities/user.entity';

export interface CreateUserInput {
  name: string;
  email: string;
  password?: string;
  phone?: string | null;
  role: RoleName;
  /** Envia por e-mail as credenciais iniciais. */
  sendInvite?: boolean;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  phone?: string | null;
  role?: RoleName;
  active?: boolean;
}

function toDto(user: User): UserSummaryDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
  };
}

/** Gestão de utilizadores e perfis do backoffice (apenas Admin). */
@Injectable()
export class ManageUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
  ) {}

  async list(
    filters: UserFilters,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<UserSummaryDto & { lastLoginAt: Date | null; phone: string | null }>> {
    const normalized = normalizePagination(pagination);
    const { items, total } = await this.users.list(filters, normalized);

    return paginate(
      items.map((user) => ({
        ...toDto(user),
        phone: user.phone,
        lastLoginAt: user.lastLoginAt,
      })),
      total,
      normalized,
    );
  }

  async findById(id: string): Promise<UserSummaryDto> {
    const user = await this.users.findById(id);
    if (!user || user.deletedAt) throw new NotFoundError('Utilizador', id);
    return toDto(user);
  }

  async create(input: CreateUserInput, actor: ActorContext): Promise<UserSummaryDto> {
    const email = input.email.trim().toLowerCase();

    if (await this.users.findByEmail(email)) {
      throw new ConflictError('Já existe um utilizador com este e-mail.', {
        email: ['Este e-mail já está registado.'],
      });
    }

    const plainPassword = input.password?.trim() || this.hasher.generateTemporary();
    const user = await this.users.create({
      name: input.name.trim(),
      email,
      passwordHash: await this.hasher.hash(plainPassword),
      phone: input.phone ?? null,
      role: input.role,
      active: true,
    });

    await this.audit.record({
      entity: 'User',
      entityId: user.id,
      action: 'CREATE',
      changes: {
        name: { from: null, to: user.name },
        email: { from: null, to: user.email },
        role: { from: null, to: user.role },
      },
      actor,
    });

    if (input.sendInvite !== false) {
      await this.notifications.sendUserInvite({
        to: user.email,
        name: user.name,
        temporaryPassword: plainPassword,
        role: user.role,
      });
    }

    return toDto(user);
  }

  async update(id: string, input: UpdateUserInput, actor: ActorContext): Promise<UserSummaryDto> {
    const existing = await this.users.findById(id);
    if (!existing || existing.deletedAt) throw new NotFoundError('Utilizador', id);

    if (input.email) {
      const email = input.email.trim().toLowerCase();
      const other = await this.users.findByEmail(email);
      if (other && other.id !== id) {
        throw new ConflictError('Já existe um utilizador com este e-mail.', {
          email: ['Este e-mail já está registado.'],
        });
      }
    }

    // Não se pode desactivar a própria conta nem remover o último admin activo.
    if (input.active === false) {
      existing.assertCanBeModifiedBy(actor.userId, 'desactivar');
      await this.assertNotLastAdmin(existing);
    }
    if (input.role && input.role !== 'ADMIN' && existing.isAdmin()) {
      await this.assertNotLastAdmin(existing);
    }

    const updated = await this.users.update(id, {
      name: input.name?.trim(),
      email: input.email?.trim().toLowerCase(),
      phone: input.phone,
      role: input.role,
      active: input.active,
    });

    const changes = this.audit.diff(
      { name: existing.name, email: existing.email, role: existing.role, active: existing.active },
      { name: updated.name, email: updated.email, role: updated.role, active: updated.active },
    );

    if (changes) {
      await this.audit.record({ entity: 'User', entityId: id, action: 'UPDATE', changes, actor });
    }

    // Perder o acesso ou mudar de perfil invalida as sessões abertas.
    if (input.active === false || (input.role && input.role !== existing.role)) {
      await this.refreshTokens.revokeAllForUser(id);
    }

    return toDto(updated);
  }

  async remove(id: string, actor: ActorContext): Promise<void> {
    const existing = await this.users.findById(id);
    if (!existing || existing.deletedAt) throw new NotFoundError('Utilizador', id);

    existing.assertCanBeModifiedBy(actor.userId, 'remover');
    await this.assertNotLastAdmin(existing);

    await this.users.softDelete(id);
    await this.refreshTokens.revokeAllForUser(id);
    await this.audit.record({ entity: 'User', entityId: id, action: 'DELETE', actor });
  }

  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
    actor: ActorContext,
  ): Promise<void> {
    const user = await this.users.findById(id);
    if (!user || user.deletedAt) throw new NotFoundError('Utilizador', id);

    const matches = await this.hasher.compare(currentPassword, user.passwordHash);
    if (!matches) {
      throw new BusinessRuleError('A palavra-passe actual está incorrecta.', {
        currentPassword: ['Palavra-passe incorrecta.'],
      });
    }

    await this.users.update(id, { passwordHash: await this.hasher.hash(newPassword) });
    // Alterar a palavra-passe termina as restantes sessões.
    await this.refreshTokens.revokeAllForUser(id);

    await this.audit.record({
      entity: 'User',
      entityId: id,
      action: 'UPDATE',
      changes: { password: { from: '***', to: '***' } },
      actor,
    });
  }

  /** Repõe a palavra-passe de outro utilizador (apenas Admin). */
  async resetPassword(id: string, actor: ActorContext): Promise<{ temporaryPassword: string }> {
    const user = await this.users.findById(id);
    if (!user || user.deletedAt) throw new NotFoundError('Utilizador', id);

    const temporaryPassword = this.hasher.generateTemporary();
    await this.users.update(id, { passwordHash: await this.hasher.hash(temporaryPassword) });
    await this.refreshTokens.revokeAllForUser(id);

    await this.notifications.sendUserInvite({
      to: user.email,
      name: user.name,
      temporaryPassword,
      role: user.role,
    });

    await this.audit.record({
      entity: 'User',
      entityId: id,
      action: 'UPDATE',
      changes: { password: { from: '***', to: 'reposta pelo administrador' } },
      actor,
    });

    return { temporaryPassword };
  }

  private async assertNotLastAdmin(user: User): Promise<void> {
    if (!user.isAdmin()) return;
    const activeAdmins = await this.users.countActiveAdmins();
    if (activeAdmins <= 1) {
      throw new BusinessRuleError(
        'Não é possível desactivar, remover ou despromover o único administrador activo.',
      );
    }
  }
}
