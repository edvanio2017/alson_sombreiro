import { createHash, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtPayload } from '@alson/shared';
import { UnauthorizedError } from '../../../shared/domain/domain-error';
import type { AppConfig } from '../../../config/configuration';
import type { IssuedTokens, TokenServicePort } from '../application/ports/token.port';

@Injectable()
export class JwtTokenService implements TokenServicePort {
  private readonly jwtConfig: AppConfig['jwt'];

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.jwtConfig = config.getOrThrow<AppConfig['jwt']>('jwt');
  }

  async issue(payload: Omit<JwtPayload, 'sid'>): Promise<IssuedTokens> {
    const sessionId = randomUUID();

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.jwtConfig.accessSecret,
      expiresIn: this.jwtConfig.accessTtl,
    });

    const refreshToken = await this.jwt.signAsync(
      { ...payload, sid: sessionId },
      { secret: this.jwtConfig.refreshSecret, expiresIn: this.jwtConfig.refreshTtl },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.toSeconds(this.jwtConfig.accessTtl),
      sessionId,
      refreshExpiresAt: new Date(Date.now() + this.toSeconds(this.jwtConfig.refreshTtl) * 1000),
      refreshTokenHash: this.hashRefresh(refreshToken),
    };
  }

  async verifyRefresh(token: string): Promise<JwtPayload> {
    try {
      return await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.jwtConfig.refreshSecret,
      });
    } catch {
      throw new UnauthorizedError('Sessão inválida ou expirada. Inicie sessão novamente.');
    }
  }

  /** Nunca se guarda o refresh token em claro na base de dados. */
  hashRefresh(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Converte `15m`, `7d`, `24h`, `30s` em segundos. */
  private toSeconds(ttl: string): number {
    const match = /^(\d+)\s*([smhd])$/.exec(ttl.trim());
    if (!match) return Number.parseInt(ttl, 10) || 900;

    const amount = Number.parseInt(match[1], 10);
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return amount * multipliers[match[2]];
  }
}
