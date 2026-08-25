import { Module } from '@nestjs/common';
import { GetPublicCatalogUseCase } from './application/use-cases/get-public-catalog.use-case';
import { ManageFormFieldsUseCase } from './application/use-cases/manage-form-fields.use-case';
import { ManageServicesUseCase } from './application/use-cases/manage-services.use-case';
import { SERVICE_REPOSITORY } from './domain/repositories/service.repository';
import { PrismaServiceRepository } from './infrastructure/prisma-service.repository';
import { PublicCatalogController } from './presentation/public-catalog.controller';
import { ServicesController } from './presentation/services.controller';

@Module({
  controllers: [PublicCatalogController, ServicesController],
  providers: [
    ManageServicesUseCase,
    ManageFormFieldsUseCase,
    GetPublicCatalogUseCase,
    { provide: SERVICE_REPOSITORY, useClass: PrismaServiceRepository },
  ],
  // O módulo de pedidos precisa do catálogo para validar submissões.
  exports: [SERVICE_REPOSITORY],
})
export class CatalogModule {}
