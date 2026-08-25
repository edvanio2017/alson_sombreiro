import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ValidationError } from '../../../shared/domain/domain-error';
import { PUBLIC_SUBMIT_THROTTLE, TRACK_THROTTLE } from '../../../config/throttle';
import { ZodValidationPipe } from '../../../shared/presentation/pipes/zod-validation.pipe';
import { RequestOrigin } from '../../../shared/presentation/decorators/current-user.decorator';
import { Public } from '../../iam/presentation/decorators/public.decorator';
import {
  SubmitRequestUseCase,
  type UploadedFile,
} from '../application/use-cases/submit-request.use-case';
import { TrackRequestUseCase } from '../application/use-cases/track-request.use-case';
import {
  submitRequestSchema,
  trackRequestSchema,
  SubmitRequestBody,
  type TrackRequestDto,
} from './dto/request.dto';

/**
 * Endpoints públicos de submissão e consulta de pedidos.
 *
 * A submissão aceita `application/json` (formulários sem anexos) e
 * `multipart/form-data`. Neste caso o corpo vem no campo `payload` e os
 * ficheiros em campos com o nome da chave do campo do formulário.
 */
@ApiTags('Público · Pedidos')
@Public()
@Controller('public/requests')
export class PublicRequestsController {
  constructor(
    private readonly submitRequest: SubmitRequestUseCase,
    private readonly trackRequest: TrackRequestUseCase,
  ) {}

  @Post(':serviceSlug')
  @HttpCode(HttpStatus.CREATED)
  // Rate limiting específico, configurável por PUBLIC_SUBMIT_LIMIT/TTL.
  @Throttle({ default: PUBLIC_SUBMIT_THROTTLE })
  @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: 10 * 1024 * 1024, files: 10 } }))
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiParam({ name: 'serviceSlug', example: 'avaliacao-imobiliaria' })
  @ApiBody({ type: SubmitRequestBody })
  @ApiOperation({
    summary: 'Submeter um pedido de serviço',
    description:
      'Valida os dados contra o formulário configurado no backoffice, gera o número de referência, guarda os anexos e envia o e-mail de confirmação.',
  })
  @ApiResponse({ status: 201, description: 'Pedido criado; devolve a referência atribuída.' })
  @ApiResponse({ status: 400, description: 'Erros de validação, por campo, em `details`.' })
  @ApiResponse({ status: 404, description: 'Serviço inexistente ou não publicado.' })
  @ApiResponse({ status: 429, description: 'Limite de submissões excedido.' })
  async submit(
    @Param('serviceSlug') serviceSlug: string,
    @Body() rawBody: Record<string, unknown>,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @RequestOrigin() origin: { ip?: string; userAgent?: string },
  ) {
    const body = new ZodValidationPipe(submitRequestSchema).transform(
      this.extractPayload(rawBody),
    ) as ReturnType<typeof submitRequestSchema.parse>;

    const created = await this.submitRequest.execute({
      serviceSlug,
      requester: body.requester,
      data: body.data,
      files: files.map<UploadedFile>((file) => ({
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      })),
      honeypot: body.website,
      renderedAt: body.renderedAt,
      sourceIp: origin.ip,
      sourceAgent: origin.userAgent,
    });

    return {
      id: created.id,
      reference: created.reference,
      status: created.status.name,
      submittedAt: created.createdAt,
      message:
        'Pedido submetido com sucesso. Enviámos a confirmação para o e-mail indicado. Guarde o número de referência.',
    };
  }

  /**
   * Em `multipart/form-data` os valores chegam como texto: o corpo real vai
   * no campo `payload`, em JSON.
   */
  private extractPayload(rawBody: Record<string, unknown>): unknown {
    if (typeof rawBody?.payload !== 'string') return rawBody;

    try {
      return JSON.parse(rawBody.payload);
    } catch {
      throw new ValidationError('Corpo do pedido malformado.', {
        payload: ['Não foi possível interpretar os dados submetidos.'],
      });
    }
  }

  @Get('track')
  @Throttle({ default: TRACK_THROTTLE })
  @ApiOperation({
    summary: 'Consultar o estado de um pedido',
    description: 'Exige a referência e o e-mail usado na submissão.',
  })
  @ApiResponse({ status: 200, description: 'Vista pública do pedido (sem dados internos).' })
  @ApiResponse({ status: 404, description: 'Referência e e-mail não correspondem a nenhum pedido.' })
  track(@Query(new ZodValidationPipe(trackRequestSchema)) query: TrackRequestDto) {
    return this.trackRequest.execute(query.reference, query.email);
  }
}
