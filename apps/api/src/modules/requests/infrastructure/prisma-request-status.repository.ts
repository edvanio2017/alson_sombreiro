import { Injectable } from '@nestjs/common';
import type { RequestStatus as PrismaRequestStatus } from '@prisma/client';
import { slugify } from '@alson/shared';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { RequestStatus } from '../domain/entities/request-status.entity';
import type {
  RequestStatusRepository,
  RequestStatusWriteData,
} from '../domain/repositories/request-status.repository';

@Injectable()
export class PrismaRequestStatusRepository implements RequestStatusRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(record: PrismaRequestStatus): RequestStatus {
    return RequestStatus.create(record.id, {
      key: record.key,
      name: record.name,
      color: record.color,
      order: record.order,
      isInitial: record.isInitial,
      isFinal: record.isFinal,
      notifyRequester: record.notifyRequester,
      active: record.active,
    });
  }

  async findById(id: string): Promise<RequestStatus | null> {
    const record = await this.prisma.requestStatus.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findByKey(key: string): Promise<RequestStatus | null> {
    const record = await this.prisma.requestStatus.findUnique({ where: { key } });
    return record ? this.toDomain(record) : null;
  }

  async findInitial(): Promise<RequestStatus | null> {
    const record = await this.prisma.requestStatus.findFirst({
      where: { isInitial: true, active: true },
      orderBy: { order: 'asc' },
    });
    return record ? this.toDomain(record) : null;
  }

  async list(onlyActive = false): Promise<RequestStatus[]> {
    const records = await this.prisma.requestStatus.findMany({
      where: onlyActive ? { active: true } : {},
      orderBy: { order: 'asc' },
    });
    return records.map((record) => this.toDomain(record));
  }

  async create(data: RequestStatusWriteData & { name: string }): Promise<RequestStatus> {
    const key = slugify(data.key || data.name).replace(/-/g, '_');
    const maxOrder = await this.prisma.requestStatus.aggregate({ _max: { order: true } });

    const record = await this.prisma.requestStatus.create({
      data: {
        key,
        name: data.name,
        color: data.color ?? '#64748B',
        order: data.order ?? (maxOrder._max.order ?? -1) + 1,
        isInitial: data.isInitial ?? false,
        isFinal: data.isFinal ?? false,
        notifyRequester: data.notifyRequester ?? false,
        active: data.active ?? true,
      },
    });
    return this.toDomain(record);
  }

  async update(id: string, data: RequestStatusWriteData): Promise<RequestStatus> {
    const record = await this.prisma.requestStatus.update({
      where: { id },
      data: {
        ...(data.key !== undefined ? { key: slugify(data.key).replace(/-/g, '_') } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.color !== undefined ? { color: data.color } : {}),
        ...(data.order !== undefined ? { order: data.order } : {}),
        ...(data.isInitial !== undefined ? { isInitial: data.isInitial } : {}),
        ...(data.isFinal !== undefined ? { isFinal: data.isFinal } : {}),
        ...(data.notifyRequester !== undefined ? { notifyRequester: data.notifyRequester } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });
    return this.toDomain(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.requestStatus.delete({ where: { id } });
  }

  /** Assegura a existência de um único estado inicial no pipeline. */
  async clearInitialFlag(exceptId: string): Promise<void> {
    await this.prisma.requestStatus.updateMany({
      where: { id: { not: exceptId }, isInitial: true },
      data: { isInitial: false },
    });
  }

  async countRequests(statusId: string): Promise<number> {
    return this.prisma.request.count({ where: { statusId } });
  }

  async reorder(orderedIds: string[]): Promise<void> {
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.requestStatus.update({ where: { id }, data: { order: index } }),
      ),
    );
  }
}
