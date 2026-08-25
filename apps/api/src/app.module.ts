import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';
import { AuditModule } from './shared/infrastructure/audit/audit.module';
import { MailModule } from './shared/infrastructure/mail/mail.module';
import { StorageModule } from './shared/infrastructure/storage/storage.module';
import { DomainExceptionFilter } from './shared/presentation/filters/domain-exception.filter';
import { IamModule } from './modules/iam/iam.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { RequestsModule } from './modules/requests/requests.module';
import { AuditLogModule } from './modules/audit/audit-log.module';
import { ContactModule } from './modules/contact/contact.module';
import { JwtAuthGuard } from './modules/iam/presentation/guards/jwt-auth.guard';
import { RolesGuard } from './modules/iam/presentation/guards/roles.guard';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
      // A raiz do monorepo é o local canónico do .env; o segundo caminho
      // permite sobrepor definições só para a API.
      envFilePath: ['../../.env', '.env'],
    }),

    // Rate limiting global. Limites mais apertados são declarados por rota
    // com @Throttle (login, submissão pública).
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: (config.get<number>('throttle.ttl') ?? 60) * 1000,
          limit: config.get<number>('throttle.limit') ?? 60,
        },
      ],
    }),

    PrismaModule,
    AuditModule,
    MailModule,
    StorageModule,

    IamModule,
    CatalogModule,
    RequestsModule,
    AuditLogModule,
    ContactModule,
  ],
  controllers: [HealthController],
  providers: [
    // A ordem importa: autenticação, depois RBAC, depois rate limiting.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
})
export class AppModule {}
