import { Inject, Injectable } from '@nestjs/common';
import { AuditService } from '../../../../shared/infrastructure/audit/audit.service';
import type { ActorContext } from '../../../../shared/application/pagination';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository';
import { TOKEN_SERVICE, type TokenServicePort } from '../ports/token.port';

/**
 * Termina a sessão actual (ou todas as sessões do utilizador).
 * Um token já inválido não gera erro: terminar sessão é idempotente.
 */
@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenServicePort,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: ActorContext, refreshToken?: string, allSessions = false): Promise<void> {
    if (allSessions) {
      await this.refreshTokens.revokeAllForUser(actor.userId);
    } else if (refreshToken) {
      const session = await this.refreshTokens.findValidByHash(
        this.tokens.hashRefresh(refreshToken),
      );
      if (session) await this.refreshTokens.revoke(session.id);
    }

    await this.audit.record({
      entity: 'User',
      entityId: actor.userId,
      action: 'LOGOUT',
      actor,
    });
  }
}
