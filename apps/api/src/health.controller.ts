import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from './shared/infrastructure/prisma/prisma.service';
import { Public } from './modules/iam/presentation/decorators/public.decorator';

@ApiTags('Sistema')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Estado da API e da ligação à base de dados' })
  async check() {
    let database = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }

    return {
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
    };
  }
}
