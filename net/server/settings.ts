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

export interface ServerSettings {
  session: OwnedSession;
  setupCompleted: boolean;
}

export class SettingsService extends BaseService<ServerServices> {
  private _settings?: ServerSettings;

  async setup(ctx: ServerServices): Promise<void> {
    await super.setup(ctx);
    try {
      const text = await Deno.readTextFile(this.jsonFilePath);
      const decoder = new JSONDecoder(JSON.parse(text));
      const session = decoder.get('session') as EncodedSession | undefined;
      assert(session !== undefined); // Sanity check
      assert(session.privateKey !== undefined);
      this._settings = {
        session: (await decodeSession(session)) as OwnedSession,
        setupCompleted: decoder.get<boolean>('setupCompleted') || false,
      };
    } catch (_e: unknown) {
      //
    }
    if (this._settings) {
      return;
    }

    const session = await generateSession('root');
    this._settings = {
      session: session,
      setupCompleted: false,
    };
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
