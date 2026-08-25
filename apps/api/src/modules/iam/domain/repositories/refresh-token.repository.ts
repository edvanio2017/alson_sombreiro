export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface IssueRefreshTokenData {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string | null;
  ipAddress?: string | null;
}

/** Porta de persistência das sessões de refresh (permite revogação). */
export interface RefreshTokenRepository {
  issue(data: IssueRefreshTokenData): Promise<void>;
  findValidByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  revoke(id: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
  /** Remove sessões expiradas. Invocado após cada login. */
  purgeExpired(): Promise<void>;
}
