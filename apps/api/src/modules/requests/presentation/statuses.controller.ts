import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../../../shared/presentation/pipes/zod-validation.pipe';
import { CurrentUser } from '../../../shared/presentation/decorators/current-user.decorator';
import type { ActorContext } from '../../../shared/application/pagination';
import { ManageStatusesUseCase } from '../application/use-cases/manage-statuses.use-case';
import { Roles } from '../../iam/presentation/decorators/roles.decorator';
import {
  createStatusSchema,
  reorderStatusesSchema,
  updateStatusSchema,
  type CreateStatusDto,
  type ReorderStatusesDto,
  type UpdateStatusDto,
} from './dto/request.dto';

@ApiTags('Backoffice · Pipeline de estados')
@ApiBearerAuth()
@Controller('request-statuses')
export class StatusesController {
  constructor(private readonly statuses: ManageStatusesUseCase) {}

  @Get()
  @Roles('AGENTE')
  @ApiOperation({ summary: 'Listar os estados do pipeline' })
  @ApiQuery({ name: 'onlyActive', required: false, enum: ['true', 'false'] })
  list(@Query('onlyActive') onlyActive?: string) {
    return this.statuses.list(onlyActive === 'true');
  }

  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar um estado (nova coluna no Kanban)' })
  @ApiResponse({ status: 201, description: 'Estado criado.' })
  create(
    @Body(new ZodValidationPipe(createStatusSchema)) body: CreateStatusDto,
    @CurrentUser() actor: ActorContext,
  ) {
    return this.statuses.create(body, actor);
  }

  @Patch('reorder')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Reordenar as colunas do pipeline' })
  reorder(
    @Body(new ZodValidationPipe(reorderStatusesSchema)) body: ReorderStatusesDto,
    @CurrentUser() actor: ActorContext,
  ) {
    return this.statuses.reorder(body.statusIds, actor);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Actualizar um estado' })
  @ApiResponse({ status: 422, description: 'Regra do pipeline violada (estado inicial, último activo, com pedidos).' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateStatusSchema)) body: UpdateStatusDto,
    @CurrentUser() actor: ActorContext,
  ) {
    return this.statuses.update(id, body, actor);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover um estado sem pedidos associados' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: ActorContext,
  ): Promise<void> {
    await this.statuses.remove(id, actor);
  }
}
