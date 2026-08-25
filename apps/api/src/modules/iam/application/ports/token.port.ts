import type { JwtPayload } from '@alson/shared';

export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  /** Validade do access token, em segundos. */
  expiresIn: number;
  /** Identificador da sessão de refresh, guardado em `refresh_tokens`. */
  sessionId: string;
  refreshExpiresAt: Date;
  refreshTokenHash: string;
}

export interface TokenServicePort {
  issue(payload: Omit<JwtPayload, 'sid'>): Promise<IssuedTokens>;
  verifyRefresh(token: string): Promise<JwtPayload>;
  hashRefresh(token: string): string;
}
