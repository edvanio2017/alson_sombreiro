import type { RoleName } from '@alson/shared';
import type { NormalizedPagination } from '../../../../shared/application/pagination';
import type { User } from '../entities/user.entity';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserFilters {
  search?: string;
  role?: RoleName;
  active?: boolean;
}

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
  phone?: string | null;
  role: RoleName;
  active?: boolean;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  phone?: string | null;
  role?: RoleName;
  active?: boolean;
  passwordHash?: string;
}

/**
 * Porta de persistência de utilizadores.
 * O domínio declara o que precisa; a infraestrutura decide como o faz.
 */
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  list(
    filters: UserFilters,
    pagination: NormalizedPagination,
  ): Promise<{ items: User[]; total: number }>;
  create(data: CreateUserData): Promise<User>;
  update(id: string, data: UpdateUserData): Promise<User>;
  /** Remoção lógica: o histórico e a auditoria continuam a fazer sentido. */
  softDelete(id: string): Promise<void>;
  registerLogin(id: string, at: Date): Promise<void>;
  /** Nº de administradores activos, usado para não deixar o sistema sem admin. */
  countActiveAdmins(): Promise<number>;
}
