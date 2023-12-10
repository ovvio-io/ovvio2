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
  Authorizer,
  EVENT_NEW_COMMIT,
  MemRepoStorage,
  Repository,
  RepositoryIndexes,
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
import {
  TrustPool,
  decodeSession,
  generateRequestSignature,
  sessionFromRecord,
} from '../../auth/session.ts';
import {
  createSysDirAuthorizer,
  createWorkspaceAuthorizer,
  createUserAuthorizer,
} from '../../repo/auth.ts';
import { fetchEncodedRootSessions, requireSignedUser } from './auth.ts';
import { SchemeNamespace } from '../../cfds/base/scheme-types.ts';
import { SQLite3RepoBackup } from '../../server/sqlite3-repo-backup.ts';
import { RepositoryIndex } from '../../repo/index.ts';

export interface SysDirIndexes extends RepositoryIndexes<MemRepoStorage> {
  users: RepositoryIndex<MemRepoStorage>;
  rootSessions: RepositoryIndex<MemRepoStorage>;
}

export class SyncService extends BaseService<ServerServices> {
  private readonly _repositories: Dictionary<
    string,
    Repository<MemRepoStorage>
  >;
  private readonly _clientsForRepo: Dictionary<
    string,
    RepoClient<MemRepoStorage>[]
  >;
  readonly name = 'sync';

  private readonly _logs: Dictionary<string, SQLiteLogStorage>;
  private readonly _clientsForLog: Dictionary<string, LogClient[]>;
  private _backup: SQLite3RepoBackup | undefined;

  constructor() {
    super();
    this._repositories = new Map();
    this._clientsForRepo = new Map();
    this._logs = new Map();
    this._clientsForLog = new Map();
  }

  async setup(services: ServerServices): Promise<void> {
    super.setup(services);
    const sysDir = this.getSysDir();
    const trustPool = services.trustPool;
    await setupTrustPool(trustPool, sysDir);
    // Setup backup service
    this._backup = new SQLite3RepoBackup(services, (repoId, commits) => {
      const repo = this._repositories.get(repoId);
      if (repo) {
        repo.persistCommits(commits).then((persisted) => {
          if (repoId === 'sys/dir') {
            let ws: string[] = [];
            for (const key of repo.keys()) {
              const r = repo.valueForKey(key);
              if (r.scheme.namespace === SchemeNamespace.WORKSPACE) {
                ws.push(key);
              }
            }
            console.log(`Workspaces in sys/dir: ${ws}`);
          }
        });
      }
    });
    await this._backup.open('sys', 'dir'); // Load /sys/dir from backup
  }

  setupRepository(
    type: RepositoryType,
    id: string,
    indexes?: (
      repo: Repository<MemRepoStorage, RepositoryIndexes<MemRepoStorage>>
    ) => RepositoryIndexes<MemRepoStorage>
  ): Repository<MemRepoStorage> {
    const repoId = Repository.id(type, id);
    assert(!this._repositories.has(repoId));
    let authorizer: Authorizer<MemRepoStorage>;
    switch (type) {
      case 'sys':
        assert(id === 'dir'); // Sanity check
        authorizer = createSysDirAuthorizer(
          () => this.services.settings.operatorEmails
        );
        break;

      case 'data':
        authorizer = createWorkspaceAuthorizer(
          () => this.services.settings.operatorEmails,
          this.getRepository('sys', 'dir'),
          id
        );
        break;

      case 'user':
        authorizer = createUserAuthorizer(this.getRepository('sys', 'dir'), id);
        break;
    }
    const repo = new Repository(
      new MemRepoStorage(),
      this.services.trustPool,
      authorizer,
      indexes
    );
    this._repositories.set(repoId, repo);
    const replicas = this.services.replicas;
    if (replicas.length > 0) {
      assert(!this._clientsForRepo.has(repoId)); // Sanity check
      const clients = this.services.replicas.map((baseServerUrl) =>
        new RepoClient(
          repo!,
          new URL(`/${type}/` + id, baseServerUrl).toString(),
          kSyncConfigServer
        ).startSyncing()
      );
      this._clientsForRepo.set(repoId, clients);
    }
    this._backup?.open(type, id);
    repo.on(EVENT_NEW_COMMIT, (c: Commit) => {
      this._backup?.persistCommits(repoId, [c]);
    });
    return repo;
  }

  getRepository<T extends RepositoryIndexes<MemRepoStorage>>(
    type: RepositoryType,
    id: string
  ): Repository<MemRepoStorage, T> {
    const repoId = Repository.id(type, id);
    let repo = this._repositories.get(repoId);
    if (!repo) {
      if (repoId === Repository.id('sys', 'dir')) {
        repo = this.setupRepository(type, id, (r) => {
          return {
            users: new RepositoryIndex(
              r,
              (key, record) => record.scheme.namespace === SchemeNamespace.USERS
            ),
            rootSessions: new RepositoryIndex(
              r,
              (key, record) =>
                record.scheme.namespace === SchemeNamespace.SESSIONS &&
                record.get('owner') === 'root'
            ),
          };
        });
      } else {
        repo = this.setupRepository(type, id);
      }
    }
    return repo as Repository<MemRepoStorage, T>;
  }

  getSysDir(): Repository<MemRepoStorage, SysDirIndexes> {
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

  clientsForRepo(id: string): RepoClient<MemRepoStorage>[] {
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
    const json = await req.json();
    const msg = new SyncMessage<Commit | NormalizedLogEntry>({
      decoder: new JSONCyclicalDecoder(json),
    });
    const [userId, userRecord, userSession] = await requireSignedUser(
      services,
      msg.signature,
      'anonymous'
    );
    let resp: Response;
    switch (cmd) {
      case 'sync':
        if (
          storageType === 'data' ||
          storageType === 'sys' ||
          storageType === 'user'
        ) {
          resp = await this.handleSyncRequest(
            services,
            msg as SyncMessage<Commit>,
            async (values) =>
              (
                await syncService
                  .getRepository(storageType, resourceId)
                  .persistCommits(values)
              ).length,
            () =>
              mapIterable(
                syncService
                  .getRepository(storageType, resourceId)
                  .commits(userSession),
                (c) => [c.id, c]
              ),
            () =>
              syncService
                .getRepository(storageType, resourceId)
                .numberOfCommits(userSession),
            syncService.clientsForRepo(resourceId),
            true
          );
        }
        // else if (storageType === 'log') {
        //   resp = await this.handleSyncRequest<NormalizedLogEntry>(
        //     req,
        //     (entries) => syncService.getLog(resourceId).persistEntries(entries),
        //     () =>
        //       mapIterable(syncService.getLog(resourceId).entriesSync(), (e) => [
        //         e.logId,
        //         e,
        //       ]),
        //     () => syncService.getLog(resourceId).numberOfEntries(),
        //     syncService.clientsForLog(resourceId),
        //     // TODO: Only include results when talking to other, trusted,
        //     // servers. Clients should never receive log entries from the
        //     // server.
        //     true
        //   );
        // }
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
    services: ServerServices,
    msg: SyncMessage<T>,
    persistValues: (values: T[]) => Promise<number>,
    fetchAll: () => Iterable<[string, T]>,
    getLocalCount: () => number,
    replicas: Iterable<BaseClient<T>> | undefined,
    includeMissing: boolean
  ): Promise<Response> {
    // TODO: Auth + Permissions
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
      await generateRequestSignature(services.settings.session),
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

export async function setupTrustPool(
  trustPool: TrustPool,
  sysDir: Repository<MemRepoStorage, SysDirIndexes>
): Promise<void> {
  fetchEncodedRootSessions(sysDir).forEach(async (encodedSesion) => {
    const session = await decodeSession(encodedSesion);
    await trustPool.addSession(session, sysDir.headForKey(session.id)!);
  });
  // Second, load all sessions (signed by root)
  for (const key of sysDir.keys()) {
    const record = sysDir.valueForKey(key);
    if (record.scheme.namespace === SchemeNamespace.SESSIONS) {
      const session = await sessionFromRecord(record);
      await trustPool.addSession(session, sysDir.headForKey(key)!);
    }
  }
}
