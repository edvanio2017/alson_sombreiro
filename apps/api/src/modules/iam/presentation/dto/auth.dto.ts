import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ROLES } from '@alson/shared';
import { z } from 'zod';

/**
 * Schemas Zod + classes de documentação Swagger.
 * Os schemas são a validação efectiva; as classes servem o `/api/docs`.
 */

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Introduza um e-mail válido.'),
  password: z.string().min(1, 'Introduza a palavra-passe.'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(10, 'Token de renovação em falta.'),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export const logoutSchema = z.object({
  refreshToken: z.string().optional(),
  allSessions: z.coerce.boolean().optional().default(false),
});
export type LogoutInput = z.infer<typeof logoutSchema>;

const passwordPolicy = z
  .string()
  .min(8, 'A palavra-passe deve ter pelo menos 8 caracteres.')
  .max(72, 'A palavra-passe é demasiado longa.')
  .regex(/[a-z]/, 'A palavra-passe deve conter pelo menos uma letra minúscula.')
  .regex(/[A-Z]/, 'A palavra-passe deve conter pelo menos uma letra maiúscula.')
  .regex(/\d/, 'A palavra-passe deve conter pelo menos um algarismo.');

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Introduza a palavra-passe actual.'),
    newPassword: passwordPolicy,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As palavras-passe não coincidem.',
    path: ['confirmPassword'],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const createUserSchema = z.object({
  name: z.string().trim().min(3, 'O nome deve ter pelo menos 3 caracteres.').max(120),
  email: z.string().trim().toLowerCase().email('Introduza um e-mail válido.'),
  password: passwordPolicy.optional(),
  phone: z.string().trim().max(32).optional().nullable(),
  role: z.enum(ROLES, { errorMap: () => ({ message: 'Perfil inválido.' }) }),
  sendInvite: z.boolean().optional().default(true),
});
export type CreateUserInputDto = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(3).max(120).optional(),
  email: z.string().trim().toLowerCase().email('Introduza um e-mail válido.').optional(),
  phone: z.string().trim().max(32).optional().nullable(),
  role: z.enum(ROLES).optional(),
  active: z.boolean().optional(),
});
export type UpdateUserInputDto = z.infer<typeof updateUserSchema>;

export const listUsersQuerySchema = z.object({
  search: z.string().trim().optional(),
  role: z.enum(ROLES).optional(),
  active: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  page: z.coerce.number().int().positive().optional(),
  perPage: z.coerce.number().int().positive().max(100).optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

/* ----------------------------- Swagger ----------------------------------- */

export class LoginBody {
  @ApiProperty({ example: 'admin@alsonsombreiro.ao' })
  email!: string;

  @ApiProperty({ example: 'Alson@2026' })
  password!: string;
}

export class RefreshBody {
  @ApiProperty({ description: 'Refresh token emitido no login.' })
  refreshToken!: string;
}

export class CreateUserBody {
  @ApiProperty({ example: 'Jorge Bento' })
  name!: string;

  @ApiProperty({ example: 'jorge.bento@alsonsombreiro.ao' })
  email!: string;

  @ApiPropertyOptional({
    description: 'Se omitida, é gerada uma palavra-passe temporária e enviada por e-mail.',
  })
  password?: string;

  @ApiPropertyOptional({ example: '+244 923 075 864' })
  phone?: string;

  @ApiProperty({ enum: ROLES, example: 'GESTOR' })
  role!: (typeof ROLES)[number];

  @ApiPropertyOptional({ default: true })
  sendInvite?: boolean;
}
