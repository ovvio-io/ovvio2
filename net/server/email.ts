import {
  SESv2Client,
  SendEmailCommand,
  SendEmailCommandInput,
} from '@aws-sdk/client-sesv2';
import { ServerServices } from './server.ts';
import { BaseService } from './service.ts';
import { EmailType } from '../../logging/metrics.ts';

export interface EmailMessage {
  type: EmailType;
  to: string;
  subject: string;
  plaintext: string;
  html: string;
}

export class EmailService extends BaseService<ServerServices> {
  private _client: SESv2Client;

  constructor(region: string) {
    super();
    this._client = new SESv2Client({ region });
  }

  async send(message: EmailMessage): Promise<boolean> {
    const req: SendEmailCommandInput = {
      FromEmailAddress: 'system@ovvio.io',
      Destination: {
        ToAddresses: [message.to],
      },
      Content: {
        Simple: {
          Subject: {
            Data: message.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Text: {
              Data: message.plaintext,
              Charset: 'UTF-8',
            },
            Html: {
              Data: message.html,
              Charset: 'UTF-8',
            },
          },
        },
      },
    };
    try {
      const resp = await this._client.send(new SendEmailCommand(req));
      const success = resp.MessageId !== undefined;
      if (success) {
        this.services.logger.log({
          severity: 'METRIC',
          name: 'EmailSent',
          value: 1,
          unit: 'Count',
          type: message.type,
        });
      } else {
        console.error('Failed sending email');
      }
      return success;
    } catch (err: unknown) {
      console.error('Failed sending email:' + err);
      console.error('Trace:' + (err as Error).stack);
      return false;
    }
  }
}
