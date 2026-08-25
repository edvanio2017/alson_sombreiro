import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FIELD_TYPES } from '@alson/shared';
import { z } from 'zod';

/* ------------------------------ Serviços --------------------------------- */

const baseServiceShape = {
  name: z.string().trim().min(3, 'O nome deve ter pelo menos 3 caracteres.').max(160),
  slug: z.string().trim().max(160).optional(),
  shortDescription: z
    .string()
    .trim()
    .min(10, 'A descrição breve deve ter pelo menos 10 caracteres.')
    .max(300),
  description: z.string().trim().max(20_000).optional().default(''),
  benefits: z.array(z.string().trim().min(2).max(300)).max(20).optional(),
  icon: z.string().trim().max(60).nullable().optional(),
  coverImage: z.string().trim().max(500).nullable().optional(),
  metaTitle: z.string().trim().max(70).nullable().optional(),
  metaDescription: z.string().trim().max(180).nullable().optional(),
  ogImage: z.string().trim().max(500).nullable().optional(),
  featured: z.boolean().optional(),
  order: z.number().int().min(0).max(999).optional(),
  active: z.boolean().optional(),
};

export const createServiceSchema = z.object(baseServiceShape);
export type CreateServiceDto = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = z.object({
  ...baseServiceShape,
  name: baseServiceShape.name.optional(),
  shortDescription: baseServiceShape.shortDescription.optional(),
});
export type UpdateServiceDto = z.infer<typeof updateServiceSchema>;

export const listServicesQuerySchema = z.object({
  search: z.string().trim().optional(),
  active: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  featured: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  page: z.coerce.number().int().positive().optional(),
  perPage: z.coerce.number().int().positive().max(100).optional(),
});
export type ListServicesQuery = z.infer<typeof listServicesQuerySchema>;

/* ------------------------- Campos de formulário --------------------------- */

const fieldOptionSchema = z.object({
  label: z.string().trim().min(1, 'Indique o rótulo da opção.').max(160),
  value: z.string().trim().min(1, 'Indique o valor da opção.').max(160),
});

const validationRulesSchema = z
  .object({
    min: z.number().nullable().optional(),
    max: z.number().nullable().optional(),
    pattern: z.string().max(300).nullable().optional(),
    patternMessage: z.string().max(300).nullable().optional(),
    minDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD.')
      .nullable()
      .optional(),
    maxDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD.')
      .nullable()
      .optional(),
    minItems: z.number().int().min(0).nullable().optional(),
    maxItems: z.number().int().min(1).nullable().optional(),
    acceptedExtensions: z.array(z.string().trim().max(12)).max(30).nullable().optional(),
    acceptedMimeTypes: z.array(z.string().trim().max(160)).max(30).nullable().optional(),
    maxFileSize: z.number().int().positive().nullable().optional(),
    decimals: z.number().int().min(0).max(6).nullable().optional(),
  })
  .strict();

const baseFieldShape = {
  key: z
    .string()
    .trim()
    .max(50)
    .optional()
    .describe('Se omitida, é derivada do rótulo.'),
  label: z.string().trim().min(2, 'O rótulo deve ter pelo menos 2 caracteres.').max(160),
  type: z.enum(FIELD_TYPES, { errorMap: () => ({ message: 'Tipo de campo inválido.' }) }),
  placeholder: z.string().trim().max(160).nullable().optional(),
  helpText: z.string().trim().max(300).nullable().optional(),
  required: z.boolean().optional(),
  order: z.number().int().min(0).max(999).optional(),
  width: z.union([z.literal(1), z.literal(2)]).optional(),
  options: z.array(fieldOptionSchema).max(100).optional(),
  validation: validationRulesSchema.optional(),
  active: z.boolean().optional(),
};

export const createFormFieldSchema = z.object(baseFieldShape);
export type CreateFormFieldDto = z.infer<typeof createFormFieldSchema>;

export const updateFormFieldSchema = z.object({
  ...baseFieldShape,
  label: baseFieldShape.label.optional(),
  type: baseFieldShape.type.optional(),
});
export type UpdateFormFieldDto = z.infer<typeof updateFormFieldSchema>;

export const reorderFieldsSchema = z.object({
  fieldIds: z.array(z.string().uuid('Identificador de campo inválido.')).min(1),
});
export type ReorderFieldsDto = z.infer<typeof reorderFieldsSchema>;

/* ------------------------------ Swagger ---------------------------------- */

export class CreateServiceBody {
  @ApiProperty({ example: 'Avaliação Imobiliária' })
  name!: string;

  @ApiPropertyOptional({ example: 'avaliacao-imobiliaria', description: 'Gerado a partir do nome se omitido.' })
  slug?: string;

  @ApiProperty({ example: 'Determinação rigorosa do valor de mercado do seu imóvel.' })
  shortDescription!: string;

  @ApiPropertyOptional({ description: 'Descrição completa apresentada na página do serviço.' })
  description?: string;

  @ApiPropertyOptional({ type: [String], example: ['Perito certificado pela CMC', 'Relatório em 5 dias úteis'] })
  benefits?: string[];

  @ApiPropertyOptional({ example: 'building' })
  icon?: string;

  @ApiPropertyOptional({ description: 'Título para SEO (máx. 70 caracteres).' })
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'Meta description (máx. 180 caracteres).' })
  metaDescription?: string;

  @ApiPropertyOptional({ default: false })
  featured?: boolean;

  @ApiPropertyOptional({ default: 0 })
  order?: number;
}

export class CreateFormFieldBody {
  @ApiPropertyOptional({ example: 'numero_bi', description: 'Derivada do rótulo se omitida.' })
  key?: string;

  @ApiProperty({ example: 'Número do Bilhete de Identidade' })
  label!: string;

  @ApiProperty({ enum: FIELD_TYPES, example: 'TEXT' })
  type!: (typeof FIELD_TYPES)[number];

  @ApiPropertyOptional({ example: '000000000LA000' })
  placeholder?: string;

  @ApiPropertyOptional({ example: 'Conforme consta no documento de identificação.' })
  helpText?: string;

  @ApiPropertyOptional({ default: false })
  required?: boolean;

  @ApiPropertyOptional({ enum: [1, 2], description: '1 = meia coluna, 2 = coluna inteira.' })
  width?: 1 | 2;

  @ApiPropertyOptional({
    description: 'Opções de SELECT/MULTISELECT.',
    example: [{ label: 'Luanda', value: 'luanda' }],
  })
  options?: Array<{ label: string; value: string }>;

  @ApiPropertyOptional({
    description: 'Regras de validação aplicadas no cliente e no servidor.',
    example: { min: 8, max: 20, pattern: '^[0-9]{9}[A-Z]{2}[0-9]{3}$' },
  })
  validation?: Record<string, unknown>;
}
