import { z } from 'zod';

/**
 * Validação do ambiente no arranque. Se faltar uma variável crítica a
 * aplicação falha imediatamente em vez de rebentar em produção mais tarde.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url('DATABASE_URL tem de ser um URL PostgreSQL válido.'),
  API_PORT: z.coerce.number().int().positive().default(3333),
  API_PREFIX: z.string().default('api'),
  CORS_ORIGINS: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET deve ter pelo menos 16 caracteres.'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET deve ter pelo menos 16 caracteres.'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),
  STORAGE_LOCAL_PATH: z.string().default('./storage/uploads'),
  UPLOAD_MAX_FILE_SIZE: z.coerce.number().int().positive().default(10 * 1024 * 1024),
  MAIL_HOST: z.string().default('localhost'),
  MAIL_PORT: z.coerce.number().int().positive().default(1025),
});

export function validateEnv(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  · ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Configuração de ambiente inválida:\n${details}\n`);
  }

  // Devolve o ambiente original acrescido dos valores por omissão aplicados.
  return { ...config, ...result.data };
}
