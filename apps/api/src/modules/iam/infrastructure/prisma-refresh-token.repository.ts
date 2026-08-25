import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import type {
  IssueRefreshTokenData,
  RefreshTokenRecord,
  RefreshTokenRepository,
} from '../domain/repositories/refresh-token.repository';

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async issue(data: IssueRefreshTokenData): Promise<void> {
    await this.prisma.refreshToken.create({
      data: {
        id: data.id,
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        userAgent: data.userAgent ?? null,
        ipAddress: data.ipAddress ?? null,
      },
    });
  }

  async findValidByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const record = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, userId: true, expiresAt: true, revokedAt: true },
    });
    return record;
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async purgeExpired(): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          // Sessões revogadas há mais de 30 dias já não têm valor forense.
          { revokedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        ],
      },
    });
  }
}
