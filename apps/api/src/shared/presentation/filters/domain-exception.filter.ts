import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import type { ApiErrorResponse } from '@alson/shared';
import {
  BusinessRuleError,
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../domain/domain-error';

/**
 * Traduz erros de domínio, do Prisma e do Nest numa resposta HTTP uniforme.
 * É aqui, e só aqui, que o domínio toca em códigos HTTP.
 */
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const { status, error, message, details } = this.resolve(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url}: ${message}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ApiErrorResponse = {
      statusCode: status,
      error,
      message,
      ...(details ? { details } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(body);
  }

  private resolve(exception: unknown): {
    status: number;
    error: string;
    message: string;
    details?: Record<string, string[]>;
  } {
    if (exception instanceof DomainError) {
      return {
        status: this.statusForDomainError(exception),
        error: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      // O ThrottlerGuard responde em inglês; a mensagem chega ao utilizador
      // final no site público, por isso é traduzida aqui.
      if (status === HttpStatus.TOO_MANY_REQUESTS) {
        return {
          status,
          error: 'TOO_MANY_REQUESTS',
          message:
            'Foram feitos demasiados pedidos a partir deste endereço. Aguarde alguns minutos e tente novamente.',
        };
      }

      if (typeof payload === 'object' && payload !== null) {
        const record = payload as Record<string, unknown>;
        const rawMessage = record.message;
        return {
          status,
          error: String(record.error ?? exception.name),
          message: Array.isArray(rawMessage)
            ? 'Os dados submetidos são inválidos.'
            : String(rawMessage ?? exception.message),
          details: Array.isArray(rawMessage)
            ? { _form: rawMessage.map(String) }
            : undefined,
        };
      }
      return { status, error: exception.name, message: String(payload) };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.resolvePrismaError(exception);
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Ocorreu um erro inesperado. Por favor, tente novamente.',
    };
  }

  private statusForDomainError(exception: DomainError): number {
    if (exception instanceof NotFoundError) return HttpStatus.NOT_FOUND;
    if (exception instanceof ConflictError) return HttpStatus.CONFLICT;
    if (exception instanceof UnauthorizedError) return HttpStatus.UNAUTHORIZED;
    if (exception instanceof ForbiddenError) return HttpStatus.FORBIDDEN;
    if (exception instanceof ValidationError) return HttpStatus.BAD_REQUEST;
    if (exception instanceof BusinessRuleError) return HttpStatus.UNPROCESSABLE_ENTITY;
    return HttpStatus.BAD_REQUEST;
  }

  private resolvePrismaError(exception: Prisma.PrismaClientKnownRequestError) {
    switch (exception.code) {
      case 'P2002': {
        const target = (exception.meta?.target as string[] | undefined)?.join(', ') ?? 'campo';
        return {
          status: HttpStatus.CONFLICT,
          error: 'CONFLICT',
          message: `Já existe um registo com o mesmo valor em: ${target}.`,
        };
      }
      case 'P2003':
        return {
          status: HttpStatus.CONFLICT,
          error: 'CONFLICT',
          message: 'A operação viola uma referência existente entre registos.',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          error: 'NOT_FOUND',
          message: 'O registo indicado não foi encontrado.',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'DATABASE_ERROR',
          message: 'Erro ao aceder à base de dados.',
        };
    }
  }
}
