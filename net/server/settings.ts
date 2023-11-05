import * as path from 'std/path/mod.ts';
import {
  EncodedSession,
  OwnedSession,
  decodeSession,
  encodeSession,
  generateSession,
} from '../../auth/session.ts';
import { ServerServices } from './server.ts';
import { BaseService } from './service.ts';
import { assert } from '../../base/error.ts';
import { prettyJSON } from '../../base/common.ts';
import {
  JSONDecoder,
  JSONEncoder,
} from '../../base/core-types/encoding/json.ts';
import { JSONObject } from '../../base/interfaces.ts';

export interface SMTPSettings extends JSONObject {
  hostname: string;
  port: number;
  username?: string;
  password?: string;
  tls?: boolean;
}

export interface ServerSettings {
  session: OwnedSession;
  serverTenantId: string;
  setupCompleted: boolean;
  smtp?: SMTPSettings;
}

export class SettingsService extends BaseService<ServerServices> {
  private _settings?: ServerSettings;

  async setup(ctx: ServerServices): Promise<void> {
    await super.setup(ctx);
    let session: OwnedSession | undefined;
    let serverTenantId = 's1';
    let setupCompleted = false;
    let smtp: SMTPSettings | undefined;
    try {
      const text = await Deno.readTextFile(this.jsonFilePath);
      const decoder = new JSONDecoder(JSON.parse(text));
      const encodedSession = decoder.get('session') as
        | EncodedSession
        | undefined;
      if (encodedSession) {
        assert(encodedSession.privateKey !== undefined);
        session = (await decodeSession(encodedSession)) as OwnedSession;
      }
      serverTenantId = decoder.get<string>('serverTenantId') || 's1';
      setupCompleted = decoder.get<boolean>('setupCompleted') || false;
      if (decoder.has('smtp')) {
        smtp = decoder.get<SMTPSettings>('smtp');
      }
    } catch (_e: unknown) {
      //
    }
    if (this._settings) {
      return;
    }

    if (!session) {
      session = await generateSession('root');
    }
    this._settings = {
      session: session,
      serverTenantId: serverTenantId,
      setupCompleted,
    };
    if (smtp) {
      this._settings.smtp = smtp;
    }
    await this.persistSettings();
  }

  get jsonFilePath(): string {
    return path.join(this.services.dir, 'settings.json');
  }

  get session(): OwnedSession {
    assert(this._settings !== undefined);
    return this._settings.session;
  }

  get setupCompleted(): boolean {
    return this._settings?.setupCompleted || false;
  }

  set setupCompleted(flag: boolean) {
    this._settings!.setupCompleted = flag;
  }

  get serverTenantId(): string {
    return this._settings!.serverTenantId;
  }

  set serverTenantId(id: string) {
    this._settings!.serverTenantId = id;
  }

  get smtp(): SMTPSettings | undefined {
    return this._settings?.smtp;
  }

  set smtp(settings: SMTPSettings | undefined) {
    this._settings!.smtp = settings;
  }

  async persistSettings(): Promise<void> {
    const settings = this._settings;
    assert(settings !== undefined);
    const encodedSettings = {
      ...settings,
      session: await encodeSession(settings.session),
    };
    await Deno.writeTextFile(
      this.jsonFilePath,
      prettyJSON(JSONEncoder.toJS(encodedSettings))
    );
  }
}
