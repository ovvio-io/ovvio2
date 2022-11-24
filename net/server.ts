import { join as joinPath } from 'https://deno.land/std@0.160.0/path/mod.ts';
import yargs from 'https://deno.land/x/yargs@v17.6.0-deno/deno.ts';
import { serve } from 'https://deno.land/std@0.160.0/http/server.ts';
import { Repository } from '../repo/repo.ts';
import { SyncMessage, SyncValueType } from './types.ts';
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

interface Arguments {
  port: number;
  replicas: string[];
  path: string;
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
        .alias({ p: 'port', r: 'replicas' })
        .default({
          port: 8080,
          replicas: [],
        })
        .number(['port'])
        .array(['replicas'])
        .demandOption(['path'])
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
        new SQLiteRepoStorage(joinPath(this._args.path, 'repos', id + '.repo'))
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
        joinPath(this._args.path, 'logs', id + '.logs')
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

  private async handleRequest(req: Request): Promise<Response> {
    try {
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
            const repo = this.getRepository(resourceId);
            resp = await this.handleSyncRequest(
              req,
              (values) => repo.persistCommits(values).length,
              () => mapIterable(repo.commits(), (c) => [c.id, c]),
              () => repo.numberOfCommits,
              this._clientsForRepo.get(resourceId)!
            );
          } else if (storageType === 'log') {
            const logStorage = this.getLog(resourceId);
            resp = await this.handleSyncRequest<NormalizedLogEntry>(
              req,
              (entries) => logStorage.persistEntries(entries),
              () => mapIterable(logStorage.entries(), (e) => [e.logId, e]),
              () => logStorage.numberOfEntries(),
              this._clientsForLog.get(resourceId)!
            );
          }
          break;

        // case 'query':
        //   resp = await this.handleQueryRequest(req, repoId);
        //   break;

        default:
          log({ severity: 'INFO', error: 'UnknownCommand', value: cmd });
          resp = new Response(null, { status: 400 });
          break;
      }
      return this.processResponse(resp!);
    } catch (e) {
      log({
        severity: 'ERROR',
        error: 'UncaughtServerError',
        message: e.message,
        trace: e.stack,
      });
      return this.processResponse(new Response(null, { status: 500 }));
    }
  }

  private async handleSyncRequest<T extends SyncValueType>(
    req: Request,
    persistValues: (values: T[]) => number,
    fetchAll: () => Iterable<[string, T]>,
    getLocalCount: () => number,
    replicas: Iterable<BaseClient<T>>
  ): Promise<Response> {
    // TODO: Auth + Permissions
    const json = await req.json();
    const msg = new SyncMessage<T>({
      decoder: new JSONCyclicalDecoder(json),
    });
    if (persistValues(msg.values) > 0) {
      // Sync changes with replicas
      for (const c of replicas) {
        c.touch();
      }
    }
    const syncResp = SyncMessage.build(
      msg.filter,
      fetchAll(),
      getLocalCount(),
      msg.repoSize,
      syncConfigGetCycles(kSyncConfigClient)
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

  // private async handleQueryRequest(
  //   req: Request,
  //   repoId: string
  // ): Promise<Response> {
  //   // TODO: Auth + Permissions
  //   const json = await req.json();
  //   const sql = json.sql;
  //   if (sql.length <= 1) {
  //     console.log('Invalid query');
  //     console.log(req);
  //     return new Response(null, { status: 400 });
  //   }
  //   const repo = this.getRepository(repoId);
  //   const statement = repo.storage.db.prepare(sql);
  //   if (!statement.readonly) {
  //     return new Response(null, { status: 400 });
  //   }
  //   const result = statement.all();
  //   return new Response(JSON.stringify(result), {
  //     headers: {
  //       'content-type': 'application/json; charset=utf-8',
  //     },
  //   });
  // }
}
