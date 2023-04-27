import { join as joinPath } from 'https://deno.land/std@0.160.0/path/mod.ts';
import yargs from 'https://deno.land/x/yargs@v17.7.1-deno/deno.ts';
import { serve } from 'https://deno.land/std@0.160.0/http/server.ts';
import { Repository } from '../repo/repo.ts';
import { SyncMessage, SyncValueType } from './message.ts';
import { RepoClient } from './repo-client.ts';
import {
  BaseClient,
  kSyncConfigClient,
  kSyncConfigServer,
  syncConfigGetCycles,
} from './base-client.ts';
import { assert } from '../base/error.ts';
import { SQLiteRepoStorage } from '../server/sqlite3-repo-storage.ts';
import { Dictionary } from '../base/collections/dict.ts';
import { log } from '../logging/log.ts';
import { mapIterable } from '../base/common.ts';
import { SQLiteLogStorage } from '../server/sqlite3-log-storage.ts';
import { LogClient } from './log-client.ts';
import { NormalizedLogEntry } from '../logging/entry.ts';
import {
  JSONCyclicalDecoder,
  JSONCyclicalEncoder,
} from '../base/core-types/encoding/json.ts';
import { VersionNumber } from '../defs.ts';
import { VersionInfoCurrent } from './version-info.ts';

interface Arguments {
  port: number;
  replicas: string[];
  dir: string;
}

export class Server {
  private readonly _args: Arguments;
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

  constructor(args?: Arguments) {
    if (!args) {
      args = yargs(Deno.args)
        .option('port', {
          alias: 'p',
          type: 'number',
          description: 'The port on which the server accepts incoming requests',
          default: 8080,
        })
        .option('replicas', {
          alias: 'r',
          type: 'array',
          default: [],
          description:
            'A list of replica URLs which this server will sync with',
        })
        .option('dir', {
          alias: 'd',
          description:
            'A full path to a local directory which will host all repositories managed by this server',
        })
        .demandOption(
          ['dir'],
          'Please provide a local directory for this server'
        )
        .parse();
    }
    this._args = args!;
    this._repositories = new Map();
    this._clientsForRepo = new Map();
    this._logs = new Map();
    this._clientsForLog = new Map();
  }

  run(): Promise<void> {
    // TODO: Scan path for existing contents and set up replication
    log({
      severity: 'INFO',
      name: 'ServerStarted',
      value: 1,
      unit: 'Count',
      urls: this._args.replicas,
    });
    return serve((req) => this.handleRequest(req), {
      port: this._args?.port,
    });
  }

  getRepository(id: string): Repository<SQLiteRepoStorage> {
    let repo = this._repositories.get(id);
    if (!repo) {
      repo = new Repository(
        new SQLiteRepoStorage(joinPath(this._args.dir, 'repos', id + '.repo'))
      );
      this._repositories.set(id, repo);
      const replicas = this._args.replicas;
      if (replicas.length > 0) {
        assert(!this._clientsForRepo.has(id)); // Sanity check
        const clients = this._args.replicas.map((baseServerUrl) =>
          new RepoClient(
            repo!,
            new URL('/repo/' + id, baseServerUrl).toString(),
            kSyncConfigServer
          ).startSyncing()
        );
        this._clientsForRepo.set(id, clients);
      }
    }
    return repo;
  }

  getLog(id: string): SQLiteLogStorage {
    let storage = this._logs.get(id);
    if (!storage) {
      storage = new SQLiteLogStorage(
        joinPath(this._args.dir, 'logs', id + '.logs')
      );
      this._logs.set(id, storage);
      const replicas = this._args.replicas;
      if (replicas.length > 0) {
        assert(!this._clientsForLog.has(id)); // Sanity check
        const clients = this._args.replicas.map((baseServerUrl) =>
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

  private processResponse(resp: Response): Response {
    log({
      severity: 'INFO',
      name: 'HttpStatusCode',
      value: resp.status,
      unit: 'Count',
    });
    return resp;
  }

  private async handlePOSTRequest(req: Request): Promise<Response> {
    const path = new URL(req.url).pathname.split('/');
    if (
      req.method !== 'POST' ||
      !req.body ||
      path.length !== 4 ||
      ['repo', 'log'].includes(path[1])
    ) {
      log({
        severity: 'INFO',
        error: 'BadRequest',
        url: req.url,
        value: {
          method: req.method,
          hasBody: Boolean(req.body),
        },
      });
      return this.processResponse(new Response(null, { status: 400 }));
    }

    const storageType = path[1];
    const resourceId = path[2];
    const cmd = path[3];
    let resp: Response;
    switch (cmd) {
      case 'sync':
        if (storageType === 'repo') {
          resp = await this.handleSyncRequest(
            req,
            (values) =>
              Promise.resolve(
                this.getRepository(resourceId).persistCommits(values).length
              ),
            () =>
              mapIterable(this.getRepository(resourceId).commits(), (c) => [
                c.id,
                c,
              ]),
            () => this.getRepository(resourceId).numberOfCommits,
            this._clientsForRepo.get(resourceId)!,
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
            this._clientsForLog.get(resourceId)!,
            // TODO: Only include results when talking to other, trusted,
            // servers. Clients should never receive log entries from the
            // server.
            true
          );
        }
        break;

      default:
        log({ severity: 'INFO', error: 'UnknownCommand', value: cmd });
        resp = new Response(null, { status: 400 });
        break;
    }
    return this.processResponse(resp!);
  }

  private handleGETRequest(req: Request): Promise<Response> {
    const path = new URL(req.url).pathname;
    switch (path.toLocaleLowerCase()) {
      // Version check
      case 'version': {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              VersionInfoCurrent,
            }),
            {
              headers: {
                'content-type': 'application/json; charset=utf-8',
              },
            }
          )
        );
      }

      // Health check
      case 'healthy': {
        return Promise.resolve(new Response('OK', { status: 200 }));
      }

      default: {
        log({
          severity: 'INFO',
          error: 'BadRequest',
          url: req.url,
          value: {
            method: req.method,
            hasBody: Boolean(req.body),
          },
        });
        return Promise.resolve(
          this.processResponse(new Response(null, { status: 400 }))
        );
      }
    }
  }

  private handleRequest(req: Request): Promise<Response> {
    try {
      if (req.method === 'POST') {
        return this.handlePOSTRequest(req);
      }
      if (req.method === 'GET') {
        return this.handleGETRequest(req);
      }
      log({
        severity: 'INFO',
        error: 'BadRequest',
        url: req.url,
        value: {
          method: req.method,
          hasBody: Boolean(req.body),
        },
      });
      return Promise.resolve(
        this.processResponse(new Response(null, { status: 400 }))
      );
    } catch (e) {
      log({
        severity: 'ERROR',
        error: 'UncaughtServerError',
        message: e.message,
        trace: e.stack,
      });
      return Promise.resolve(
        this.processResponse(new Response(null, { status: 500 }))
      );
    }
  }

  private async handleSyncRequest<T extends SyncValueType>(
    req: Request,
    persistValues: (values: T[]) => Promise<number>,
    fetchAll: () => Iterable<[string, T]>,
    getLocalCount: () => number,
    replicas: Iterable<BaseClient<T>>,
    includeMissing: boolean
  ): Promise<Response> {
    // TODO: Auth + Permissions
    const json = await req.json();
    const clientVersion = json.pv || 0;
    const msg = new SyncMessage<T>({
      decoder: new JSONCyclicalDecoder(json),
    });
    if ((await persistValues(msg.values)) > 0) {
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
      includeMissing && clientVersion >= VersionNumber.Current
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
