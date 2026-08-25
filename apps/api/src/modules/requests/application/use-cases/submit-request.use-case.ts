import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  formatFieldValue,
  validateFormData,
  type FileLike,
  type RequestDetailDto,
} from '@alson/shared';
import {
  BusinessRuleError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/domain-error';
import {
  STORAGE_SERVICE,
  type StoragePort,
} from '../../../../shared/application/ports/storage.port';
import { NotificationService } from '../../../../shared/infrastructure/mail/notification.service';
import {
  SERVICE_REPOSITORY,
  type ServiceRepository,
} from '../../../catalog/domain/repositories/service.repository';
import type { FormField } from '../../../catalog/domain/entities/form-field.entity';
import {
  REQUEST_REPOSITORY,
  type AttachmentToPersist,
  type RequestRepository,
  type SubmittedFieldValue,
} from '../../domain/repositories/request.repository';
import {
  REQUEST_STATUS_REPOSITORY,
  type RequestStatusRepository,
} from '../../domain/repositories/request-status.repository';
import type { AppConfig } from '../../../../config/configuration';

/** Ficheiro recebido do Multer, já em memória. */
export interface UploadedFile {
  /** Nome do campo do formulário a que o ficheiro pertence. */
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface SubmitRequestInput {
  serviceSlug: string;
  requester: { name: string; email: string; phone?: string | null };
  /** Valores dos campos dinâmicos, indexados pela `key` do campo. */
  data: Record<string, unknown>;
  files: UploadedFile[];
  /** Campo-armadilha: preenchido = bot. */
  honeypot?: string;
  /** Instante (epoch ms) em que o formulário foi apresentado ao utilizador. */
  renderedAt?: number;
  sourceIp?: string;
  sourceAgent?: string;
}

/**
 * Submissão de um pedido a partir do site institucional.
 *
 * É o ponto onde tudo se junta:
 *  1. carrega a definição do formulário configurada no backoffice;
 *  2. corre as verificações anti-spam;
 *  3. valida os dados com **o mesmo schema** que o browser usou (@alson/shared);
 *  4. gera a referência, guarda anexos e persiste tudo numa transacção;
 *  5. notifica requerente e equipa.
 *
 * O passo 3 é a garantia de que a validação do lado do cliente é uma
 * conveniência, nunca uma defesa: aqui ela é repetida de forma autoritativa.
 */
@Injectable()
export class SubmitRequestUseCase {
  private readonly logger = new Logger(SubmitRequestUseCase.name);

  constructor(
    @Inject(SERVICE_REPOSITORY) private readonly services: ServiceRepository,
    @Inject(REQUEST_REPOSITORY) private readonly requests: RequestRepository,
    @Inject(REQUEST_STATUS_REPOSITORY) private readonly statuses: RequestStatusRepository,
    @Inject(STORAGE_SERVICE) private readonly storage: StoragePort,
    private readonly notifications: NotificationService,
    private readonly config: ConfigService,
  ) {}

  async execute(input: SubmitRequestInput): Promise<RequestDetailDto> {
    this.assertNotSpam(input);

    const service = await this.services.findBySlug(input.serviceSlug, true);
    if (!service) throw new NotFoundError('Serviço', input.serviceSlug);

    const fields = service.publicFields;
    if (fields.length === 0) {
      throw new BusinessRuleError(
        'Este serviço ainda não tem formulário de pedido disponível. Contacte-nos por telefone ou e-mail.',
      );
    }

    const requester = this.validateRequester(input.requester);
    const filesByField = this.groupFilesByField(input.files, fields);

    // Os ficheiros entram na validação como descritores, para que as regras de
    // tamanho/extensão definidas no backoffice sejam aplicadas do lado servidor.
    const payload: Record<string, unknown> = { ...input.data };
    for (const [fieldKey, files] of filesByField) {
      payload[fieldKey] = files.map<FileLike>((file) => ({
        name: file.originalname,
        size: file.size,
        type: file.mimetype,
      }));
    }

    const fieldDtos = fields.map((field) => field.toDto());
    const validation = validateFormData(fieldDtos, payload);

    if (!validation.success) {
      throw new ValidationError(
        'Não foi possível submeter o pedido. Verifique os campos assinalados.',
        validation.errors,
      );
    }

    const reference = await this.requests.nextReference(new Date().getFullYear());
    const initialStatus = await this.statuses.findInitial();
    if (!initialStatus) {
      throw new BusinessRuleError(
        'O pipeline de estados não está configurado. Contacte o administrador do sistema.',
      );
    }

    const values = this.buildValues(fields, validation.data);
    const attachments = await this.persistFiles(filesByField, reference);

    let created: RequestDetailDto;
    try {
      created = await this.requests.create({
        reference,
        serviceId: service.id,
        statusId: initialStatus.id,
        priority: 'NORMAL',
        requesterName: requester.name,
        requesterEmail: requester.email,
        requesterPhone: requester.phone,
        sourceIp: input.sourceIp ?? null,
        sourceAgent: input.sourceAgent ?? null,
        values,
        attachments,
      });
    } catch (error) {
      // Se a persistência falhar, os ficheiros já escritos ficariam órfãos.
      await Promise.all(attachments.map((file) => this.storage.remove(file.path)));
      throw error;
    }

    await this.requests.appendHistory({
      requestId: created.id,
      event: 'CRIADO',
      description: `Pedido submetido através do site por ${requester.name}.`,
      toValue: initialStatus.name,
      authorId: null,
      metadata: { sourceIp: input.sourceIp ?? null, attachments: attachments.length },
    });

    await this.notify(created, requester, service.name, attachments.length);

    return created;
  }

  /* ----------------------------- Anti-spam -------------------------------- */

  private assertNotSpam(input: SubmitRequestInput): void {
    const antiSpam = this.config.getOrThrow<AppConfig['antiSpam']>('antiSpam');

    // 1. Honeypot: campo invisível que só um bot preenche.
    if (input.honeypot && input.honeypot.trim() !== '') {
      this.logger.warn(`Submissão bloqueada (honeypot) de ${input.sourceIp ?? 'IP desconhecido'}.`);
      throw new BusinessRuleError('Não foi possível processar o pedido.');
    }

    // 2. Tempo de preenchimento: um humano não preenche em milissegundos.
    if (input.renderedAt) {
      const elapsed = Date.now() - input.renderedAt;
      if (elapsed >= 0 && elapsed < antiSpam.minFillTimeMs) {
        this.logger.warn(
          `Submissão bloqueada (preenchimento em ${elapsed}ms) de ${input.sourceIp ?? 'IP desconhecido'}.`,
        );
        throw new BusinessRuleError(
          'O formulário foi submetido demasiado depressa. Por favor, tente novamente.',
        );
      }
    }
  }

  /* --------------------------- Requerente --------------------------------- */

  private validateRequester(requester: SubmitRequestInput['requester']) {
    const errors: Record<string, string[]> = {};
    const name = requester.name?.trim() ?? '';
    const email = requester.email?.trim().toLowerCase() ?? '';
    const phone = requester.phone?.trim() || null;

    if (name.length < 3) {
      errors['requester.name'] = ['Indique o seu nome completo.'];
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      errors['requester.email'] = ['Introduza um endereço de e-mail válido.'];
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError('Dados de contacto inválidos.', errors);
    }

    return { name, email, phone };
  }

  /* ----------------------------- Ficheiros -------------------------------- */

  private groupFilesByField(
    files: UploadedFile[],
    fields: FormField[],
  ): Map<string, UploadedFile[]> {
    const fileFieldKeys = new Set(fields.filter((field) => field.isFileField).map((f) => f.key));
    const grouped = new Map<string, UploadedFile[]>();

    for (const file of files) {
      // `documentos[0]` e `documentos` referem-se ao mesmo campo.
      const fieldKey = file.fieldname.replace(/\[\d*\]$/, '');

      if (!fileFieldKeys.has(fieldKey)) {
        throw new ValidationError('Anexo inesperado.', {
          [fieldKey]: ['Este formulário não aceita ficheiros neste campo.'],
        });
      }

      const bucket = grouped.get(fieldKey) ?? [];
      bucket.push(file);
      grouped.set(fieldKey, bucket);
    }

    return grouped;
  }

  private async persistFiles(
    filesByField: Map<string, UploadedFile[]>,
    reference: string,
  ): Promise<AttachmentToPersist[]> {
    const allowedMime = this.config.getOrThrow<AppConfig['storage']>('storage').allowedMimeTypes;
    const stored: AttachmentToPersist[] = [];

    for (const [fieldKey, files] of filesByField) {
      for (const file of files) {
        // Barreira global, para lá das regras por campo já validadas no schema.
        if (allowedMime.length > 0 && !allowedMime.includes(file.mimetype)) {
          await Promise.all(stored.map((item) => this.storage.remove(item.path)));
          throw new ValidationError('Tipo de ficheiro não permitido.', {
            [fieldKey]: [`O ficheiro "${file.originalname}" tem um formato não permitido.`],
          });
        }

        const result = await this.storage.save(
          {
            originalName: file.originalname,
            mimeType: file.mimetype,
            buffer: file.buffer,
          },
          reference,
        );

        stored.push({
          fieldKey,
          originalName: file.originalname,
          storedName: result.storedName,
          path: result.path,
          mimeType: file.mimetype,
          size: result.size,
          checksum: result.checksum,
        });
      }
    }

    return stored;
  }

  /* ------------------------------ Valores --------------------------------- */

  private buildValues(
    fields: FormField[],
    data: Record<string, unknown>,
  ): SubmittedFieldValue[] {
    return fields.map((field, index) => {
      const dto = field.toDto();
      const value = data[field.key] ?? null;

      return {
        fieldId: field.id,
        fieldKey: field.key,
        label: dto.label,
        type: dto.type,
        // Ficheiros são referenciados pelos anexos; guarda-se apenas o nome.
        value:
          dto.type === 'FILE'
            ? (Array.isArray(value) ? value : []).map((item) => (item as FileLike)?.name ?? '')
            : value,
        displayValue: formatFieldValue(dto, value),
        order: index,
      };
    });
  }

  /* --------------------------- Notificações ------------------------------- */

  private async notify(
    created: RequestDetailDto,
    requester: { name: string; email: string; phone: string | null },
    serviceName: string,
    attachmentCount: number,
  ): Promise<void> {
    const summary = created.values
      .filter((value) => value.displayValue)
      .map((value) => ({ label: value.label, displayValue: value.displayValue }));

    // Os envios são independentes: uma falha não deve impedir o outro.
    await Promise.all([
      this.notifications.sendRequestConfirmation({
        to: requester.email,
        requesterName: requester.name,
        reference: created.reference,
        serviceName,
        submittedAt: new Date(created.createdAt),
        values: summary,
        attachmentCount,
      }),
      this.notifications.sendNewRequestToTeam({
        reference: created.reference,
        requestId: created.id,
        serviceName,
        requesterName: requester.name,
        requesterEmail: requester.email,
        requesterPhone: requester.phone,
        values: summary,
      }),
    ]);
  }
}
