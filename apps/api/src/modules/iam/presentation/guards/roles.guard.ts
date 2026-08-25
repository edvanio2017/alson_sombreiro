import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLE_LABELS, type RoleName } from '@alson/shared';
import { ForbiddenError } from '../../../../shared/domain/domain-error';
import type { ActorContext } from '../../../../shared/application/pagination';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * RBAC. Os perfis são hierárquicos: ADMIN > GESTOR > AGENTE.
 * Exigir `@Roles('GESTOR')` autoriza também os administradores.
 */
const HIERARCHY: Record<RoleName, number> = { ADMIN: 3, GESTOR: 2, AGENTE: 1 };

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest<{ user?: ActorContext }>().user;
    if (!user) throw new ForbiddenError();

    const minimumRequired = Math.min(...required.map((role) => HIERARCHY[role]));
    if (HIERARCHY[user.role] >= minimumRequired) return true;

    const requiredLabels = required.map((role) => ROLE_LABELS[role]).join(' ou ');
    throw new ForbiddenError(`Esta operação requer o perfil ${requiredLabels}.`);
  }
}
