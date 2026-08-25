import { Injectable, type PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';
import { ValidationError } from '../../domain/domain-error';

/**
 * Pipe de validação baseado em Zod, para os payloads cuja forma é conhecida
 * em tempo de compilação. Os formulários dinâmicos usam antes
 * `validateFormData` do pacote partilhado, dentro do caso de uso.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);

    if (result.success) return result.data;

    const details: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_form';
      (details[key] ??= []).push(issue.message);
    }

    throw new ValidationError('Os dados submetidos são inválidos.', details);
  }
}
