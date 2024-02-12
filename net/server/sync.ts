import { join as joinPath } from 'std/path/mod.ts';
import { Dictionary } from '../../base/collections/dict.ts';
import { mapIterable, runGC } from '../../base/common.ts';
import {
  JSONCyclicalDecoder,
  JSONCyclicalEncoder,
} from '../../base/core-types/encoding/json.ts';
import { assert } from '../../base/error.ts';
import { log } from '../../logging/log.ts';
import {
  Authorizer,
  kRepositoryTypes,
  MemRepoStorage,
  Repository,
  RepositoryIndexes,
  RepositoryType,
} from '../../repo/repo.ts';
import { getOvvioConfig } from '../../server/config.ts';
import { BaseClient } from '../base-client.ts';
import { SyncMessage } from '../message.ts';
import { SyncValueType } from '../message.ts';
import { RepoClient } from '../repo-client.ts';
import { Endpoint, ServerServices } from './server.ts';
import { getRequestPath } from './utils.ts';
import { BaseService } from './service.ts';
import { Commit } from '../../repo/commit.ts';
import {
  decodeSession,
  OwnedSession,
  Session,
  sessionFromRecord,
  TrustPool,
} from '../../auth/session.ts';
import {
  createSysDirAuthorizer,
  createUserAuthorizer,
  createWorkspaceAuthorizer,
} from '../../repo/auth.ts';
import {
  fetchEncodedRootSessions,
  persistSession,
  requireSignedUser,
} from './auth.ts';
import { SchemeNamespace } from '../../cfds/base/scheme-types.ts';
import { RepositoryIndex } from '../../repo/index.ts';
import { JSONLogRepoBackup } from '../../repo/json-log-repo-backup.ts';
import {
  JSONArray,
  JSONObject,
  ReadonlyJSONObject,
} from '../../base/interfaces.ts';
import {
  kSyncConfigServer,
  syncConfigGetCycles,
  SyncScheduler,
} from '../sync-scheduler.ts';
import { RendezvousHash } from '../../base/rendezvous-hash.ts';
import { randomInt } from '../../base/math.ts';

const gSyncSchedulers = new Map<string, SyncScheduler>();

function syncSchedulerForURL(
  url: string,
  trustPool: TrustPool,
  orgId: string,
): SyncScheduler {
  let res = gSyncSchedulers.get(url);
  if (!res) {
    res = new SyncScheduler(url, kSyncConfigServer, trustPool, orgId);
    gSyncSchedulers.set(url, res);
  }
  return res;
}

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

  private readonly _backupForRepo: Dictionary<string, JSONLogRepoBackup>;
  private readonly _rendezvousHash: RendezvousHash<number>;

  constructor() {
    super();
    this._repositories = new Map();
    this._clientsForRepo = new Map();
    this._backupForRepo = new Map();
    this._rendezvousHash = new RendezvousHash();
  }

  get ready(): boolean {
    return true;
  }

  async setup(services: ServerServices): Promise<void> {
    super.setup(services);
    const sysDir = this.getSysDir();
    const trustPool = services.trustPool;
    await setupTrustPool(trustPool, sysDir);
    await persistSession(services, services.settings.session);
    for (let i = 0; i < services.serverProcessCount; ++i) {
      this._rendezvousHash.addPeer(i);
    }
  }

  setupRepository(
    type: RepositoryType,
    id: string,
    indexes?: (
      repo: Repository<MemRepoStorage, RepositoryIndexes<MemRepoStorage>>,
    ) => RepositoryIndexes<MemRepoStorage>,
  ): Repository<MemRepoStorage> {
    const repoId = Repository.id(type, id);
    assert(!this._repositories.has(repoId));
    let authorizer: Authorizer<MemRepoStorage>;
    switch (type) {
      case 'sys':
        assert(id === 'dir'); // Sanity check
        authorizer = createSysDirAuthorizer(
          () => this.services.settings.operatorEmails,
        );
        break;

      case 'data':
        authorizer = createWorkspaceAuthorizer(
          () => this.services.settings.operatorEmails,
          this.getRepository('sys', 'dir'),
          id,
        );
        break;

      case 'user':
        authorizer = createUserAuthorizer(this.getRepository('sys', 'dir'), id);
        break;
    }
    const repo = new Repository(
      new MemRepoStorage(),
      this.services.trustPool,
      Repository.namespacesForType(type),
      authorizer,
      indexes,
    );
    this._repositories.set(repoId, repo);
    const backup = new JSONLogRepoBackup(
      joinPath(this.services.dir, type, id + '.repo'),
      this.services.serverProcessIndex,
    );
    this._backupForRepo.set(repoId, backup);
    this.loadRepoFromBackup(repoId, repo, backup);
    assert(!this._clientsForRepo.has(repoId)); // Sanity check
    const clients: RepoClient<MemRepoStorage>[] = [];
    for (let i = 0; i < this.services.serverProcessCount; ++i) {
      if (i === this.services.serverProcessIndex) {
        continue;
      }
      clients.push(
        new RepoClient(
          repo!,
          type,
          id,
          kSyncConfigServer,
          syncSchedulerForURL(
            `http://localhost:${9000 + i}/batch-sync`,
            this.services.trustPool,
            this.services.organizationId,
          ),
        ).startSyncing(),
      );
    }
    this._clientsForRepo.set(repoId, clients);
    return repo;
  }

  private loadRepoFromBackup(
    repoId: string,
    repo: Repository<MemRepoStorage>,
    backup: JSONLogRepoBackup,
  ): void {
    repo.allowMerge = false;
    const allowedNamespaces = repo.allowedNamespaces;
    for (const c of backup.open()) {
      if (
        c.scheme?.namespace === undefined ||
        allowedNamespaces.includes(c.scheme?.namespace)
      ) {
        repo.persistVerifiedCommits([c]);
      }
    }
    repo.allowMerge = true;
    repo.attach('NewCommit', (c: Commit) => {
      const clients = this._clientsForRepo.get(repoId);
      if (
        this._rendezvousHash.peerForKey(c.key) ===
        this.services.serverProcessIndex
      ) {
        backup.appendCommits([c]);
      }
      if (clients) {
        for (const c of clients) {
          c.touch();
        }
      }
    });
  }

  getRepository<T extends RepositoryIndexes<MemRepoStorage>>(
    type: RepositoryType,
    id: string,
  ): Repository<MemRepoStorage, T> {
    const repoId = Repository.id(type, id);
    let repo = this._repositories.get(repoId);
    if (!repo) {
      if (repoId === Repository.id('sys', 'dir')) {
        repo = this.setupRepository(type, id, (r) => {
          return {
            users: new RepositoryIndex(
              r,
              (_key, record) =>
                record.scheme.namespace === SchemeNamespace.USERS,
            ),
            rootSessions: new RepositoryIndex(
              r,
              (_key, record) =>
                record.scheme.namespace === SchemeNamespace.SESSIONS &&
                record.get('owner') === 'root',
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

  clientsForRepo(id: string): RepoClient<MemRepoStorage>[] {
    return this._clientsForRepo.get(id)!;
  }

  repoIdForKey(key: string | null): string | undefined {
    for (const [repoId, repo] of this._repositories) {
      if (repo.hasKey(key)) {
        return repoId;
      }
    }
    return undefined;
  }

  start(): void {
    for (const clients of this._clientsForRepo.values()) {
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
  }
}

export class SyncEndpoint implements Endpoint {
  filter(
    services: ServerServices,
    req: Request,
    info: Deno.ServeHandlerInfo,
  ): boolean {
    if (req.method !== 'POST') {
      return false;
    }
    const path = getRequestPath(req).split('/');
    if (path.length === 2 && path[1] === 'batch-sync') {
      return true;
    }
    if (path.length !== 4 || ![...kRepositoryTypes, 'log'].includes(path[1])) {
      return false;
    }
    return true;
  }

  processRequest(
    services: ServerServices,
    req: Request,
    info: Deno.ServeHandlerInfo,
  ): Promise<Response> {
    if (!req.body) {
      return Promise.resolve(
        new Response(null, {
          status: 400,
        }),
      );
    }
    const path = getRequestPath(req).split('/');

    if (path.length === 3 && path[2] === 'sync') {
      return this.processSingleSyncRequest(services, req, info);
    }

    if (path.length === 2 && path[1] === 'batch-sync') {
      return this.processBatchSyncRequest(services, req, info);
    }
    return Promise.resolve(new Response(null, { status: 400 }));
  }

  async processBatchSyncRequest(
    services: ServerServices,
    req: Request,
    info: Deno.ServeHandlerInfo,
  ): Promise<Response> {
    const encodedRequests = await req.json();
    if (!(encodedRequests instanceof Array)) {
      return Promise.resolve(new Response(null, { status: 400 }));
    }
    const sig = req.headers.get('X-Ovvio-Sig');
    if (!sig) {
      return Promise.resolve(new Response(null, { status: 400 }));
    }
    const [userId, userRecord, userSession] = await requireSignedUser(
      services,
      sig,
      'anonymous',
    );
    const results: JSONArray = [];
    for (const r of encodedRequests) {
      const { storage, id, msg } = r;
      if (!kRepositoryTypes.includes(storage as RepositoryType)) {
        continue;
      }
      results.push({
        storage,
        id,
        res: await this.doSync(services, storage, id, userSession, msg),
      });
      runGC();
    }
    const respJsonStr = JSON.stringify(results);
    return new Response(respJsonStr);
  }

  async processSingleSyncRequest(
    services: ServerServices,
    req: Request,
    info: Deno.ServeHandlerInfo,
  ): Promise<Response> {
    const syncService = services.sync;
    const path = getRequestPath(req).split('/');
    const storageType = path[1] as RepositoryType;
    const resourceId = path[2];
    const cmd = path[3];
    const json = await req.json();
    runGC();
    let resp: Response;
    switch (cmd) {
      case 'sync': {
        if (
          storageType === 'data' ||
          storageType === 'sys' ||
          storageType === 'user'
        ) {
          const sig = req.headers.get('x-ovvio-sig');
          if (!sig) {
            resp = new Response(null, { status: 400 });
            break;
          }
          const [userId, userRecord, userSession] = await requireSignedUser(
            services,
            sig,
            'anonymous',
          );
          resp = new Response(
            JSON.stringify(
              await this.doSync(
                services,
                storageType,
                resourceId,
                userSession,
                json,
              ),
            ),
            {
              headers: {
                'Content-Type': 'application/json',
              },
            },
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
      }

      default:
        // debugger;
        log({ severity: 'INFO', error: 'UnknownCommand', value: cmd });
        resp = new Response(null, { status: 400 });
    }
    return resp!;
  }

  private async doSync<T extends SyncValueType>(
    services: ServerServices,
    storageType: string,
    resourceId: string,
    userSession: Session,
    json: JSONObject,
  ): Promise<JSONObject> {
    const syncService = services.sync;
    return await this._handleSyncRequestAfterAuth(
      services,
      json,
      async (values) =>
        (
          await syncService
            .getRepository(storageType as RepositoryType, resourceId)
            .persistCommits(values)
        ).length,
      () =>
        mapIterable(
          syncService
            .getRepository(storageType as RepositoryType, resourceId)
            .commits(userSession),
          (c) => [c.id, c],
        ),
      () =>
        syncService
          .getRepository(storageType as RepositoryType, resourceId)
          .numberOfCommits(userSession),
      syncService.clientsForRepo(resourceId),
      true,
    );
  }

  private async _handleSyncRequestAfterAuth<T extends SyncValueType>(
    services: ServerServices,
    msgJSON: JSONObject,
    persistValues: (values: T[]) => Promise<number>,
    fetchAll: () => Iterable<[string, T]>,
    getLocalCount: () => number,
    replicas: Iterable<BaseClient<T>> | undefined,
    includeMissing: boolean,
  ): Promise<ReadonlyJSONObject> {
    const msg = new SyncMessage<T>({
      decoder: new JSONCyclicalDecoder(msgJSON),
    });
    if (msg.values.length > 0) {
      if ((await persistValues(msg.values)) > 0 && replicas) {
        // Sync changes with replicas
        for (const c of replicas) {
          c.touch();
        }
      }
    }

    const syncResp = SyncMessage.build(
      msg.filter,
      fetchAll(),
      getLocalCount(),
      msg.size,
      syncConfigGetCycles(kSyncConfigServer),
      // Don't return new commits to old clients
      includeMissing && msg.buildVersion >= getOvvioConfig().version,
    );

    const encodedResp = JSONCyclicalEncoder.serialize(syncResp);
    msg.filter.reuse();
    syncResp.filter.reuse();
    return encodedResp;
  }
}

export async function setupTrustPool(
  trustPool: TrustPool,
  sysDir: Repository<MemRepoStorage, SysDirIndexes>,
): Promise<void> {
  await Promise.allSettled(
    fetchEncodedRootSessions(sysDir).map(async (encodedSession) => {
      const session = await decodeSession(encodedSession);
      trustPool.addSessionUnsafe(session);
    }),
  );
}
