import type { PaginatedResult } from '@alson/shared';

export const DEFAULT_PAGE = 1;
export const DEFAULT_PER_PAGE = 20;
export const MAX_PER_PAGE = 100;

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export interface NormalizedPagination {
  page: number;
  perPage: number;
  skip: number;
  take: number;
}

export function normalizePagination(params: PaginationParams = {}): NormalizedPagination {
  const page = Math.max(1, Math.trunc(params.page ?? DEFAULT_PAGE));
  const perPage = Math.min(
    MAX_PER_PAGE,
    Math.max(1, Math.trunc(params.perPage ?? DEFAULT_PER_PAGE)),
  );

  return { page, perPage, skip: (page - 1) * perPage, take: perPage };
}

export function paginate<T>(
  items: T[],
  total: number,
  pagination: NormalizedPagination,
): PaginatedResult<T> {
  return {
    items,
    meta: {
      page: pagination.page,
      perPage: pagination.perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / pagination.perPage)),
    },
  };
}

/** Contexto do utilizador autenticado propagado às camadas de aplicação. */
export interface ActorContext {
  userId: string;
  email: string;
  role: 'ADMIN' | 'GESTOR' | 'AGENTE';
  ipAddress?: string;
  userAgent?: string;
}
