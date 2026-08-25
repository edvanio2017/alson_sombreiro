import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import type { AppConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('port') ?? 3333;
  const prefix = config.get<string>('apiPrefix') ?? 'api';
  const corsOrigins = config.get<string[]>('corsOrigins') ?? [];
  const isProduction = config.get<string>('nodeEnv') === 'production';

  app.setGlobalPrefix(prefix);

  // Cabeçalhos de segurança. A CSP fica desligada porque a API só devolve
  // JSON e ficheiros; quem serve HTML são os frontends Nuxt.
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Necessário para que o rate limiting veja o IP real atrás de proxy/nginx.
  app.set('trust proxy', 1);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
  );

  if (!isProduction) {
    const site = config.getOrThrow<AppConfig['site']>('site');
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('API Alson Sombreiro Consultadoria')
        .setDescription(
          'Serviços REST do site institucional e do backoffice com Mini CRM.\n\n' +
            'Autenticação: JWT Bearer com refresh token. Os endpoints sob `/public` não requerem autenticação.',
        )
        .setVersion('1.0.0')
        .addBearerAuth()
        .addServer(`http://localhost:${port}/${prefix}`, 'Ambiente local')
        .setContact('Alson Sombreiro Consultadoria, Lda', site.publicUrl, 'geral@alsonsombreiro.ao')
        .build(),
    );

    SwaggerModule.setup(`${prefix}/docs`, app, document, {
      customSiteTitle: 'API Alson Sombreiro',
      swaggerOptions: { persistAuthorization: true, tagsSorter: 'alpha' },
    });
  }

  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');

  logger.log(`API a correr em http://localhost:${port}/${prefix}`);
  if (!isProduction) {
    logger.log(`Documentação disponível em http://localhost:${port}/${prefix}/docs`);
  }
}

void bootstrap();
