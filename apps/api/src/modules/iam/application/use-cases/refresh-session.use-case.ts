import { Inject, Injectable } from '@nestjs/common';
import type { AuthSessionDto } from '@alson/shared';
import { ForbiddenError, UnauthorizedError } from '../../../../shared/domain/domain-error';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository';
import { USER_REPOSITORY, type UserRepository } from '../../domain/repositories/user.repository';
import { TOKEN_SERVICE, type TokenServicePort } from '../ports/token.port';

export interface RefreshSessionInput {
  refreshToken: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Renovação de sessão com rotação de refresh token.
 *
 * O token antigo é revogado ao ser usado: se um token já consumido voltar a
 * aparecer, a sessão correspondente já não existe e o pedido é recusado.
 */
@Injectable()
export class RefreshSessionUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenServicePort,
  ) {}

  async execute(input: RefreshSessionInput): Promise<AuthSessionDto> {
    const payload = await this.tokens.verifyRefresh(input.refreshToken);
    const tokenHash = this.tokens.hashRefresh(input.refreshToken);
    const session = await this.refreshTokens.findValidByHash(tokenHash);

    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedError('Sessão inválida ou já terminada. Inicie sessão novamente.');
    }

    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedError('Sessão inválida.');
    }
    if (!user.canAuthenticate) {
      await this.refreshTokens.revokeAllForUser(user.id);
      throw new ForbiddenError('A sua conta está desactivada.');
    }

    // Rotação: o token usado é revogado e emite-se um par novo.
    await this.refreshTokens.revoke(session.id);

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
