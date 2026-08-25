import type { FieldOption, FieldType, FieldValidationRules } from '@alson/shared';
import type { NormalizedPagination } from '../../../../shared/application/pagination';
import type { Service } from '../entities/service.entity';
import type { FormField } from '../entities/form-field.entity';

export const SERVICE_REPOSITORY = Symbol('SERVICE_REPOSITORY');

export interface ServiceFilters {
  search?: string;
  active?: boolean;
  featured?: boolean;
}

export interface ServiceWriteData {
  slug?: string;
  name?: string;
  shortDescription?: string;
  description?: string;
  benefits?: string[];
  icon?: string | null;
  coverImage?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImage?: string | null;
  featured?: boolean;
  order?: number;
  active?: boolean;
}

export interface FormFieldWriteData {
  key?: string;
  label?: string;
  type?: FieldType;
  placeholder?: string | null;
  helpText?: string | null;
  required?: boolean;
  order?: number;
  width?: number;
  options?: FieldOption[];
  validation?: FieldValidationRules;
  active?: boolean;
}

export interface ServiceRepository {
  findById(id: string, includeInactiveFields?: boolean): Promise<Service | null>;
  findBySlug(slug: string, onlyActive?: boolean): Promise<Service | null>;
  list(
    filters: ServiceFilters,
    pagination: NormalizedPagination,
  ): Promise<{ items: Service[]; total: number }>;
  /** Listagem completa sem paginação, usada no site público e nos filtros. */
  listAll(filters: ServiceFilters): Promise<Service[]>;
  slugExists(slug: string, exceptId?: string): Promise<boolean>;
  create(data: Required<Pick<ServiceWriteData, 'slug' | 'name'>> & ServiceWriteData): Promise<Service>;
  update(id: string, data: ServiceWriteData): Promise<Service>;
  softDelete(id: string): Promise<void>;
  /** Nº de pedidos associados. Impede apagar serviços com histórico. */
  countRequests(serviceId: string): Promise<number>;

  // -- Campos de formulário ---------------------------------------------------
  createField(serviceId: string, data: FormFieldWriteData): Promise<FormField>;
  updateField(fieldId: string, data: FormFieldWriteData): Promise<FormField>;
  deleteField(fieldId: string): Promise<void>;
  reorderFields(serviceId: string, orderedFieldIds: string[]): Promise<void>;
  nextFieldOrder(serviceId: string): Promise<number>;
  countFieldValues(fieldId: string): Promise<number>;
}
