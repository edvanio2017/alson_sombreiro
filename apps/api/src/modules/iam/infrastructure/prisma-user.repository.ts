import { Injectable } from '@nestjs/common';
import { Prisma, type RoleName, type User as PrismaUser, type Role } from '@prisma/client';
import { NotFoundError } from '../../../shared/domain/domain-error';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import type { NormalizedPagination } from '../../../shared/application/pagination';
import { User } from '../domain/entities/user.entity';
import type {
  CreateUserData,
  UpdateUserData,
  UserFilters,
  UserRepository,
} from '../domain/repositories/user.repository';

type UserWithRole = PrismaUser & { role: Role };

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Traduz o registo de persistência na entidade de domínio. */
  private toDomain(record: UserWithRole): User {
    return User.create(record.id, {
      name: record.name,
      email: record.email,
      passwordHash: record.passwordHash,
      phone: record.phone,
      avatarUrl: record.avatarUrl,
      active: record.active,
      role: record.role.name,
      roleId: record.roleId,
      lastLoginAt: record.lastLoginAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    });
  }

  private async roleIdFor(name: RoleName): Promise<string> {
    const role = await this.prisma.role.findUnique({ where: { name } });
    if (!role) throw new NotFoundError('Perfil', name);
    return role.id;
  }

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id }, include: { role: true } });
    return record ? this.toDomain(record) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { role: true },
    });
    return record ? this.toDomain(record) : null;
  }

  async list(
    filters: UserFilters,
    pagination: NormalizedPagination,
  ): Promise<{ items: User[]; total: number }> {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(filters.active !== undefined ? { active: filters.active } : {}),
      ...(filters.role ? { role: { name: filters.role } } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [records, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: { role: true },
        orderBy: [{ active: 'desc' }, { name: 'asc' }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items: records.map((record) => this.toDomain(record)), total };
  }

  async create(data: CreateUserData): Promise<User> {
    const record = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        phone: data.phone ?? null,
        active: data.active ?? true,
        roleId: await this.roleIdFor(data.role),
      },
      include: { role: true },
    });
    return this.toDomain(record);
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    const record = await this.prisma.user.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
        ...(data.passwordHash !== undefined ? { passwordHash: data.passwordHash } : {}),
        ...(data.role !== undefined ? { roleId: await this.roleIdFor(data.role) } : {}),
      },
      include: { role: true },
    });
    return this.toDomain(record);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      // O e-mail é libertado para reutilização, mantendo o registo histórico.
      data: { deletedAt: new Date(), active: false, email: `removido+${id}@alsonsombreiro.ao` },
    });
  }

  async registerLogin(id: string, at: Date): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { lastLoginAt: at } });
  }

  async countActiveAdmins(): Promise<number> {
    return this.prisma.user.count({
      where: { active: true, deletedAt: null, role: { name: 'ADMIN' } },
    });
  }
}
