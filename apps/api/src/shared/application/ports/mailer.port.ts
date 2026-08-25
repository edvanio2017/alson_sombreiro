/** Porta de envio de e-mail. */
export const MAILER_SERVICE = Symbol('MAILER_SERVICE');

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface MailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: MailAttachment[];
}

export interface MailerPort {
  send(message: MailMessage): Promise<void>;
}
