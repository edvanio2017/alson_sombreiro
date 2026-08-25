import { SetMetadata } from '@nestjs/common';
import type { RoleName } from '@alson/shared';

export const ROLES_KEY = 'roles';

/** Exige o perfil indicado (ou superior na hierarquia). */
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
