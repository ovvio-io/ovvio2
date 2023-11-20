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
import { SimpleTimer } from '../../base/timer.ts';

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
  operatorEmails: readonly string[];
  smtp?: SMTPSettings;
}

export class SettingsService extends BaseService<ServerServices> {
  private _reloadTimer: SimpleTimer;
  private _settings?: ServerSettings;
  private _watcher?: Deno.FsWatcher;

  constructor() {
    super();
    this._reloadTimer = new SimpleTimer(
      100,
      false,
      () => this.reloadSettingsFromDisk(),
      'SettingsReload'
    );
  }

  async setup(ctx: ServerServices): Promise<void> {
    await super.setup(ctx);
    await this.reloadSettingsFromDisk();
    this.watchSettingsFile();
  }

  /**
   * Loads the settings file and initializes the settings to a working state.
   *
   * @returns True if loaded successfully from disk, false if some values had
   * to be generated for the first time (thus needing a followup disk write).
   */
  private async reloadSettingsFromDisk(): Promise<void> {
    let session: OwnedSession | undefined;
    let serverTenantId = 's1';
    let smtp: SMTPSettings | undefined;
    let updatedSettings = false;
    let operatorEmails: string[] = [];
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
      if (decoder.has('smtp')) {
        smtp = decoder.get<SMTPSettings>('smtp');
      }
      operatorEmails = decoder.get<string[]>('operatorEmails') || [];
    } catch (_e: unknown) {
      //
    }

    if (!session) {
      session = await generateSession('root');
      updatedSettings = true;
    }
    this._settings = {
      session,
      serverTenantId,
      operatorEmails,
    };
    if (smtp) {
      this._settings.smtp = smtp;
    }
    if (updatedSettings) {
      await this.persistSettings();
    }
  }

  private async watchSettingsFile(): Promise<void> {
    // this._watcher = Deno.watchFs(this.jsonFilePath);
    // for await (const _event of this._watcher!) {
    //   if (!this.active) {
    //     continue;
    //   }
    //   this._reloadTimer.schedule();
    // }
  }

  get jsonFilePath(): string {
    return path.join(this.services.dir, 'settings.json');
  }

  get session(): OwnedSession {
    assert(this._settings !== undefined);
    return this._settings.session;
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

  get operatorEmails(): readonly string[] {
    return this._settings?.operatorEmails || [];
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
