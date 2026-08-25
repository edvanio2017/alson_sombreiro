import { Inject, Injectable } from '@nestjs/common';
import { toFieldKey, type FormFieldDto } from '@alson/shared';
import { BusinessRuleError, NotFoundError } from '../../../../shared/domain/domain-error';
import type { ActorContext } from '../../../../shared/application/pagination';
import { AuditService } from '../../../../shared/infrastructure/audit/audit.service';
import { FormField } from '../../domain/entities/form-field.entity';
import {
  SERVICE_REPOSITORY,
  type FormFieldWriteData,
  type ServiceRepository,
} from '../../domain/repositories/service.repository';

/**
 * Construtor de formulários.
 *
 * Cada operação valida a definição do campo através da entidade `FormField`
 * antes de persistir: assim, um campo inválido nunca chega à base de dados
 * e o site público pode confiar no schema que recebe.
 */
@Injectable()
export class ManageFormFieldsUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY) private readonly services: ServiceRepository,
    private readonly audit: AuditService,
  ) {}

  async list(serviceId: string): Promise<FormFieldDto[]> {
    const service = await this.services.findById(serviceId, true);
    if (!service) throw new NotFoundError('Serviço', serviceId);
    return service.fields.map((field) => field.toDto());
  }

  async create(
    serviceId: string,
    input: FormFieldWriteData & { label: string; type: FormFieldDto['type'] },
    actor: ActorContext,
  ): Promise<FormFieldDto> {
    const service = await this.services.findById(serviceId, true);
    if (!service) throw new NotFoundError('Serviço', serviceId);

    // A chave é opcional no backoffice: se não vier, deriva-se do rótulo.
    const key = toFieldKey(input.key || input.label);
    service.assertFieldKeyIsAvailable(key);

    const order = input.order ?? (await this.services.nextFieldOrder(serviceId));

    // Valida a definição no domínio antes de tocar na persistência.
    FormField.create('novo', {
      serviceId,
      key,
      label: input.label,
      type: input.type,
      placeholder: input.placeholder ?? null,
      helpText: input.helpText ?? null,
      required: input.required ?? false,
      order,
      width: (input.width === 1 ? 1 : 2) as 1 | 2,
      options: input.options ?? [],
      validation: input.validation ?? {},
      active: input.active ?? true,
    });

    const created = await this.services.createField(serviceId, { ...input, key, order });

    await this.audit.record({
      entity: 'FormField',
      entityId: created.id,
      action: 'CREATE',
      changes: {
        serviceId: { from: null, to: serviceId },
        key: { from: null, to: created.key },
        type: { from: null, to: created.type },
      },
      actor,
    });

    return created.toDto();
  }

  async update(
    serviceId: string,
    fieldId: string,
    input: FormFieldWriteData,
    actor: ActorContext,
  ): Promise<FormFieldDto> {
    const service = await this.services.findById(serviceId, true);
    if (!service) throw new NotFoundError('Serviço', serviceId);

    const existing = service.fields.find((field) => field.id === fieldId);
    if (!existing) throw new NotFoundError('Campo de formulário', fieldId);

    const key = input.key ? toFieldKey(input.key) : existing.key;
    if (key !== existing.key) {
      service.assertFieldKeyIsAvailable(key, fieldId);

      // Alterar a chave de um campo já respondido quebraria a leitura dos
      // pedidos antigos, que são guardados por chave.
      const usage = await this.services.countFieldValues(fieldId);
      if (usage > 0) {
        throw new BusinessRuleError(
          `A chave do campo "${existing.label}" não pode ser alterada: já foi usada em ${usage} pedido(s).`,
        );
      }
    }

    const merged = { ...existing.toDto(), ...input, key };

    // Revalida a definição completa após a fusão das alterações.
    FormField.create(fieldId, {
      serviceId,
      key: merged.key,
      label: merged.label,
      type: merged.type,
      placeholder: merged.placeholder ?? null,
      helpText: merged.helpText ?? null,
      required: merged.required,
      order: merged.order,
      width: (merged.width === 1 ? 1 : 2) as 1 | 2,
      options: merged.options ?? [],
      validation: merged.validation ?? {},
      active: merged.active,
    });

    const updated = await this.services.updateField(fieldId, { ...input, key });

    const changes = this.audit.diff(existing.toDto(), updated.toDto(), ['id']);
    if (changes) {
      await this.audit.record({
        entity: 'FormField',
        entityId: fieldId,
        action: 'UPDATE',
        changes,
        actor,
      });
    }

    return updated.toDto();
  }

  /**
   * Um campo já respondido não é apagado, mas desactivado. Assim deixa de
   * aparecer no site público sem destruir as respostas já recolhidas.
   */
  async remove(serviceId: string, fieldId: string, actor: ActorContext): Promise<{ deactivated: boolean }> {
    const service = await this.services.findById(serviceId, true);
    if (!service) throw new NotFoundError('Serviço', serviceId);

    const existing = service.fields.find((field) => field.id === fieldId);
    if (!existing) throw new NotFoundError('Campo de formulário', fieldId);

    const usage = await this.services.countFieldValues(fieldId);

    if (usage > 0) {
      await this.services.updateField(fieldId, { active: false });
      await this.audit.record({
        entity: 'FormField',
        entityId: fieldId,
        action: 'UPDATE',
        changes: { active: { from: true, to: false } },
        actor,
      });
      return { deactivated: true };
    }

    await this.services.deleteField(fieldId);
    await this.audit.record({ entity: 'FormField', entityId: fieldId, action: 'DELETE', actor });
    return { deactivated: false };
  }

  async reorder(
    serviceId: string,
    orderedFieldIds: string[],
    actor: ActorContext,
  ): Promise<FormFieldDto[]> {
    const service = await this.services.findById(serviceId, true);
    if (!service) throw new NotFoundError('Serviço', serviceId);

    const known = new Set(service.fields.map((field) => field.id));
    const unknown = orderedFieldIds.filter((id) => !known.has(id));
    if (unknown.length > 0) {
      throw new NotFoundError('Campo de formulário', unknown.join(', '));
    }
    if (orderedFieldIds.length !== known.size) {
      throw new BusinessRuleError('A reordenação tem de incluir todos os campos do serviço.');
    }

    await this.services.reorderFields(serviceId, orderedFieldIds);
    await this.audit.record({
      entity: 'Service',
      entityId: serviceId,
      action: 'UPDATE',
      changes: { fieldOrder: { from: [...known], to: orderedFieldIds } },
      actor,
    });

    return this.list(serviceId);
  }

  /** Duplica um campo. Atalho útil para formulários longos. */
  async duplicate(serviceId: string, fieldId: string, actor: ActorContext): Promise<FormFieldDto> {
    const service = await this.services.findById(serviceId, true);
    if (!service) throw new NotFoundError('Serviço', serviceId);

    const original = service.fields.find((field) => field.id === fieldId);
    if (!original) throw new NotFoundError('Campo de formulário', fieldId);

    const source = original.toDto();
    let key = `${source.key}_copia`;
    let suffix = 2;
    while (service.fields.some((field) => field.key === key)) {
      key = `${source.key}_copia_${suffix}`;
      suffix += 1;
    }

    return this.create(
      serviceId,
      {
        ...source,
        key,
        label: `${source.label} (cópia)`,
        order: await this.services.nextFieldOrder(serviceId),
      },
      actor,
    );
  }
}
