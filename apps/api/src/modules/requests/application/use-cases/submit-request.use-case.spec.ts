import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { BusinessRuleError, NotFoundError, ValidationError } from '../../../../shared/domain/domain-error';
import { STORAGE_SERVICE } from '../../../../shared/application/ports/storage.port';
import { NotificationService } from '../../../../shared/infrastructure/mail/notification.service';
import { SERVICE_REPOSITORY } from '../../../catalog/domain/repositories/service.repository';
import { FormField, type FormFieldProps } from '../../../catalog/domain/entities/form-field.entity';
import { Service } from '../../../catalog/domain/entities/service.entity';
import { REQUEST_REPOSITORY } from '../../domain/repositories/request.repository';
import { REQUEST_STATUS_REPOSITORY } from '../../domain/repositories/request-status.repository';
import { RequestStatus } from '../../domain/entities/request-status.entity';
import { SubmitRequestUseCase, type SubmitRequestInput } from './submit-request.use-case';

/* ----------------------------- Auxiliares --------------------------------- */

const makeField = (overrides: Partial<FormFieldProps> & Pick<FormFieldProps, 'key' | 'type'>) =>
  FormField.create(`field-${overrides.key}`, {
    serviceId: 'servico-1',
    label: overrides.label ?? overrides.key,
    placeholder: null,
    helpText: null,
    required: false,
    order: 0,
    width: 2,
    options: [],
    validation: {},
    active: true,
    ...overrides,
  } as FormFieldProps);

const makeService = (fields: FormField[]) =>
  Service.create('servico-1', {
    slug: 'avaliacao-imobiliaria',
    name: 'Avaliação Imobiliária',
    shortDescription: 'Determinação do valor de mercado.',
    description: '',
    benefits: [],
    icon: null,
    coverImage: null,
    metaTitle: null,
    metaDescription: null,
    ogImage: null,
    featured: false,
    order: 0,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    fields,
  });

const initialStatus = RequestStatus.create('status-novo', {
  key: 'novo',
  name: 'Novo',
  color: '#3F3F46',
  order: 0,
  isInitial: true,
  isFinal: false,
  notifyRequester: false,
  active: true,
});

const baseInput = (overrides: Partial<SubmitRequestInput> = {}): SubmitRequestInput => ({
  serviceSlug: 'avaliacao-imobiliaria',
  requester: { name: 'Maria Chipenda', email: 'maria@exemplo.ao', phone: '+244 923 111 222' },
  data: {},
  files: [],
  ...overrides,
});

describe('SubmitRequestUseCase', () => {
  let useCase: SubmitRequestUseCase;
  let services: { findBySlug: jest.Mock };
  let requests: { nextReference: jest.Mock; create: jest.Mock; appendHistory: jest.Mock };
  let statuses: { findInitial: jest.Mock };
  let storage: { save: jest.Mock; remove: jest.Mock; read: jest.Mock; exists: jest.Mock };
  let notifications: { sendRequestConfirmation: jest.Mock; sendNewRequestToTeam: jest.Mock };

  const config = {
    getOrThrow: (key: string) => {
      if (key === 'antiSpam') return { honeypotField: 'website', minFillTimeMs: 3000 };
      if (key === 'storage') {
        return { allowedMimeTypes: ['application/pdf'], maxFileSize: 10 * 1024 * 1024 };
      }
      throw new Error(`Chave de configuração inesperada: ${key}`);
    },
  };

  beforeEach(async () => {
    services = { findBySlug: jest.fn() };
    requests = {
      nextReference: jest.fn().mockResolvedValue('AS-2026-000042'),
      create: jest.fn(),
      appendHistory: jest.fn().mockResolvedValue(undefined),
    };
    statuses = { findInitial: jest.fn().mockResolvedValue(initialStatus) };
    storage = {
      save: jest.fn().mockImplementation((file: { originalName: string; buffer: Buffer }) => ({
        storedName: `stored-${file.originalName}`,
        path: `AS-2026-000042/stored-${file.originalName}`,
        size: file.buffer.byteLength,
        checksum: 'checksum',
      })),
      remove: jest.fn().mockResolvedValue(undefined),
      read: jest.fn(),
      exists: jest.fn(),
    };
    notifications = {
      sendRequestConfirmation: jest.fn().mockResolvedValue(undefined),
      sendNewRequestToTeam: jest.fn().mockResolvedValue(undefined),
    };

    requests.create.mockImplementation(async (data) => ({
      id: 'pedido-1',
      reference: data.reference,
      requesterName: data.requesterName,
      requesterEmail: data.requesterEmail,
      requesterPhone: data.requesterPhone,
      service: { id: data.serviceId, name: 'Avaliação Imobiliária', slug: 'avaliacao-imobiliaria' },
      status: initialStatus.toDto(),
      priority: data.priority,
      assignee: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      values: data.values,
      attachments: data.attachments,
      history: [],
      notes: [],
    }));

    const moduleRef = await Test.createTestingModule({
      providers: [
        SubmitRequestUseCase,
        { provide: SERVICE_REPOSITORY, useValue: services },
        { provide: REQUEST_REPOSITORY, useValue: requests },
        { provide: REQUEST_STATUS_REPOSITORY, useValue: statuses },
        { provide: STORAGE_SERVICE, useValue: storage },
        { provide: NotificationService, useValue: notifications },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    useCase = moduleRef.get(SubmitRequestUseCase);
  });

  describe('submissão válida', () => {
    beforeEach(() => {
      services.findBySlug.mockResolvedValue(
        makeService([
          makeField({ key: 'tipo_imovel', type: 'TEXT', required: true, label: 'Tipo de imóvel' }),
          makeField({ key: 'area_m2', type: 'NUMBER', required: true, validation: { min: 1 } }),
          makeField({ key: 'observacoes', type: 'TEXTAREA' }),
        ]),
      );
    });

    it('cria o pedido no estado inicial com a referência gerada', async () => {
      const result = await useCase.execute(
        baseInput({ data: { tipo_imovel: 'Apartamento', area_m2: '145' } }),
      );

      expect(result.reference).toBe('AS-2026-000042');
      expect(requests.create).toHaveBeenCalledWith(
        expect.objectContaining({ statusId: 'status-novo', priority: 'NORMAL' }),
      );
    });

    it('guarda os valores já normalizados pelo schema', async () => {
      await useCase.execute(baseInput({ data: { tipo_imovel: '  Apartamento ', area_m2: '145' } }));

      const values = requests.create.mock.calls[0][0].values;
      expect(values).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ fieldKey: 'tipo_imovel', value: 'Apartamento' }),
          // O texto "145" chega convertido em número.
          expect.objectContaining({ fieldKey: 'area_m2', value: 145 }),
        ]),
      );
    });

    it('regista a criação na timeline sem autor', async () => {
      await useCase.execute(baseInput({ data: { tipo_imovel: 'Moradia', area_m2: '300' } }));

      expect(requests.appendHistory).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'CRIADO', authorId: null, toValue: 'Novo' }),
      );
    });

    it('envia confirmação ao requerente e aviso à equipa', async () => {
      await useCase.execute(baseInput({ data: { tipo_imovel: 'Moradia', area_m2: '300' } }));

      expect(notifications.sendRequestConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'maria@exemplo.ao', reference: 'AS-2026-000042' }),
      );
      expect(notifications.sendNewRequestToTeam).toHaveBeenCalledWith(
        expect.objectContaining({ reference: 'AS-2026-000042' }),
      );
    });
  });

  describe('validação do lado do servidor', () => {
    beforeEach(() => {
      services.findBySlug.mockResolvedValue(
        makeService([
          makeField({ key: 'tipo_imovel', type: 'TEXT', required: true }),
          makeField({ key: 'area_m2', type: 'NUMBER', required: true, validation: { min: 10 } }),
        ]),
      );
    });

    it('recusa dados que passariam ao contornar o formulário do site', async () => {
      const promise = useCase.execute(baseInput({ data: { area_m2: '2' } }));

      await expect(promise).rejects.toThrow(ValidationError);
      await expect(promise).rejects.toMatchObject({
        details: {
          tipo_imovel: ['Este campo é obrigatório.'],
          area_m2: ['O valor mínimo é 10.'],
        },
      });
      expect(requests.create).not.toHaveBeenCalled();
    });

    it('recusa dados de contacto inválidos', async () => {
      await expect(
        useCase.execute(
          baseInput({
            requester: { name: 'Ana', email: 'nao-e-email' },
            data: { tipo_imovel: 'Moradia', area_m2: '50' },
          }),
        ),
      ).rejects.toMatchObject({ details: { 'requester.email': expect.any(Array) } });
    });

    it('recusa serviços inexistentes ou não publicados', async () => {
      services.findBySlug.mockResolvedValue(null);

      await expect(useCase.execute(baseInput())).rejects.toThrow(NotFoundError);
    });

    it('recusa serviços publicados sem campos activos', async () => {
      services.findBySlug.mockResolvedValue(makeService([]));

      await expect(useCase.execute(baseInput())).rejects.toThrow(BusinessRuleError);
    });
  });

  describe('anti-spam', () => {
    beforeEach(() => {
      services.findBySlug.mockResolvedValue(
        makeService([makeField({ key: 'nome', type: 'TEXT', required: true })]),
      );
    });

    it('bloqueia submissões com o campo-armadilha preenchido', async () => {
      await expect(
        useCase.execute(baseInput({ data: { nome: 'X' }, honeypot: 'http://spam.example' })),
      ).rejects.toThrow(BusinessRuleError);

      expect(requests.create).not.toHaveBeenCalled();
    });

    it('bloqueia formulários preenchidos demasiado depressa', async () => {
      await expect(
        useCase.execute(baseInput({ data: { nome: 'X' }, renderedAt: Date.now() - 200 })),
      ).rejects.toThrow(/demasiado depressa/);
    });

    it('aceita um tempo de preenchimento plausível', async () => {
      const result = await useCase.execute(
        baseInput({ data: { nome: 'Maria' }, renderedAt: Date.now() - 30_000 }),
      );

      expect(result.reference).toBe('AS-2026-000042');
    });
  });

  describe('anexos', () => {
    beforeEach(() => {
      services.findBySlug.mockResolvedValue(
        makeService([
          makeField({
            key: 'documentos',
            type: 'FILE',
            required: true,
            validation: { maxItems: 2, acceptedExtensions: ['pdf'] },
          }),
        ]),
      );
    });

    const pdf = (name: string, size = 1024) => ({
      fieldname: 'documentos',
      originalname: name,
      mimetype: 'application/pdf',
      size,
      buffer: Buffer.alloc(size),
    });

    it('guarda os ficheiros na pasta da referência do pedido', async () => {
      await useCase.execute(baseInput({ files: [pdf('titulo.pdf')] }));

      expect(storage.save).toHaveBeenCalledWith(
        expect.objectContaining({ originalName: 'titulo.pdf' }),
        'AS-2026-000042',
      );
      expect(requests.create.mock.calls[0][0].attachments).toHaveLength(1);
    });

    it('aplica as regras de extensão definidas no backoffice', async () => {
      await expect(
        useCase.execute(
          baseInput({
            files: [
              { ...pdf('script.exe'), mimetype: 'application/octet-stream', originalname: 'script.exe' },
            ],
          }),
        ),
      ).rejects.toThrow(ValidationError);

      expect(storage.save).not.toHaveBeenCalled();
    });

    it('recusa ficheiros enviados para campos que não são de ficheiro', async () => {
      const promise = useCase.execute(
        baseInput({ files: [{ ...pdf('doc.pdf'), fieldname: 'inexistente' }] }),
      );

      await expect(promise).rejects.toThrow(ValidationError);
      await expect(promise).rejects.toMatchObject({
        details: { inexistente: ['Este formulário não aceita ficheiros neste campo.'] },
      });
    });

    it('remove os ficheiros já guardados se a persistência falhar', async () => {
      requests.create.mockRejectedValue(new Error('falha na base de dados'));

      await expect(useCase.execute(baseInput({ files: [pdf('titulo.pdf')] }))).rejects.toThrow(
        'falha na base de dados',
      );

      expect(storage.remove).toHaveBeenCalledWith('AS-2026-000042/stored-titulo.pdf');
    });
  });
});
