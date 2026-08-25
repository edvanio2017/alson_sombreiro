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
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PRIORITIES, PRIORITY_LABELS } from '@alson/shared';
import { ZodValidationPipe } from '../../../shared/presentation/pipes/zod-validation.pipe';
import { CurrentUser } from '../../../shared/presentation/decorators/current-user.decorator';
import type { ActorContext } from '../../../shared/application/pagination';
import { ManageRequestsUseCase } from '../application/use-cases/manage-requests.use-case';
import { ManageAttachmentsUseCase } from '../application/use-cases/manage-attachments.use-case';
import type { UploadedFile } from '../application/use-cases/submit-request.use-case';
import { Roles } from '../../iam/presentation/decorators/roles.decorator';
import {
  assignSchema,
  changePrioritySchema,
  changeStatusSchema,
  kanbanQuerySchema,
  listRequestsQuerySchema,
  noteSchema,
  ChangeStatusBody,
  type AssignDto,
  type ChangePriorityDto,
  type ChangeStatusDto,
  type KanbanQuery,
  type ListRequestsQuery,
  type NoteInputDto,
} from './dto/request.dto';

@ApiTags('Backoffice · Pedidos')
@ApiBearerAuth()
@Controller('requests')
// Todos os perfis do backoffice acedem aos pedidos; as restrições finas
// (notas de terceiros, remoção) são aplicadas nos casos de uso.
@Roles('AGENTE')
export class RequestsController {
  constructor(
    private readonly requests: ManageRequestsUseCase,
    private readonly attachments: ManageAttachmentsUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar pedidos com pesquisa, filtros e paginação' })
  @ApiResponse({ status: 200, description: 'Lista paginada de pedidos.' })
  list(@Query(new ZodValidationPipe(listRequestsQuerySchema)) query: ListRequestsQuery) {
    return this.requests.list(
      {
        search: query.search,
        serviceId: query.serviceId,
        statusId: query.statusId,
        assigneeId: query.assigneeId,
        priority: query.priority,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        openOnly: query.openOnly,
      },
      { page: query.page, perPage: query.perPage },
      { field: query.sort, direction: query.direction },
    );
  }

  @Get('kanban')
  @ApiOperation({
    summary: 'Vista Kanban',
    description: 'Uma coluna por estado activo, com o total e os pedidos mais recentes.',
  })
  kanban(@Query(new ZodValidationPipe(kanbanQuerySchema)) query: KanbanQuery) {
    return this.requests.kanban(
      {
        search: query.search,
        serviceId: query.serviceId,
        assigneeId: query.assigneeId,
        priority: query.priority,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      },
      query.limitPerColumn,
    );
  }

  @Get('priorities')
  @ApiOperation({ summary: 'Prioridades disponíveis' })
  priorities() {
    return PRIORITIES.map((priority) => ({ value: priority, label: PRIORITY_LABELS[priority] }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe completo de um pedido' })
  @ApiResponse({ status: 200, description: 'Valores, anexos, notas e timeline.' })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.requests.findById(id);
  }

  /* ------------------------------ Pipeline -------------------------------- */

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Alterar o estado de um pedido',
    description:
      'Regista a alteração na timeline com autor e data. Se o estado de destino o determinar, notifica o requerente por e-mail.',
  })
  @ApiBody({ type: ChangeStatusBody })
  @ApiResponse({ status: 200, description: 'Pedido actualizado.' })
  @ApiResponse({ status: 422, description: 'Transição inválida (estado igual ou desactivado).' })
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(changeStatusSchema)) body: ChangeStatusDto,
    @CurrentUser() actor: ActorContext,
  ) {
    return this.requests.changeStatus(id, body.statusId, actor, body.note);
  }

  @Patch(':id/assignee')
  @ApiOperation({ summary: 'Atribuir ou retirar o responsável do pedido' })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(assignSchema)) body: AssignDto,
    @CurrentUser() actor: ActorContext,
  ) {
    return this.requests.assign(id, body.assigneeId, actor);
  }

  @Patch(':id/priority')
  @ApiOperation({ summary: 'Alterar a prioridade do pedido' })
  changePriority(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(changePrioritySchema)) body: ChangePriorityDto,
    @CurrentUser() actor: ActorContext,
  ) {
    return this.requests.changePriority(id, body.priority, actor);
  }

  /* -------------------------------- Notas --------------------------------- */

  @Post(':id/notes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar nota interna' })
  addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(noteSchema)) body: NoteInputDto,
    @CurrentUser() actor: ActorContext,
  ) {
    return this.requests.addNote(id, body.body, actor);
  }

  @Patch(':id/notes/:noteId')
  @ApiOperation({ summary: 'Editar nota interna (apenas o autor ou um administrador)' })
  @ApiResponse({ status: 403, description: 'A nota pertence a outro utilizador.' })
  updateNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Body(new ZodValidationPipe(noteSchema)) body: NoteInputDto,
    @CurrentUser() actor: ActorContext,
  ) {
    return this.requests.updateNote(id, noteId, body.body, actor);
  }

  @Delete(':id/notes/:noteId')
  @ApiOperation({ summary: 'Remover nota interna (apenas o autor ou um administrador)' })
  deleteNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @CurrentUser() actor: ActorContext,
  ) {
    return this.requests.deleteNote(id, noteId, actor);
  }

  /* -------------------------------- Anexos -------------------------------- */

  @Post(':id/attachments')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: 10 * 1024 * 1024, files: 10 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Anexar documentos ao pedido' })
  uploadAttachments(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @CurrentUser() actor: ActorContext,
  ) {
    const mapped: UploadedFile[] = files.map((file) => ({
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer,
    }));
    return this.attachments.upload(id, mapped, actor);
  }

  @Get(':id/attachments/:attachmentId')
  @ApiOperation({ summary: 'Descarregar um anexo' })
  @ApiResponse({ status: 200, description: 'Conteúdo binário do ficheiro.' })
  @ApiResponse({ status: 404, description: 'Anexo inexistente ou removido.' })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @Res() response: Response,
  ): Promise<void> {
    const file = await this.attachments.download(id, attachmentId);

    response.setHeader('Content-Type', file.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.filename)}"`,
    );
    response.send(file.buffer);
  }

  @Delete(':id/attachments/:attachmentId')
  @Roles('GESTOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover um anexo (remoção lógica)' })
  async removeAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @CurrentUser() actor: ActorContext,
  ): Promise<void> {
    await this.attachments.remove(id, attachmentId, actor);
  }
}
