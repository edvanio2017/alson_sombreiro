import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Query } from '@nestjs/common';
import { GetPublicCatalogUseCase } from '../application/use-cases/get-public-catalog.use-case';
import { Public } from '../../iam/presentation/decorators/public.decorator';

/**
 * Endpoints consumidos pelo site institucional (sem autenticação).
 * Só expõem serviços publicados e campos activos.
 */
@ApiTags('Público · Catálogo')
@Public()
@Controller('public/services')
export class PublicCatalogController {
  constructor(private readonly catalog: GetPublicCatalogUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Listar serviços publicados' })
  @ApiQuery({ name: 'featured', required: false, enum: ['true', 'false'] })
  @ApiResponse({ status: 200, description: 'Serviços activos, ordenados.' })
  list(@Query('featured') featured?: string) {
    return this.catalog.listServices(featured === 'true');
  }

  @Get('sitemap')
  @ApiOperation({ summary: 'Slugs publicados para geração do sitemap' })
  sitemap() {
    return this.catalog.listSlugs();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Detalhe de um serviço e schema do seu formulário' })
  @ApiParam({ name: 'slug', example: 'avaliacao-imobiliaria' })
  @ApiResponse({ status: 200, description: 'Serviço + definição dos campos do formulário.' })
  @ApiResponse({ status: 404, description: 'Serviço inexistente ou não publicado.' })
  findBySlug(@Param('slug') slug: string) {
    return this.catalog.getBySlug(slug);
  }
}
