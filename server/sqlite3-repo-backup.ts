import { ServerServices } from '../net/server/server.ts';
import { Repository, RepositoryType } from '../repo/repo.ts';
import {
  CommitsMessage,
  InitWorkerMessage,
  OpenRepositoryMessage,
  SQLite3WorkerMessage,
  WorkerReadyMessage,
} from './sqlite3-worker-messages.ts';
import { decodeSession, encodeSession } from '../auth/session.ts';
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

        case 'workerReady': {
          this.onWorkerReady(msg);
          break;
        }
      }
    };
    sleep(kSecondMs).then(() => {
      this.initWorker();
    });
  }

  private async initWorker(): Promise<void> {
    const initMsg: InitWorkerMessage = {
      msg: 'initWorker',
      baseDir: this.services.dir,
      session: await encodeSession(this.services.settings.session),
    };
    this._worker.postMessage(initMsg);
  }

  private async onWorkerReady(msg: WorkerReadyMessage): Promise<void> {
    const trustPool = this.services.trustPool;
    for (const encodedSession of msg.rootSessions) {
      trustPool.addSessionUnsafe(await decodeSession(encodedSession));
    }
    for (const encodedSession of msg.trustedSessions) {
      trustPool.addSessionUnsafe(await decodeSession(encodedSession));
    }
    await this.open('sys', 'dir');
  }

  open(type: RepositoryType, id: string): Promise<void> {
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
      requestId,
    };
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
