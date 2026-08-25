import type { RequestStatus } from '../entities/request-status.entity';

export const REQUEST_STATUS_REPOSITORY = Symbol('REQUEST_STATUS_REPOSITORY');

export interface RequestStatusWriteData {
  key?: string;
  name?: string;
  color?: string;
  order?: number;
  isInitial?: boolean;
  isFinal?: boolean;
  notifyRequester?: boolean;
  active?: boolean;
}

export interface RequestStatusRepository {
  findById(id: string): Promise<RequestStatus | null>;
  findByKey(key: string): Promise<RequestStatus | null>;
  /** Estado inicial do pipeline, atribuído a todos os pedidos novos. */
  findInitial(): Promise<RequestStatus | null>;
  list(onlyActive?: boolean): Promise<RequestStatus[]>;
  create(data: RequestStatusWriteData & { name: string }): Promise<RequestStatus>;
  update(id: string, data: RequestStatusWriteData): Promise<RequestStatus>;
  delete(id: string): Promise<void>;
  /** Garante um único estado inicial: desmarca os restantes. */
  clearInitialFlag(exceptId: string): Promise<void>;
  countRequests(statusId: string): Promise<number>;
  reorder(orderedIds: string[]): Promise<void>;
}
