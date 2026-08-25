import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { ActorContext } from '../../application/pagination';

/**
 * Injecta o actor autenticado (utilizador + metadados do pedido HTTP)
 * nos controladores, já no formato que a camada de aplicação espera.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ActorContext => {
    const request = context.switchToHttp().getRequest<Request & { user?: ActorContext }>();
    const user = request.user;

    if (!user) {
      throw new Error('CurrentUser usado numa rota sem JwtAuthGuard.');
    }

    return {
      ...user,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    };
  },
);

/** Metadados de origem de um pedido público (sem autenticação). */
export const RequestOrigin = createParamDecorator(
  (_data: unknown, context: ExecutionContext): { ip?: string; userAgent?: string } => {
    const request = context.switchToHttp().getRequest<Request>();
    return { ip: request.ip, userAgent: request.headers['user-agent'] };
  },
);
