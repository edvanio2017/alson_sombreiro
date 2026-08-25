import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type { MailMessage, MailerPort } from '../../application/ports/mailer.port';
import type { AppConfig } from '../../../config/configuration';

/**
 * Adaptador SMTP (Nodemailer).
 *
 * Em desenvolvimento aponta para o Mailpit do docker-compose
 * (interface web em http://localhost:8025).
 *
 * Falhas de envio nunca propagam: um e-mail que não sai não pode impedir que
 * um pedido do cliente seja registado.
 */
@Injectable()
export class NodemailerService implements MailerPort, OnModuleInit {
  private readonly logger = new Logger(NodemailerService.name);
  private transporter!: Transporter;
  private readonly mailConfig: AppConfig['mail'];

  constructor(private readonly config: ConfigService) {
    this.mailConfig = this.config.getOrThrow<AppConfig['mail']>('mail');
  }

  onModuleInit(): void {
    this.transporter = createTransport({
      host: this.mailConfig.host,
      port: this.mailConfig.port,
      secure: this.mailConfig.secure,
      auth: this.mailConfig.user
        ? { user: this.mailConfig.user, pass: this.mailConfig.password }
        : undefined,
      // O Mailpit em desenvolvimento não apresenta certificado válido.
      tls: { rejectUnauthorized: this.config.get('nodeEnv') === 'production' },
    });
  }

  async send(message: MailMessage): Promise<void> {
    const recipients = Array.isArray(message.to) ? message.to.join(', ') : message.to;

    try {
      await this.transporter.sendMail({
        from: `"${this.mailConfig.fromName}" <${this.mailConfig.fromAddress}>`,
        to: recipients,
        subject: message.subject,
        html: message.html,
        text: message.text,
        replyTo: message.replyTo,
        attachments: message.attachments,
      });
      this.logger.log(`E-mail enviado para ${recipients}: "${message.subject}"`);
    } catch (error) {
      this.logger.error(
        `Falha ao enviar e-mail para ${recipients}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
