import * as path from 'std/path/mod.ts';
import {
  decodeSession,
  EncodedSession,
  encodedSessionFromRecord,
  encodeSession,
  sessionFromRecord,
  TrustPool,
} from '../auth/session.ts';
import { slices } from '../base/array.ts';
import { coreValueClone } from '../base/core-types/clone.ts';
import {
  JSONCyclicalDecoder,
  JSONCyclicalEncoder,
} from '../base/core-types/encoding/json.ts';
import { assert } from '../base/error.ts';
import { ReadonlyJSONObject } from '../base/interfaces.ts';
import { SerialScheduler } from '../base/serial-scheduler.ts';
import { Record } from '../cfds/base/record.ts';
import { SchemeNamespace } from '../cfds/base/scheme-types.ts';
import { setGlobalLoggerStreams } from '../logging/log.ts';
import { Commit } from '../repo/commit.ts';
import { Repository } from '../repo/repo.ts';
import { SQLiteRepoStorage } from './sqlite3-repo-storage.ts';
import {
  LoadingFinishedMessage,
  SQLite3WorkerMessage,
  WorkerReadyMessage,
} from './sqlite3-worker-messages.ts';

function fetchEncodedRootSessions(
  sysDir: Repository<SQLiteRepoStorage>,
): EncodedSession[] {
  const db = sysDir.storage.db;
  const statement = db.prepare(
    `SELECT json FROM heads WHERE ns = 'sessions' AND json->'$.d'->>'$.owner' = 'root';`,
  );
  const encodedRecord = statement.all();
  const result: EncodedSession[] = [];
  for (const r of encodedRecord) {
    const record = Record.fromJS(JSON.parse(r.json));
    if (record.get<Date>('expiration').getTime() - Date.now() <= 0) {
      continue;
    }
    assert(record.get('owner') === 'root');
    result.push(encodedSessionFromRecord(record));
  }
  return result;
}

async function setupTrustPool(
  trustPool: TrustPool,
  sysDir: Repository<SQLiteRepoStorage>,
): Promise<void> {
  // First, load all root sessions
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

async function processMessage(
  openRepositories: Map<string, Repository<SQLiteRepoStorage>>,
  msg: SQLite3WorkerMessage,
  trustPool: TrustPool,
  baseDir: string,
): Promise<void> {
  switch (msg.msg) {
    case 'openRepo': {
      const repoId = Repository.id(msg.type, msg.id);
      // console.log(`WORKER: ${msg.msg}/${repoId}`);
      let repo = openRepositories.get(repoId);
      if (!repo) {
        repo = new Repository(
          new SQLiteRepoStorage(path.join(baseDir, msg.type, msg.id + '.repo')),
          trustPool,
        );
        openRepositories.set(repoId, repo);
      }
      // Load all commits from disk
      let commitCount = 0;
      for (const batch of slices(repo.commits(), 1000)) {
        commitCount += batch.length;
        postMessage({
          msg: 'commits',
          repoId,
          commits: batch.map((c) => JSONCyclicalEncoder.serialize(c)),
        });
      }
      postMessage({
        msg: 'loadingFinished',
        type: msg.type,
        id: msg.id,
        count: commitCount,
        requestId: msg.requestId,
      } as LoadingFinishedMessage);
      break;
    }

    case 'commits': {
      const repo = openRepositories.get(msg.repoId);
      // console.log(`WORKER: ${msg.msg}/${msg.repoId}`);
      if (repo) {
        await repo.persistCommits(
          msg.commits.map((obj) => {
            const decoder = new JSONCyclicalDecoder(obj as ReadonlyJSONObject);
            return new Commit({ decoder });
          }),
        );
      }
      break;
    }
  }
}

function onMessage(
  openRepositories: Map<string, Repository<SQLiteRepoStorage>>,
  event: MessageEvent<SQLite3WorkerMessage>,
  trustPool: TrustPool,
  baseDir: string,
): void {
  const data = coreValueClone(event.data);
  SerialScheduler.get('sqlite3worker').run(() =>
    processMessage(openRepositories, data, trustPool, baseDir)
  );
}

async function main(): Promise<void> {
  setGlobalLoggerStreams([]);

  const openRepositories: Map<
    string,
    Repository<SQLiteRepoStorage>
  > = new Map();
  let didInit = false;
  let trustPool: TrustPool;
  let sysDir: Repository<SQLiteRepoStorage>;
  let baseDir: string;
  self.onmessage = async (event: MessageEvent<SQLite3WorkerMessage>) => {
    const msg = event.data;
    if (!didInit && msg.msg !== 'initWorker') {
      return;
    }

    if (msg.msg === 'initWorker') {
      console.log(`Initializing worker...`);
      const session = await decodeSession(msg.session);
      trustPool = new TrustPool(session, []);
      baseDir = msg.baseDir;
      sysDir = new Repository(
        new SQLiteRepoStorage(path.join(baseDir, 'sys', 'dir.repo')),
        trustPool,
      );
      openRepositories.set(Repository.id('sys', 'dir'), sysDir);
      await setupTrustPool(trustPool, sysDir);
      didInit = true;
      console.log(`Worker ready.`);
      const readyMsg: WorkerReadyMessage = {
        msg: 'workerReady',
        rootSessions: await Promise.all(
          trustPool.roots.map((s) => encodeSession(s)),
        ),
        trustedSessions: await Promise.all(
          trustPool.trustedSessions.map((s) => encodeSession(s)),
        ),
      };
      postMessage(readyMsg);
      return;
    }

    onMessage(openRepositories, event, trustPool, baseDir);
  };
}

main();
