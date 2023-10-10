import { join as joinPath } from 'std/path/mod.ts';
import { Dictionary } from '../../base/collections/dict.ts';
import { mapIterable } from '../../base/common.ts';
import {
  JSONCyclicalDecoder,
  JSONCyclicalEncoder,
} from '../../base/core-types/encoding/json.ts';
import { assert } from '../../base/error.ts';
import { NormalizedLogEntry } from '../../logging/entry.ts';
import { log } from '../../logging/log.ts';
import {
  Repository,
  RepositoryType,
  kRepositoryTypes,
} from '../../repo/repo.ts';
import { getOvvioConfig } from '../../server/config.ts';
import { SQLiteLogStorage } from '../../server/sqlite3-log-storage.ts';
import { SQLiteRepoStorage } from '../../server/sqlite3-repo-storage.ts';
import {
  BaseClient,
  syncConfigGetCycles,
  kSyncConfigClient,
  kSyncConfigServer,
} from '../base-client.ts';
import { LogClient } from '../log-client.ts';
import { SyncMessage } from '../message.ts';
import { SyncValueType } from '../message.ts';
import { RepoClient } from '../repo-client.ts';
import { Endpoint } from './base-server.ts';

export class SyncEndpoint implements Endpoint {
  private readonly _repositories: Dictionary<
    string,
    Repository<SQLiteRepoStorage>
  >;
  private readonly _clientsForRepo: Dictionary<
    string,
    RepoClient<SQLiteRepoStorage>[]
  >;
  private readonly _logs: Dictionary<string, SQLiteLogStorage>;
  private readonly _clientsForLog: Dictionary<string, LogClient[]>;

  constructor(readonly dataDir: string, readonly replicas: string[] = []) {
    this._repositories = new Map();
    this._clientsForRepo = new Map();
    this._logs = new Map();
    this._clientsForLog = new Map();
  }

  filter(req: Request, info: Deno.ServeHandlerInfo): boolean {
    if (req.method !== 'POST') {
      return false;
    }
    const path = new URL(req.url).pathname.split('/');
    if (path.length !== 4 || ![...kRepositoryTypes, 'log'].includes(path[1])) {
      return false;
    }
    return true;
  }

  async processRequest(
    req: Request,
    info: Deno.ServeHandlerInfo
  ): Promise<Response> {
    if (!req.body) {
      return Promise.resolve(
        new Response(null, {
          status: 400,
        })
      );
    }
    const path = new URL(req.url).pathname.split('/');
    const storageType = path[1] as RepositoryType;
    const resourceId = path[2];
    const cmd = path[3];
    let resp: Response;
    switch (cmd) {
      case 'sync':
        if (
          storageType === 'data' ||
          storageType === 'sys' ||
          storageType === 'user'
        ) {
          resp = await this.handleSyncRequest(
            req,
            (values) =>
              Promise.resolve(
                this.getRepository(storageType, resourceId).persistCommits(
                  values
                ).length
              ),
            () =>
              mapIterable(
                this.getRepository(storageType, resourceId).commits(),
                (c) => [c.id, c]
              ),
            () => this.getRepository(storageType, resourceId).numberOfCommits,
            this._clientsForRepo.get(resourceId),
            true
          );
        } else if (storageType === 'log') {
          resp = await this.handleSyncRequest<NormalizedLogEntry>(
            req,
            (entries) => this.getLog(resourceId).persistEntries(entries),
            () =>
              mapIterable(this.getLog(resourceId).entriesSync(), (e) => [
                e.logId,
                e,
              ]),
            () => this.getLog(resourceId).numberOfEntries(),
            this._clientsForLog.get(resourceId),
            // TODO: Only include results when talking to other, trusted,
            // servers. Clients should never receive log entries from the
            // server.
            true
          );
        }
        break;

      default:
        // debugger;
        log({ severity: 'INFO', error: 'UnknownCommand', value: cmd });
        resp = new Response(null, { status: 400 });
        break;
    }
    return resp!;
  }

  private async handleSyncRequest<T extends SyncValueType>(
    req: Request,
    persistValues: (values: T[]) => Promise<number>,
    fetchAll: () => Iterable<[string, T]>,
    getLocalCount: () => number,
    replicas: Iterable<BaseClient<T>> | undefined,
    includeMissing: boolean
  ): Promise<Response> {
    // TODO: Auth + Permissions
    const json = await req.json();
    const msg = new SyncMessage<T>({
      decoder: new JSONCyclicalDecoder(json),
    });
    if ((await persistValues(msg.values)) > 0 && replicas) {
      // Sync changes with replicas
      for (const c of replicas) {
        c.touch();
      }
    }

    const syncResp = SyncMessage.build(
      msg.filter,
      fetchAll(),
      getLocalCount(),
      msg.size,
      syncConfigGetCycles(kSyncConfigClient),
      // Don't return new commits to old clients
      includeMissing && msg.buildVersion >= getOvvioConfig().version
    );

    return new Response(
      JSON.stringify(JSONCyclicalEncoder.serialize(syncResp)),
      {
        headers: {
          'content-type': 'application/json; charset=utf-8',
        },
      }
    );
  }

  private getRepository(
    type: RepositoryType,
    id: string
  ): Repository<SQLiteRepoStorage> {
    let repo = this._repositories.get(id);
    if (!repo) {
      repo = new Repository(
        new SQLiteRepoStorage(joinPath(this.dataDir, type, id + '.repo'))
      );
      this._repositories.set(id, repo);
      const replicas = this.replicas;
      if (replicas.length > 0) {
        assert(!this._clientsForRepo.has(id)); // Sanity check
        const clients = this.replicas.map((baseServerUrl) =>
          new RepoClient(
            repo!,
            new URL(`/${type}/` + id, baseServerUrl).toString(),
            kSyncConfigServer
          ).startSyncing()
        );
        this._clientsForRepo.set(id, clients);
      }
    }
    return repo;
  }

  private getLog(id: string): SQLiteLogStorage {
    let storage = this._logs.get(id);
    if (!storage) {
      storage = new SQLiteLogStorage(
        joinPath(this.dataDir, 'logs', id + '.logs')
      );
      this._logs.set(id, storage);
      const replicas = this.replicas;
      if (replicas.length > 0) {
        assert(!this._clientsForLog.has(id)); // Sanity check
        const clients = this.replicas.map((baseServerUrl) =>
          new LogClient(
            storage!,
            new URL('/logs/' + id, baseServerUrl).toString(),
            kSyncConfigServer
          ).startSyncing()
        );
        this._clientsForLog.set(id, clients);
      }
    }
    return storage;
  }
}
