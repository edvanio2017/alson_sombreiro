import { Inject, Injectable } from '@nestjs/common';
import type { AuthSessionDto } from '@alson/shared';
import { ForbiddenError, UnauthorizedError } from '../../../../shared/domain/domain-error';
import { AuditService } from '../../../../shared/infrastructure/audit/audit.service';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository';
import { USER_REPOSITORY, type UserRepository } from '../../domain/repositories/user.repository';
import { PASSWORD_HASHER, type PasswordHasherPort } from '../ports/password-hasher.port';
import { TOKEN_SERVICE, type TokenServicePort } from '../ports/token.port';

export interface AuthenticateInput {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Início de sessão no backoffice.
 *
 * Regras aplicadas:
 *  - a resposta não distingue "e-mail inexistente" de "palavra-passe errada",
 *    para não permitir enumeração de contas;
 *  - a comparação de hash corre mesmo quando o utilizador não existe, para
 *    manter o tempo de resposta constante (mitigação de timing attacks);
 *  - contas desactivadas são explicitamente recusadas.
 */
@Injectable()
export class AuthenticateUseCase {
  /** Hash descartável usado quando o e-mail não existe. */
  private static readonly DUMMY_HASH =
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenServicePort,
    private readonly audit: AuditService,
  ) {}

  async execute(input: AuthenticateInput): Promise<AuthSessionDto> {
    const email = input.email.trim().toLowerCase();
    const user = await this.users.findByEmail(email);

    const passwordMatches = await this.hasher.compare(
      input.password,
      user?.passwordHash ?? AuthenticateUseCase.DUMMY_HASH,
    );

    if (!user || !passwordMatches) {
      throw new UnauthorizedError('E-mail ou palavra-passe incorrectos.');
    }

    if (!user.canAuthenticate) {
      throw new ForbiddenError(
        'A sua conta está desactivada. Contacte o administrador do sistema.',
      );
    }

    const issued = await this.tokens.issue({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await this.refreshTokens.issue({
      id: issued.sessionId,
      userId: user.id,
      tokenHash: issued.refreshTokenHash,
      expiresAt: issued.refreshExpiresAt,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });

    const now = new Date();
    await this.users.registerLogin(user.id, now);
    await this.refreshTokens.purgeExpired();

    await this.audit.record({
      entity: 'User',
      entityId: user.id,
      action: 'LOGIN',
      actor: {
        userId: user.id,
        email: user.email,
        role: user.role,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });

    return {
      accessToken: issued.accessToken,
      refreshToken: issued.refreshToken,
      expiresIn: issued.expiresIn,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
      },
    };
  }
}
