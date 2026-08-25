/**
 * Erros de domínio.
 *
 * A camada de domínio não conhece HTTP. Lança estes erros e é o
 * `DomainExceptionFilter` (camada de apresentação) que os traduz em respostas
 * HTTP com o código adequado.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  /** Erros de validação por campo, quando aplicável. */
  readonly details?: Record<string, string[]>;

  protected constructor(message: string, details?: Record<string, string[]>) {
    super(message);
    this.name = new.target.name;
    this.details = details;
  }
}

/** Regra de negócio violada (422 Unprocessable Entity). */
export class BusinessRuleError extends DomainError {
  readonly code = 'BUSINESS_RULE_VIOLATION';

  constructor(message: string, details?: Record<string, string[]>) {
    super(message, details);
  }
}

/** Dados de entrada inválidos (400 Bad Request). */
export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';

  constructor(message = 'Os dados submetidos são inválidos.', details?: Record<string, string[]>) {
    super(message, details);
  }
}

/** Recurso inexistente (404 Not Found). */
export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';

  constructor(resource: string, identifier?: string) {
    super(
      identifier
        ? `${resource} não encontrado(a): ${identifier}.`
        : `${resource} não encontrado(a).`,
    );
  }
}

/** Conflito com o estado actual (409 Conflict). */
export class ConflictError extends DomainError {
  readonly code = 'CONFLICT';

  constructor(message: string, details?: Record<string, string[]>) {
    super(message, details);
  }
}

/** Credenciais inválidas ou sessão expirada (401 Unauthorized). */
export class UnauthorizedError extends DomainError {
  readonly code = 'UNAUTHORIZED';

  constructor(message = 'Credenciais inválidas.') {
    super(message);
  }
}

/** Sem permissões para a operação (403 Forbidden). */
export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN';

  constructor(message = 'Não tem permissões para executar esta operação.') {
    super(message);
  }
}
