import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PRIORITIES, REFERENCE_PATTERN } from '@alson/shared';
import { z } from 'zod';

/* --------------------------- Submissão pública ---------------------------- */

/**
 * Corpo da submissão pública.
 *
 * Chega como JSON (`application/json`) ou como o campo `payload` de um
 * `multipart/form-data`. Neste caso os ficheiros vêm em campos com o nome da
 * chave do respectivo campo do formulário.
 */
export const submitRequestSchema = z.object({
  requester: z.object({
    name: z.string().trim().min(3, 'Indique o seu nome completo.').max(160),
    email: z.string().trim().toLowerCase().email('Introduza um e-mail válido.').max(320),
    phone: z.string().trim().max(32).optional().nullable(),
  }),
  /** Valores dos campos dinâmicos, indexados pela chave do campo. */
  data: z.record(z.unknown()).default({}),
  /** Campo-armadilha: tem de chegar vazio. */
  website: z.string().max(200).optional(),
  /** Instante em que o formulário foi apresentado (epoch ms). */
  renderedAt: z.coerce.number().int().positive().optional(),
  /** Consentimento RGPD para tratamento dos dados. */
  consent: z.literal(true, {
    errorMap: () => ({ message: 'É necessário autorizar o tratamento dos seus dados.' }),
  }),
});
export type SubmitRequestBodyDto = z.infer<typeof submitRequestSchema>;

export const trackRequestSchema = z.object({
  reference: z
    .string()
    .trim()
    .toUpperCase()
    .regex(REFERENCE_PATTERN, 'A referência deve seguir o formato AS-AAAA-NNNNNN.'),
  email: z.string().trim().toLowerCase().email('Introduza o e-mail usado na submissão.'),
});
export type TrackRequestDto = z.infer<typeof trackRequestSchema>;

/* ------------------------------ Backoffice -------------------------------- */

const booleanQuery = z
  .enum(['true', 'false'])
  .optional()
  .transform((value) => (value === undefined ? undefined : value === 'true'));

export const listRequestsQuerySchema = z.object({
  search: z.string().trim().max(160).optional(),
  serviceId: z.string().uuid().optional(),
  statusId: z.string().uuid().optional(),
  /** UUID de um utilizador ou `unassigned` para os pedidos sem responsável. */
  assigneeId: z.union([z.string().uuid(), z.literal('unassigned')]).optional(),
  priority: z.enum(PRIORITIES).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  openOnly: booleanQuery,
  sort: z.enum(['createdAt', 'updatedAt', 'priority', 'reference']).optional().default('createdAt'),
  direction: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().positive().optional(),
  perPage: z.coerce.number().int().positive().max(100).optional(),
});
export type ListRequestsQuery = z.infer<typeof listRequestsQuerySchema>;

export const kanbanQuerySchema = listRequestsQuerySchema
  .omit({ page: true, perPage: true, sort: true, direction: true, statusId: true })
  .extend({ limitPerColumn: z.coerce.number().int().min(1).max(200).optional().default(50) });
export type KanbanQuery = z.infer<typeof kanbanQuerySchema>;

export const changeStatusSchema = z.object({
  statusId: z.string().uuid('Estado inválido.'),
  /** Observação opcional acrescentada à entrada da timeline. */
  note: z.string().trim().max(1000).optional(),
});
export type ChangeStatusDto = z.infer<typeof changeStatusSchema>;

export const assignSchema = z.object({
  assigneeId: z.string().uuid('Utilizador inválido.').nullable(),
});
export type AssignDto = z.infer<typeof assignSchema>;

export const changePrioritySchema = z.object({
  priority: z.enum(PRIORITIES, { errorMap: () => ({ message: 'Prioridade inválida.' }) }),
});
export type ChangePriorityDto = z.infer<typeof changePrioritySchema>;

export const noteSchema = z.object({
  body: z
    .string()
    .trim()
    .min(2, 'A nota não pode estar vazia.')
    .max(5000, 'A nota é demasiado longa.'),
});
export type NoteInputDto = z.infer<typeof noteSchema>;

/* -------------------------- Estados do pipeline --------------------------- */

const statusShape = {
  name: z.string().trim().min(2, 'Indique o nome do estado.').max(60),
  key: z.string().trim().max(60).optional(),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Indique uma cor hexadecimal, por exemplo #1E293B.')
    .optional(),
  order: z.number().int().min(0).max(99).optional(),
  isInitial: z.boolean().optional(),
  isFinal: z.boolean().optional(),
  notifyRequester: z.boolean().optional(),
  active: z.boolean().optional(),
};

export const createStatusSchema = z.object(statusShape);
export type CreateStatusDto = z.infer<typeof createStatusSchema>;

export const updateStatusSchema = z.object({ ...statusShape, name: statusShape.name.optional() });
export type UpdateStatusDto = z.infer<typeof updateStatusSchema>;

export const reorderStatusesSchema = z.object({
  statusIds: z.array(z.string().uuid()).min(1),
});
export type ReorderStatusesDto = z.infer<typeof reorderStatusesSchema>;

export const metricsQuerySchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});
export type MetricsQuery = z.infer<typeof metricsQuerySchema>;

/* -------------------------------- Swagger --------------------------------- */

export class SubmitRequestBody {
  @ApiProperty({
    description: 'Dados de contacto do requerente.',
    example: { name: 'Maria Chipenda', email: 'maria@exemplo.ao', phone: '+244 923 000 111' },
  })
  requester!: { name: string; email: string; phone?: string };

  @ApiProperty({
    description: 'Valores dos campos dinâmicos, indexados pela chave definida no backoffice.',
    example: { tipo_imovel: 'apartamento', provincia: 'benguela', area_m2: 120 },
  })
  data!: Record<string, unknown>;

  @ApiProperty({ description: 'Consentimento RGPD (tem de ser `true`).', example: true })
  consent!: boolean;

  @ApiPropertyOptional({ description: 'Campo-armadilha anti-spam: deve chegar vazio.' })
  website?: string;

  @ApiPropertyOptional({ description: 'Epoch ms em que o formulário foi apresentado.' })
  renderedAt?: number;
}

export class ChangeStatusBody {
  @ApiProperty({ format: 'uuid', description: 'Identificador do estado de destino.' })
  statusId!: string;

  @ApiPropertyOptional({ description: 'Observação acrescentada à timeline.' })
  note?: string;
}
