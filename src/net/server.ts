import { join as joinPath } from 'https://deno.land/std@0.160.0/path/mod.ts';
import yargs from 'https://deno.land/x/yargs@v17.6.0-deno/deno.ts';
import { serve } from 'https://deno.land/std@0.160.0/http/server.ts';
import { Repository } from '../cfds/base/repo.ts';
import { SyncMessage } from './types.ts';
import { Client } from './client.ts';
import { assert } from '../base/error.ts';
import { SQLiteRepoStorage } from '../server/sqlite3-storage.ts';

const FILE_EXT = '.repo';

interface Arguments {
  port: number;
  replicas: string[];
  path: string;
}

export class Server {
  private readonly _args: Arguments;
  private readonly _repositories: Map<string, Repository>;
  private readonly _clientsForRepo: Map<string, Client[]>;

  constructor(args?: Arguments) {
    this._repositories = new Map();
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
    this._clientsForRepo = new Map();
  }

  run(): Promise<void> {
    console.log(
      `Replicas: ${this._args.replicas.map((s) => `"${s}"`).join(', ')}`
    );
    return serve((req) => this.handleRequest(req), {
      port: this._args?.port,
    });
  }

  getRepository(id: string): Repository {
    let repo = this._repositories.get(id);
    if (!repo) {
      repo = new Repository(
        new SQLiteRepoStorage(joinPath(this._args.path, id + FILE_EXT))
      );
      this._repositories.set(id, repo);
      const replicas = this._args.replicas;
      if (replicas.length > 0) {
        assert(!this._clientsForRepo.has(id)); // Sanity check
        const clients = this._args.replicas.map((baseServerUrl) =>
          new Client(
            repo!,
            new URL('/repo/' + id, baseServerUrl).toString()
          ).startSyncing()
        );
        this._clientsForRepo.set(id, clients);
      }
    }
    return repo;
  }

  private async handleRequest(req: Request): Promise<Response> {
    const path = new URL(req.url).pathname.split('/');
    if (
      req.method !== 'POST' ||
      !req.body ||
      path.length !== 3 ||
      path[1] !== 'repo'
    ) {
      console.log('Unknown request');
      console.log(req);
      return new Response(null, { status: 400 });
    }

    // TODO: Auth + Permissions
    const repoId = path[2];
    const repo = this.getRepository(repoId);
    const json = await req.json();
    const msg = SyncMessage.fromJS(json);
    for (const commit of msg.commits) {
      repo.persistCommit(commit);
    }
    const syncResp = SyncMessage.build(msg.filter, repo);
    return new Response(JSON.stringify(syncResp.toJS()), {
      headers: {
        'content-type': 'application/json; charset=utf-8',
      },
    });
  }
}
