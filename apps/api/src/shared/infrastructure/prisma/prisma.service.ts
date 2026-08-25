import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? [{ emit: 'event', level: 'query' }, 'warn', 'error']
          : ['error'],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Ligação à base de dados estabelecida.');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Limpa todas as tabelas. Apenas para testes de integração.
   * Protegido contra execução acidental fora do ambiente de teste.
   */
  async truncateAll(): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('truncateAll() só pode ser usado em ambiente de teste.');
    }
    const tables = [
      'audit_logs',
      'request_history',
      'notes',
      'attachments',
      'request_fields',
      'requests',
      'form_fields',
      'services',
      'request_statuses',
      'refresh_tokens',
      'users',
      'roles',
      'reference_counters',
    ];
    for (const table of tables) {
      await this.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    }
  }
}
