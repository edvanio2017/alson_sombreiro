import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type FormField as PrismaFormField,
  type Service as PrismaService_,
} from '@prisma/client';
import type { FieldOption, FieldValidationRules } from '@alson/shared';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import type { NormalizedPagination } from '../../../shared/application/pagination';
import { FormField } from '../domain/entities/form-field.entity';
import { Service } from '../domain/entities/service.entity';
import type {
  FormFieldWriteData,
  ServiceFilters,
  ServiceRepository,
  ServiceWriteData,
} from '../domain/repositories/service.repository';

type ServiceWithFields = PrismaService_ & { fields: PrismaFormField[] };

@Injectable()
export class PrismaServiceRepository implements ServiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  private fieldToDomain(record: PrismaFormField): FormField {
    return FormField.create(record.id, {
      serviceId: record.serviceId,
      key: record.key,
      label: record.label,
      type: record.type,
      placeholder: record.placeholder,
      helpText: record.helpText,
      required: record.required,
      order: record.order,
      width: (record.width === 1 ? 1 : 2) as 1 | 2,
      options: (record.options as unknown as FieldOption[]) ?? [],
      validation: (record.validation as unknown as FieldValidationRules) ?? {},
      active: record.active,
    });
  }

  private toDomain(record: ServiceWithFields): Service {
    return Service.create(record.id, {
      slug: record.slug,
      name: record.name,
      shortDescription: record.shortDescription,
      description: record.description,
      benefits: record.benefits,
      icon: record.icon,
      coverImage: record.coverImage,
      metaTitle: record.metaTitle,
      metaDescription: record.metaDescription,
      ogImage: record.ogImage,
      featured: record.featured,
      order: record.order,
      active: record.active,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      fields: record.fields.map((field) => this.fieldToDomain(field)),
    });
  }

  private fieldsQuery(includeInactive: boolean) {
    return {
      where: includeInactive ? {} : { active: true },
      orderBy: { order: 'asc' as const },
    };
  }

  async findById(id: string, includeInactiveFields = true): Promise<Service | null> {
    const record = await this.prisma.service.findFirst({
      where: { id, deletedAt: null },
      include: { fields: this.fieldsQuery(includeInactiveFields) },
    });
    return record ? this.toDomain(record) : null;
  }

  async findBySlug(slug: string, onlyActive = false): Promise<Service | null> {
    const record = await this.prisma.service.findFirst({
      where: { slug, deletedAt: null, ...(onlyActive ? { active: true } : {}) },
      include: { fields: this.fieldsQuery(!onlyActive) },
    });
    return record ? this.toDomain(record) : null;
  }

  private buildWhere(filters: ServiceFilters): Prisma.ServiceWhereInput {
    return {
      deletedAt: null,
      ...(filters.active !== undefined ? { active: filters.active } : {}),
      ...(filters.featured !== undefined ? { featured: filters.featured } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { shortDescription: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  async list(
    filters: ServiceFilters,
    pagination: NormalizedPagination,
  ): Promise<{ items: Service[]; total: number }> {
    const where = this.buildWhere(filters);

    const [records, total] = await this.prisma.$transaction([
      this.prisma.service.findMany({
        where,
        include: { fields: this.fieldsQuery(true) },
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.service.count({ where }),
    ]);

    return { items: records.map((record) => this.toDomain(record)), total };
  }

  async listAll(filters: ServiceFilters): Promise<Service[]> {
    const records = await this.prisma.service.findMany({
      where: this.buildWhere(filters),
      include: { fields: this.fieldsQuery(filters.active !== true) },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
    return records.map((record) => this.toDomain(record));
  }

  async slugExists(slug: string, exceptId?: string): Promise<boolean> {
    const count = await this.prisma.service.count({
      where: { slug, ...(exceptId ? { id: { not: exceptId } } : {}) },
    });
    return count > 0;
  }

  async create(data: ServiceWriteData & { slug: string; name: string }): Promise<Service> {
    const record = await this.prisma.service.create({
      data: {
        slug: data.slug,
        name: data.name,
        shortDescription: data.shortDescription ?? '',
        description: data.description ?? '',
        benefits: data.benefits ?? [],
        icon: data.icon ?? null,
        coverImage: data.coverImage ?? null,
        metaTitle: data.metaTitle ?? null,
        metaDescription: data.metaDescription ?? null,
        ogImage: data.ogImage ?? null,
        featured: data.featured ?? false,
        order: data.order ?? 0,
        active: data.active ?? false,
      },
      include: { fields: this.fieldsQuery(true) },
    });
    return this.toDomain(record);
  }

  async update(id: string, data: ServiceWriteData): Promise<Service> {
    const record = await this.prisma.service.update({
      where: { id },
      data: {
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.shortDescription !== undefined ? { shortDescription: data.shortDescription } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.benefits !== undefined ? { benefits: data.benefits } : {}),
        ...(data.icon !== undefined ? { icon: data.icon } : {}),
        ...(data.coverImage !== undefined ? { coverImage: data.coverImage } : {}),
        ...(data.metaTitle !== undefined ? { metaTitle: data.metaTitle } : {}),
        ...(data.metaDescription !== undefined ? { metaDescription: data.metaDescription } : {}),
        ...(data.ogImage !== undefined ? { ogImage: data.ogImage } : {}),
        ...(data.featured !== undefined ? { featured: data.featured } : {}),
        ...(data.order !== undefined ? { order: data.order } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
      include: { fields: this.fieldsQuery(true) },
    });
    return this.toDomain(record);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.service.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
  }

  async countRequests(serviceId: string): Promise<number> {
    return this.prisma.request.count({ where: { serviceId } });
  }

  async createField(serviceId: string, data: FormFieldWriteData): Promise<FormField> {
    const record = await this.prisma.formField.create({
      data: {
        serviceId,
        key: data.key!,
        label: data.label!,
        type: data.type!,
        placeholder: data.placeholder ?? null,
        helpText: data.helpText ?? null,
        required: data.required ?? false,
        order: data.order ?? 0,
        width: data.width ?? 2,
        options: (data.options ?? []) as unknown as Prisma.InputJsonValue,
        validation: (data.validation ?? {}) as unknown as Prisma.InputJsonValue,
        active: data.active ?? true,
      },
    });
    return this.fieldToDomain(record);
  }

  async updateField(fieldId: string, data: FormFieldWriteData): Promise<FormField> {
    const record = await this.prisma.formField.update({
      where: { id: fieldId },
      data: {
        ...(data.key !== undefined ? { key: data.key } : {}),
        ...(data.label !== undefined ? { label: data.label } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.placeholder !== undefined ? { placeholder: data.placeholder } : {}),
        ...(data.helpText !== undefined ? { helpText: data.helpText } : {}),
        ...(data.required !== undefined ? { required: data.required } : {}),
        ...(data.order !== undefined ? { order: data.order } : {}),
        ...(data.width !== undefined ? { width: data.width } : {}),
        ...(data.options !== undefined
          ? { options: data.options as unknown as Prisma.InputJsonValue }
          : {}),
        ...(data.validation !== undefined
          ? { validation: data.validation as unknown as Prisma.InputJsonValue }
          : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });
    return this.fieldToDomain(record);
  }

  async deleteField(fieldId: string): Promise<void> {
    await this.prisma.formField.delete({ where: { id: fieldId } });
  }

  /** Reordenação atómica: ou toda a nova ordem persiste, ou nenhuma. */
  async reorderFields(serviceId: string, orderedFieldIds: string[]): Promise<void> {
    await this.prisma.$transaction(
      orderedFieldIds.map((fieldId, index) =>
        this.prisma.formField.updateMany({
          where: { id: fieldId, serviceId },
          data: { order: index },
        }),
      ),
    );
  }

  async nextFieldOrder(serviceId: string): Promise<number> {
    const result = await this.prisma.formField.aggregate({
      where: { serviceId },
      _max: { order: true },
    });
    return (result._max.order ?? -1) + 1;
  }

  async countFieldValues(fieldId: string): Promise<number> {
    return this.prisma.requestField.count({ where: { fieldId } });
  }
}
