import {
  SESv2Client,
  SendEmailCommand,
  SendEmailCommandInput,
} from '@aws-sdk/client-sesv2';
import { ServerServices } from './server.ts';
import { BaseService } from './service.ts';

export interface EmailMessage {
  to: string;
  subject: string;
  plaintext: string;
  html: string;
}

export class EmailService extends BaseService<ServerServices> {
  private _client: SESv2Client;

  constructor() {
    super();
    this._client = new SESv2Client({ region: 'us-east-1' });
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
      return resp.MessageId !== undefined;
    } catch (_: unknown) {
      return false;
    }
  }
}
