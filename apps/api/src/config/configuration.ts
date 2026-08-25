/**
 * Configuração centralizada da aplicação.
 * Todas as variáveis de ambiente entram no sistema por aqui: nenhum outro
 * ficheiro deve ler `process.env` directamente.
 */
export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  apiPrefix: string;
  corsOrigins: string[];
  jwt: {
    accessSecret: string;
    accessTtl: string;
    refreshSecret: string;
    refreshTtl: string;
  };
  bcryptRounds: number;
  storage: {
    driver: 'local';
    localPath: string;
    maxFileSize: number;
    maxFiles: number;
    allowedMimeTypes: string[];
  };
  mail: {
    host: string;
    port: number;
    secure: boolean;
    user?: string;
    password?: string;
    fromName: string;
    fromAddress: string;
    internalRecipient: string;
  };
  throttle: {
    ttl: number;
    limit: number;
    publicSubmitTtl: number;
    publicSubmitLimit: number;
  };
  antiSpam: {
    honeypotField: string;
    minFillTimeMs: number;
  };
  site: {
    publicUrl: string;
    adminUrl: string;
    name: string;
  };
}

const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toList = (value: string | undefined, fallback: string[] = []): string[] =>
  value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : fallback;

export default (): AppConfig => ({
  nodeEnv: (process.env.NODE_ENV as AppConfig['nodeEnv']) ?? 'development',
  port: toInt(process.env.API_PORT, 3333),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  corsOrigins: toList(process.env.CORS_ORIGINS, [
    'http://localhost:3000',
    'http://localhost:3001',
  ]),
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  },
  bcryptRounds: toInt(process.env.BCRYPT_ROUNDS, 10),
  storage: {
    driver: 'local',
    localPath: process.env.STORAGE_LOCAL_PATH ?? './storage/uploads',
    maxFileSize: toInt(process.env.UPLOAD_MAX_FILE_SIZE, 10 * 1024 * 1024),
    maxFiles: toInt(process.env.UPLOAD_MAX_FILES, 10),
    allowedMimeTypes: toList(process.env.UPLOAD_ALLOWED_MIME, [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]),
  },
  mail: {
    host: process.env.MAIL_HOST ?? 'localhost',
    port: toInt(process.env.MAIL_PORT, 1025),
    secure: process.env.MAIL_SECURE === 'true',
    user: process.env.MAIL_USER || undefined,
    password: process.env.MAIL_PASSWORD || undefined,
    fromName: process.env.MAIL_FROM_NAME ?? 'Alson Sombreiro Consultadoria',
    fromAddress: process.env.MAIL_FROM_ADDRESS ?? 'nao-responder@alsonsombreiro.ao',
    internalRecipient: process.env.MAIL_INTERNAL_RECIPIENT ?? 'geral@alsonsombreiro.ao',
  },
  throttle: {
    ttl: toInt(process.env.THROTTLE_TTL, 60),
    limit: toInt(process.env.THROTTLE_LIMIT, 60),
    publicSubmitTtl: toInt(process.env.PUBLIC_SUBMIT_TTL, 3600),
    publicSubmitLimit: toInt(process.env.PUBLIC_SUBMIT_LIMIT, 5),
  },
  antiSpam: {
    honeypotField: process.env.ANTISPAM_HONEYPOT_FIELD ?? 'website',
    minFillTimeMs: toInt(process.env.ANTISPAM_MIN_FILL_TIME_MS, 3000),
  },
  site: {
    publicUrl: process.env.NUXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    adminUrl: process.env.ADMIN_URL ?? 'http://localhost:3001',
    name: process.env.NUXT_PUBLIC_SITE_NAME ?? 'Alson Sombreiro Consultadoria',
  },
});
