import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { UnauthorizedError } from '../../../../shared/domain/domain-error';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Guarda global de autenticação. Todas as rotas exigem token válido, excepto
 * as marcadas com `@Public()`, que o site institucional consome.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;
    return super.canActivate(context);
  }

  handleRequest<TUser>(error: unknown, user: TUser): TUser {
    if (error || !user) {
      throw new UnauthorizedError('Autenticação necessária para aceder a este recurso.');
    }
    return user;
  }
}
