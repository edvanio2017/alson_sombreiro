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
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FIELD_TYPE_LABELS, FIELD_TYPES } from '@alson/shared';
import { ZodValidationPipe } from '../../../shared/presentation/pipes/zod-validation.pipe';
import { CurrentUser } from '../../../shared/presentation/decorators/current-user.decorator';
import type { ActorContext } from '../../../shared/application/pagination';
import { ManageServicesUseCase } from '../application/use-cases/manage-services.use-case';
import { ManageFormFieldsUseCase } from '../application/use-cases/manage-form-fields.use-case';
import { Roles } from '../../iam/presentation/decorators/roles.decorator';
import {
  createFormFieldSchema,
  createServiceSchema,
  listServicesQuerySchema,
  reorderFieldsSchema,
  updateFormFieldSchema,
  updateServiceSchema,
  CreateFormFieldBody,
  CreateServiceBody,
  type CreateFormFieldDto,
  type CreateServiceDto,
  type ListServicesQuery,
  type ReorderFieldsDto,
  type UpdateFormFieldDto,
  type UpdateServiceDto,
} from './dto/service.dto';

@ApiTags('Backoffice · Serviços e formulários')
@ApiBearerAuth()
@Controller('services')
export class ServicesController {
  constructor(
    private readonly services: ManageServicesUseCase,
    private readonly fields: ManageFormFieldsUseCase,
  ) {}

  /* ------------------------------ Serviços ------------------------------- */

  @Get()
  @Roles('AGENTE')
  @ApiOperation({ summary: 'Listar serviços (inclui não publicados)' })
  list(@Query(new ZodValidationPipe(listServicesQuerySchema)) query: ListServicesQuery) {
    return this.services.list(
      { search: query.search, active: query.active, featured: query.featured },
      { page: query.page, perPage: query.perPage },
    );
  }

  @Get('field-types')
  @Roles('AGENTE')
  @ApiOperation({ summary: 'Tipos de campo suportados pelo construtor de formulários' })
  fieldTypes() {
    return FIELD_TYPES.map((type) => ({ value: type, label: FIELD_TYPE_LABELS[type] }));
  }

  @Get(':id')
  @Roles('AGENTE')
  @ApiOperation({ summary: 'Detalhe de um serviço com todos os campos' })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.services.findById(id);
  }

  @Post()
  @Roles('GESTOR')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar serviço (nasce despublicado)' })
  @ApiBody({ type: CreateServiceBody })
  @ApiResponse({ status: 201, description: 'Serviço criado.' })
  create(
    @Body(new ZodValidationPipe(createServiceSchema)) body: CreateServiceDto,
    @CurrentUser() actor: ActorContext,
  ) {
    return this.services.create(body, actor);
  }

  @Patch(':id')
  @Roles('GESTOR')
  @ApiOperation({ summary: 'Actualizar serviço' })
  @ApiResponse({ status: 422, description: 'Publicação sem campos de formulário definidos.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateServiceSchema)) body: UpdateServiceDto,
    @CurrentUser() actor: ActorContext,
  ) {
    return this.services.update(id, body, actor);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover serviço (só sem pedidos associados)' })
  @ApiResponse({ status: 422, description: 'Existem pedidos associados ao serviço.' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: ActorContext,
  ): Promise<void> {
    await this.services.remove(id, actor);
  }

  /* -------------------- Construtor de formulários ------------------------ */

  @Get(':id/fields')
  @Roles('AGENTE')
  @ApiOperation({ summary: 'Campos do formulário de um serviço' })
  listFields(@Param('id', ParseUUIDPipe) id: string) {
    return this.fields.list(id);
  }

  @Post(':id/fields')
  @Roles('GESTOR')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar campo ao formulário' })
  @ApiBody({ type: CreateFormFieldBody })
  @ApiResponse({ status: 201, description: 'Campo criado.' })
  @ApiResponse({ status: 400, description: 'Definição de campo inválida (ex.: SELECT sem opções).' })
  createField(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(createFormFieldSchema)) body: CreateFormFieldDto,
    @CurrentUser() actor: ActorContext,
  ) {
    return this.fields.create(id, body, actor);
  }

  @Patch(':id/fields/reorder')
  @Roles('GESTOR')
  @ApiOperation({ summary: 'Reordenar os campos do formulário' })
  @ApiResponse({ status: 200, description: 'Nova ordem aplicada.' })
  reorderFields(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(reorderFieldsSchema)) body: ReorderFieldsDto,
    @CurrentUser() actor: ActorContext,
  ) {
    return this.fields.reorder(id, body.fieldIds, actor);
  }

  @Patch(':id/fields/:fieldId')
  @Roles('GESTOR')
  @ApiOperation({ summary: 'Actualizar um campo do formulário' })
  @ApiResponse({ status: 422, description: 'Alteração de chave num campo já respondido.' })
  updateField(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fieldId', ParseUUIDPipe) fieldId: string,
    @Body(new ZodValidationPipe(updateFormFieldSchema)) body: UpdateFormFieldDto,
    @CurrentUser() actor: ActorContext,
  ) {
    return this.fields.update(id, fieldId, body, actor);
  }

  @Post(':id/fields/:fieldId/duplicate')
  @Roles('GESTOR')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Duplicar um campo do formulário' })
  duplicateField(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fieldId', ParseUUIDPipe) fieldId: string,
    @CurrentUser() actor: ActorContext,
  ) {
    return this.fields.duplicate(id, fieldId, actor);
  }

  @Delete(':id/fields/:fieldId')
  @Roles('GESTOR')
  @ApiOperation({
    summary: 'Remover campo do formulário',
    description:
      'Campos já usados em pedidos são desactivados em vez de apagados, preservando as respostas.',
  })
  @ApiResponse({ status: 200, description: '`{ deactivated: true }` se o campo foi apenas desactivado.' })
  removeField(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fieldId', ParseUUIDPipe) fieldId: string,
    @CurrentUser() actor: ActorContext,
  ) {
    return this.fields.remove(id, fieldId, actor);
  }
}
