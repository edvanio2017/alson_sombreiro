import { Global, Module } from '@nestjs/common';
import { MAILER_SERVICE } from '../../application/ports/mailer.port';
import { NodemailerService } from './nodemailer.service';
import { NotificationService } from './notification.service';

@Global()
@Module({
  providers: [{ provide: MAILER_SERVICE, useClass: NodemailerService }, NotificationService],
  exports: [MAILER_SERVICE, NotificationService],
})
export class MailModule {}
