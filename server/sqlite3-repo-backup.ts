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
  commits: Commit[],
) => void;

export class SQLite3RepoBackup {
  private readonly _openPromises: Map<string, Promise<void>>;
  private readonly _openRepoResolveFunctions: Map<string, () => void>;
  private readonly _readyPromise: Promise<void>;
  private _readyPromiseResolve!: () => void;
  private readonly _worker: Worker;
  private _nextRequestId = 0;
  private _ready = false;

  constructor(
    readonly services: ServerServices,
    readonly persistCallback: PersistCommitsCallback,
  ) {
    this._openPromises = new Map();
    this._openRepoResolveFunctions = new Map();
    this._readyPromise = new Promise<void>((res) => {
      this._readyPromiseResolve = res;
    });
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
                obj as ReadonlyJSONObject,
              );
              return new Commit({ decoder });
            }),
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
          this._readyPromiseResolve();
          this.onWorkerReady(msg);
          break;
        }
      }
    };
    sleep(kSecondMs).then(() => {
      this.initWorker();
    });
  }

  get ready(): boolean {
    return this._ready;
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
    this._ready = true;
  }

  async open(type: RepositoryType, id: string): Promise<void> {
    await this._readyPromise;
    const repoId = Repository.id(type, id);
    let promise = this._openPromises.get(repoId);
    if (!promise) {
      let resolve: () => void;
      promise = new Promise<void>((res) => {
        resolve = res;
      });
      const requestId = this._nextRequestId++;
      const key = `${requestId}/${repoId}`;
      this._openRepoResolveFunctions.set(key, () => {
        if (this._openPromises.get(repoId) === promise) {
          this._openPromises.delete(repoId);
        }
        resolve!();
      });
      const msg: OpenRepositoryMessage = {
        msg: 'openRepo',
        type,
        id,
        requestId,
      };
      this._worker.postMessage(msg);
      this._openPromises.set(repoId, promise);
    }
    return promise;
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
