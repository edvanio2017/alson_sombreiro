import { Inject, Injectable } from '@nestjs/common';
import type { DashboardMetricsDto } from '@alson/shared';
import {
  REQUEST_REPOSITORY,
  type RequestRepository,
} from '../../domain/repositories/request.repository';

export interface MetricsFilter {
  dateFrom?: Date;
  dateTo?: Date;
}

/** Indicadores do dashboard: por estado, por serviço, por período e por responsável. */
@Injectable()
export class DashboardMetricsUseCase {
  constructor(@Inject(REQUEST_REPOSITORY) private readonly requests: RequestRepository) {}

  execute(filters: MetricsFilter = {}): Promise<DashboardMetricsDto> {
    return this.requests.metrics(filters);
  }
}
