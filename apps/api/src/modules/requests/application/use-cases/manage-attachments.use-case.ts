import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AttachmentDto } from '@alson/shared';
import { NotFoundError, ValidationError } from '../../../../shared/domain/domain-error';
import {
  STORAGE_SERVICE,
  type StoragePort,
} from '../../../../shared/application/ports/storage.port';
import { AuditService } from '../../../../shared/infrastructure/audit/audit.service';
import type { ActorContext } from '../../../../shared/application/pagination';
import type { AppConfig } from '../../../../config/configuration';
import {
  REQUEST_REPOSITORY,
  type AttachmentToPersist,
  type RequestRepository,
} from '../../domain/repositories/request.repository';
import type { UploadedFile } from './submit-request.use-case';

/** Gestão de anexos de um pedido a partir do backoffice. */
@Injectable()
export class ManageAttachmentsUseCase {
  constructor(
    @Inject(REQUEST_REPOSITORY) private readonly requests: RequestRepository,
    @Inject(STORAGE_SERVICE) private readonly storage: StoragePort,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async upload(
    requestId: string,
    files: UploadedFile[],
    actor: ActorContext,
  ): Promise<AttachmentDto[]> {
    const request = await this.requests.findById(requestId);
    if (!request) throw new NotFoundError('Pedido', requestId);

    if (files.length === 0) {
      throw new ValidationError('Nenhum ficheiro recebido.', {
        files: ['Seleccione pelo menos um ficheiro.'],
      });
    }

    const storageConfig = this.config.getOrThrow<AppConfig['storage']>('storage');
    const toPersist: AttachmentToPersist[] = [];

    for (const file of files) {
      if (file.size > storageConfig.maxFileSize) {
        throw new ValidationError('Ficheiro demasiado grande.', {
          files: [`"${file.originalname}" excede o tamanho máximo permitido.`],
        });
      }
      if (
        storageConfig.allowedMimeTypes.length > 0 &&
        !storageConfig.allowedMimeTypes.includes(file.mimetype)
      ) {
        throw new ValidationError('Tipo de ficheiro não permitido.', {
          files: [`"${file.originalname}" tem um formato não permitido.`],
        });
      }

      const stored = await this.storage.save(
        { originalName: file.originalname, mimeType: file.mimetype, buffer: file.buffer },
        request.reference,
      );

      toPersist.push({
        // Anexos adicionados no backoffice não pertencem a nenhum campo.
        fieldKey: null,
        originalName: file.originalname,
        storedName: stored.storedName,
        path: stored.path,
        mimeType: file.mimetype,
        size: stored.size,
        checksum: stored.checksum,
        uploadedById: actor.userId,
      });
    }

    const created = await this.requests.addAttachments(requestId, toPersist);

    for (const attachment of created) {
      await this.requests.appendHistory({
        requestId,
        event: 'ANEXO_ADICIONADO',
        description: `Anexo "${attachment.originalName}" adicionado.`,
        toValue: attachment.originalName,
        authorId: actor.userId,
        metadata: { attachmentId: attachment.id },
      });
      await this.audit.record({
        entity: 'Attachment',
        entityId: attachment.id,
        action: 'CREATE',
        actor,
      });
    }

    return created;
  }

  /** Devolve o conteúdo de um anexo, validando que pertence ao pedido indicado. */
  async download(
    requestId: string,
    attachmentId: string,
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    const attachment = await this.requests.findAttachment(attachmentId);
    if (!attachment || attachment.requestId !== requestId) {
      throw new NotFoundError('Anexo', attachmentId);
    }

    if (!(await this.storage.exists(attachment.path))) {
      throw new NotFoundError('Ficheiro do anexo', attachment.originalName);
    }

    return {
      buffer: await this.storage.read(attachment.path),
      filename: attachment.originalName,
      mimeType: attachment.mimeType,
    };
  }

  /**
   * Remoção lógica: o ficheiro permanece em disco e o registo mantém-se para
   * efeitos de auditoria, deixando apenas de ser listado.
   */
  async remove(requestId: string, attachmentId: string, actor: ActorContext): Promise<void> {
    const attachment = await this.requests.findAttachment(attachmentId);
    if (!attachment || attachment.requestId !== requestId) {
      throw new NotFoundError('Anexo', attachmentId);
    }

    await this.requests.softDeleteAttachment(attachmentId);

    await this.requests.appendHistory({
      requestId,
      event: 'ANEXO_REMOVIDO',
      description: `Anexo "${attachment.originalName}" removido.`,
      fromValue: attachment.originalName,
      authorId: actor.userId,
      metadata: { attachmentId },
    });

    await this.audit.record({
      entity: 'Attachment',
      entityId: attachmentId,
      action: 'DELETE',
      actor,
    });
  }
}
