import * as path from 'std/path/mod.ts';
import { ServerServices } from '../net/server/server.ts';
import { getBaseURL } from '../net/server/utils.ts';
import { Repository, RepositoryType } from '../repo/repo.ts';
import {
  CommitsMessage,
  OpenRepositoryMessage,
  SQLite3WorkerMessage,
} from './sqlite3-worker-messages.ts';
import { encodeSession } from '../auth/session.ts';
import { Commit } from '../repo/commit.ts';
import {
  JSONCyclicalDecoder,
  JSONCyclicalEncoder,
} from '../base/core-types/encoding/json.ts';
import { ReadonlyJSONObject } from '../base/interfaces.ts';
import { sleep } from '../base/time.ts';
import { kSecondMs } from '../base/date.ts';

export type PersistCommitsCallback = (
  repoId: string,
  commits: Commit[]
) => void;

export class SQLite3RepoBackup {
  private readonly _openRepoResolveFunctions: Map<string, () => void>;
  private readonly _worker: Worker;
  private _nextRequestId = 0;

  constructor(
    readonly services: ServerServices,
    readonly persistCallback: PersistCommitsCallback
  ) {
    this._openRepoResolveFunctions = new Map();
    this._worker = new Worker(new URL(`./sqlite3-worker.ts`, import.meta.url), {
      type: 'module',
    });
    this._worker.onmessage = (event: MessageEvent<SQLite3WorkerMessage>) => {
      const msg = event.data;
      switch (msg.msg) {
        case 'commits': {
          this.persistCallback(
            msg.repoId,
            msg.commits.map((obj) => {
              const decoder = new JSONCyclicalDecoder(
                obj as ReadonlyJSONObject
              );
              return new Commit({ decoder });
            })
          );
          break;
        }

        case 'loadingFinished': {
          const repoId = Repository.id(msg.type, msg.id);
          const key = `${msg.requestId}/${repoId}`;
          const callback = this._openRepoResolveFunctions.get(key);
          if (callback) {
            this._openRepoResolveFunctions.delete(key);
            callback();
          }
          break;
        }
      }
    };
  }

  async open(type: RepositoryType, id: string): Promise<void> {
    let resolve: () => void;
    const result = new Promise<void>((res) => {
      resolve = res;
    });
    const repoId = Repository.id(type, id);
    const requestId = this._nextRequestId++;
    const key = `${requestId}/${repoId}`;
    this._openRepoResolveFunctions.set(key, resolve!);
    const msg: OpenRepositoryMessage = {
      msg: 'openRepo',
      type,
      id,
      path: path.join(this.services.dir, type, id + '.repo'),
      session: await encodeSession(this.services.settings.session),
      replicas: this.services.replicas,
      requestId,
    };
    await sleep(kSecondMs);
    this._worker.postMessage(msg);
    return result;
  }

  persistCommits(repoId: string, commits: Commit[]): void {
    const msg: CommitsMessage = {
      msg: 'commits',
      repoId,
      commits: commits.map((c) => JSONCyclicalEncoder.serialize(c)),
    };
    this._worker.postMessage(msg);
  }
}
