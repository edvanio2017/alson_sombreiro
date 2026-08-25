import { Body, Controller, HttpCode, HttpStatus, Inject, Injectable, Logger, Module, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { ANGOLA_PHONE_PATTERN } from '@alson/shared';
import { BusinessRuleError } from '../../shared/domain/domain-error';
import { MAILER_SERVICE, type MailerPort } from '../../shared/application/ports/mailer.port';
import { escapeHtml } from '../../shared/infrastructure/mail/mail-templates';
import { ZodValidationPipe } from '../../shared/presentation/pipes/zod-validation.pipe';
import { RequestOrigin } from '../../shared/presentation/decorators/current-user.decorator';
import { Public } from '../iam/presentation/decorators/public.decorator';
import type { AppConfig } from '../../config/configuration';
import { PUBLIC_SUBMIT_THROTTLE } from '../../config/throttle';

const contactSchema = z.object({
  name: z.string().trim().min(3, 'Indique o seu nome.').max(160),
  email: z.string().trim().toLowerCase().email('Introduza um e-mail válido.').max(320),
  phone: z
    .string()
    .trim()
    .regex(ANGOLA_PHONE_PATTERN, 'Introduza um telefone válido (ex.: +244 923 075 864).')
    .optional()
    .or(z.literal('')),
  subject: z.string().trim().min(3, 'Indique o assunto.').max(160),
  message: z.string().trim().min(10, 'A mensagem deve ter pelo menos 10 caracteres.').max(5000),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'É necessário autorizar o tratamento dos seus dados.' }),
  }),
  website: z.string().max(200).optional(),
  renderedAt: z.coerce.number().int().positive().optional(),
});
type ContactInput = z.infer<typeof contactSchema>;

/** Encaminha as mensagens do formulário de contacto para a caixa da empresa. */
@Injectable()
export class SendContactMessageUseCase {
  private readonly logger = new Logger(SendContactMessageUseCase.name);

  constructor(
    @Inject(MAILER_SERVICE) private readonly mailer: MailerPort,
    private readonly config: ConfigService,
  ) {}

  async execute(input: ContactInput, sourceIp?: string): Promise<void> {
    const antiSpam = this.config.getOrThrow<AppConfig['antiSpam']>('antiSpam');

    if (input.website?.trim()) {
      this.logger.warn(`Mensagem de contacto bloqueada (honeypot) de ${sourceIp ?? 'IP desconhecido'}.`);
      throw new BusinessRuleError('Não foi possível enviar a mensagem.');
    }
    if (input.renderedAt) {
      const elapsed = Date.now() - input.renderedAt;
      if (elapsed >= 0 && elapsed < antiSpam.minFillTimeMs) {
        throw new BusinessRuleError('O formulário foi submetido demasiado depressa. Tente novamente.');
      }
    }

    const mail = this.config.getOrThrow<AppConfig['mail']>('mail');

    await this.mailer.send({
      to: mail.internalRecipient,
      replyTo: input.email,
      subject: `[Contacto] ${input.subject}`,
      html: `
        <h2 style="font-family:Arial,sans-serif;color:#18181b;">Nova mensagem do site</h2>
        <p style="font-family:Arial,sans-serif;color:#3f3f46;line-height:1.7;">
          <strong>Nome:</strong> ${escapeHtml(input.name)}<br>
          <strong>E-mail:</strong> ${escapeHtml(input.email)}<br>
          <strong>Telefone:</strong> ${escapeHtml(input.phone || 'Não indicado')}<br>
          <strong>Assunto:</strong> ${escapeHtml(input.subject)}
        </p>
        <hr style="border:none;border-top:1px solid #e4e4e7;">
        <p style="font-family:Arial,sans-serif;color:#18181b;line-height:1.8;white-space:pre-wrap;">${escapeHtml(input.message)}</p>
      `,
      text: `Nome: ${input.name}\nE-mail: ${input.email}\nTelefone: ${input.phone || 'Não indicado'}\nAssunto: ${input.subject}\n\n${input.message}`,
    });
  }
}

@ApiTags('Público · Contacto')
@Public()
@Controller('public/contact')
export class ContactController {
  constructor(private readonly sendMessage: SendContactMessageUseCase) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  // Mesmo limite da submissão pública de pedidos.
  @Throttle({ default: PUBLIC_SUBMIT_THROTTLE })
  @ApiOperation({ summary: 'Enviar mensagem pelo formulário de contacto' })
  @ApiResponse({ status: 202, description: 'Mensagem aceite para envio.' })
  @ApiResponse({ status: 429, description: 'Limite de mensagens excedido.' })
  async send(
    @Body(new ZodValidationPipe(contactSchema)) body: ContactInput,
    @RequestOrigin() origin: { ip?: string },
  ) {
    await this.sendMessage.execute(body, origin.ip);
    return { message: 'Mensagem enviada. Entraremos em contacto brevemente.' };
  }
}

@Module({
  controllers: [ContactController],
  providers: [SendContactMessageUseCase],
})
export class ContactModule {}
