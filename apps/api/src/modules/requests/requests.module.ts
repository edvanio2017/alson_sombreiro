import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { IamModule } from '../iam/iam.module';
import { DashboardMetricsUseCase } from './application/use-cases/dashboard-metrics.use-case';
import { ManageAttachmentsUseCase } from './application/use-cases/manage-attachments.use-case';
import { ManageRequestsUseCase } from './application/use-cases/manage-requests.use-case';
import { ManageStatusesUseCase } from './application/use-cases/manage-statuses.use-case';
import { SubmitRequestUseCase } from './application/use-cases/submit-request.use-case';
import { TrackRequestUseCase } from './application/use-cases/track-request.use-case';
import { REQUEST_REPOSITORY } from './domain/repositories/request.repository';
import { REQUEST_STATUS_REPOSITORY } from './domain/repositories/request-status.repository';
import { PrismaRequestRepository } from './infrastructure/prisma-request.repository';
import { PrismaRequestStatusRepository } from './infrastructure/prisma-request-status.repository';
import { DashboardController } from './presentation/dashboard.controller';
import { PublicRequestsController } from './presentation/public-requests.controller';
import { RequestsController } from './presentation/requests.controller';
import { StatusesController } from './presentation/statuses.controller';

@Module({
  // O catálogo fornece a definição dos formulários; o IAM fornece os
  // utilizadores para atribuição de responsáveis.
  imports: [CatalogModule, IamModule],
  controllers: [
    PublicRequestsController,
    RequestsController,
    StatusesController,
    DashboardController,
  ],
  providers: [
    SubmitRequestUseCase,
    TrackRequestUseCase,
    ManageRequestsUseCase,
    ManageAttachmentsUseCase,
    ManageStatusesUseCase,
    DashboardMetricsUseCase,
    { provide: REQUEST_REPOSITORY, useClass: PrismaRequestRepository },
    { provide: REQUEST_STATUS_REPOSITORY, useClass: PrismaRequestStatusRepository },
  ],
})
export class RequestsModule {}
