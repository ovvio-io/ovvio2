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
  EVENT_NEW_COMMIT,
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
import { Endpoint, ServerServices } from './server.ts';
import { getRequestPath } from './utils.ts';
import { BaseService } from './service.ts';
import { Commit } from '../../repo/commit.ts';
import { SchemeNamespace } from '../../cfds/base/scheme-types.ts';
import { sessionFromRecord } from '../../auth/session.ts';

export class SyncService extends BaseService<ServerServices> {
  private readonly _repositories: Dictionary<
    string,
    Repository<SQLiteRepoStorage>
  >;
  private readonly _clientsForRepo: Dictionary<
    string,
    RepoClient<SQLiteRepoStorage>[]
  >;
  readonly name = 'sync';

  private readonly _logs: Dictionary<string, SQLiteLogStorage>;
  private readonly _clientsForLog: Dictionary<string, LogClient[]>;
  constructor() {
    super();
    this._repositories = new Map();
    this._clientsForRepo = new Map();
    this._logs = new Map();
    this._clientsForLog = new Map();
  }

  getRepository(
    type: RepositoryType,
    id: string
  ): Repository<SQLiteRepoStorage> {
    let repo = this._repositories.get(id);
    if (!repo) {
      repo = new Repository(
        new SQLiteRepoStorage(joinPath(this.services.dir, type, id + '.repo')),
        this.services.trustPool
      );
      this._repositories.set(id, repo);
      const replicas = this.services.replicas;
      if (replicas.length > 0) {
        assert(!this._clientsForRepo.has(id)); // Sanity check
        const clients = this.services.replicas.map((baseServerUrl) =>
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

  getSysDir(): Repository<SQLiteRepoStorage> {
    return this.getRepository('sys', 'dir');
  }

  getLog(id: string): SQLiteLogStorage {
    let storage = this._logs.get(id);
    if (!storage) {
      storage = new SQLiteLogStorage(
        joinPath(this.services.dir, 'logs', id + '.logs')
      );
      this._logs.set(id, storage);
      const replicas = this.services.replicas;
      if (replicas.length > 0) {
        assert(!this._clientsForLog.has(id)); // Sanity check
        const clients = replicas.map((baseServerUrl) =>
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

  clientsForLog(id: string): LogClient[] {
    return this._clientsForLog.get(id)!;
  }

  clientsForRepo(id: string): RepoClient<SQLiteRepoStorage>[] {
    return this._clientsForRepo.get(id)!;
  }

  start(): void {
    for (const clients of this._clientsForRepo.values()) {
      for (const c of clients) {
        c.startSyncing();
      }
    }
    for (const clients of this._clientsForLog.values()) {
      for (const c of clients) {
        c.startSyncing();
      }
    }
  }

  stop(): void {
    for (const clients of this._clientsForRepo.values()) {
      for (const c of clients) {
        c.stopSyncing();
      }
    }
    for (const clients of this._clientsForLog.values()) {
      for (const c of clients) {
        c.stopSyncing();
      }
    }
  }
}

export class SyncEndpoint implements Endpoint {
  filter(
    services: ServerServices,
    req: Request,
    info: Deno.ServeHandlerInfo
  ): boolean {
    if (req.method !== 'POST') {
      return false;
    }
    const path = getRequestPath(req).split('/');
    if (path.length !== 4 || ![...kRepositoryTypes, 'log'].includes(path[1])) {
      return false;
    }
    return true;
  }

  async processRequest(
    services: ServerServices,
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
    const path = getRequestPath(req).split('/');
    const storageType = path[1] as RepositoryType;
    const resourceId = path[2];
    const cmd = path[3];
    const syncService = services.sync;
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
            async (values) =>
              (
                await syncService
                  .getRepository(storageType, resourceId)
                  .persistCommits(values)
              ).length,
            () =>
              mapIterable(
                syncService.getRepository(storageType, resourceId).commits(),
                (c) => [c.id, c]
              ),
            () =>
              syncService.getRepository(storageType, resourceId)
                .numberOfCommits,
            syncService.clientsForRepo(resourceId),
            true
          );
        } else if (storageType === 'log') {
          resp = await this.handleSyncRequest<NormalizedLogEntry>(
            req,
            (entries) => syncService.getLog(resourceId).persistEntries(entries),
            () =>
              mapIterable(syncService.getLog(resourceId).entriesSync(), (e) => [
                e.logId,
                e,
              ]),
            () => syncService.getLog(resourceId).numberOfEntries(),
            syncService.clientsForLog(resourceId),
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
}
