import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ROLE_LABELS, type RoleName } from '@alson/shared';
import { MAILER_SERVICE, type MailerPort } from '../../application/ports/mailer.port';
import type { AppConfig } from '../../../config/configuration';
import {
  newRequestInternalTemplate,
  requestConfirmationTemplate,
  statusChangedTemplate,
  userInviteTemplate,
} from './mail-templates';

/**
 * Camada de conveniência sobre a porta de e-mail: junta o template ao envio,
 * para que os casos de uso não precisem de conhecer HTML.
 */
@Injectable()
export class NotificationService {
  constructor(
    @Inject(MAILER_SERVICE) private readonly mailer: MailerPort,
    private readonly config: ConfigService,
  ) {}

  private get ctx() {
    const site = this.config.getOrThrow<AppConfig['site']>('site');
    return { siteUrl: site.publicUrl, companyName: site.name };
  }

  private get adminUrl(): string {
    return this.config.getOrThrow<AppConfig['site']>('site').adminUrl;
  }

  async sendRequestConfirmation(params: {
    to: string;
    requesterName: string;
    reference: string;
    serviceName: string;
    submittedAt: Date;
    values: Array<{ label: string; displayValue: string }>;
    attachmentCount: number;
  }): Promise<void> {
    const { subject, html, text } = requestConfirmationTemplate({ ...params, ctx: this.ctx });
    await this.mailer.send({ to: params.to, subject, html, text });
  }

  async sendNewRequestToTeam(params: {
    reference: string;
    requestId: string;
    serviceName: string;
    requesterName: string;
    requesterEmail: string;
    requesterPhone: string | null;
    values: Array<{ label: string; displayValue: string }>;
  }): Promise<void> {
    const recipient = this.config.getOrThrow<AppConfig['mail']>('mail').internalRecipient;
    const { subject, html, text } = newRequestInternalTemplate({
      ...params,
      adminUrl: this.adminUrl,
      ctx: this.ctx,
    });
    await this.mailer.send({ to: recipient, subject, html, text, replyTo: params.requesterEmail });
  }

  async sendStatusChanged(params: {
    to: string;
    requesterName: string;
    reference: string;
    serviceName: string;
    fromStatus: string;
    toStatus: string;
    statusColor: string;
    changedAt: Date;
  }): Promise<void> {
    const { subject, html, text } = statusChangedTemplate({ ...params, ctx: this.ctx });
    await this.mailer.send({ to: params.to, subject, html, text });
  }

  async sendUserInvite(params: {
    to: string;
    name: string;
    temporaryPassword: string;
    role: RoleName;
  }): Promise<void> {
    const { subject, html, text } = userInviteTemplate({
      name: params.name,
      email: params.to,
      temporaryPassword: params.temporaryPassword,
      roleLabel: ROLE_LABELS[params.role],
      adminUrl: this.adminUrl,
      ctx: this.ctx,
    });
    await this.mailer.send({ to: params.to, subject, html, text });
  }
}
