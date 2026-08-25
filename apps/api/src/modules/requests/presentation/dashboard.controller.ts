import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../../../shared/presentation/pipes/zod-validation.pipe';
import { DashboardMetricsUseCase } from '../application/use-cases/dashboard-metrics.use-case';
import { Roles } from '../../iam/presentation/decorators/roles.decorator';
import { metricsQuerySchema, type MetricsQuery } from './dto/request.dto';

@ApiTags('Backoffice · Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@Roles('AGENTE')
export class DashboardController {
  constructor(private readonly metrics: DashboardMetricsUseCase) {}

  @Get('metrics')
  @ApiOperation({
    summary: 'Indicadores do dashboard',
    description: 'Totais, distribuição por estado, por serviço, por período (12 meses) e por responsável.',
  })
  @ApiResponse({ status: 200, description: 'Conjunto de indicadores agregados.' })
  get(@Query(new ZodValidationPipe(metricsQuerySchema)) query: MetricsQuery) {
    return this.metrics.execute({ dateFrom: query.dateFrom, dateTo: query.dateTo });
  }
}
