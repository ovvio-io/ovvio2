import { decodeSession, TrustPool } from '../auth/session.ts';
import { slices } from '../base/array.ts';
import { coreValueClone } from '../base/core-types/clone.ts';
import {
  JSONCyclicalEncoder,
  JSONCyclicalDecoder,
} from '../base/core-types/encoding/json.ts';
import { assert } from '../base/error.ts';
import { ReadonlyJSONObject } from '../base/interfaces.ts';
import { SerialScheduler } from '../base/serial-scheduler.ts';
import { setGlobalLoggerStreams } from '../logging/log.ts';
import { kSyncConfigServer } from '../net/base-client.ts';
import { RepoClient } from '../net/repo-client.ts';
import { Commit } from '../repo/commit.ts';
import { Repository } from '../repo/repo.ts';
import { SQLiteRepoStorage } from './sqlite3-repo-storage.ts';
import {
  SQLite3WorkerMessage,
  LoadingFinishedMessage,
} from './sqlite3-worker-messages.ts';

const openRepositories: Map<string, Repository<SQLiteRepoStorage>> = new Map();
const clientsForRepo: Map<string, RepoClient<SQLiteRepoStorage>[]> = new Map();

async function processMessage(msg: SQLite3WorkerMessage): Promise<void> {
  switch (msg.msg) {
    case 'openRepo': {
      const repoId = Repository.id(msg.type, msg.id);
      let repo = openRepositories.get(repoId);
      if (!repo) {
        const session = await decodeSession(msg.session);
        const trustPool = new TrustPool(session, []);
        repo = new Repository(new SQLiteRepoStorage(msg.path), trustPool);
        openRepositories.set(repoId, repo);
        const replicas = msg.replicas;
        if (replicas.length > 0) {
          assert(!clientsForRepo.has(repoId)); // Sanity check
          const clients = replicas.map((baseServerUrl) =>
            new RepoClient(
              repo!,
              new URL(`/${msg.type}/${msg.id}/sync`, baseServerUrl).toString(),
              kSyncConfigServer
            ).startSyncing()
          );
          clientsForRepo.set(repoId, clients);
        }
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
      if (repo) {
        repo.persistCommits(
          msg.commits.map((obj) => {
            const decoder = new JSONCyclicalDecoder(obj as ReadonlyJSONObject);
            return new Commit({ decoder });
          })
        );
      }
      break;
    }
  }
}

function onMessage(event: MessageEvent<SQLite3WorkerMessage>): void {
  const data = coreValueClone(event.data);
  SerialScheduler.get('sqlite3worker').run(() => processMessage(data));
}

setGlobalLoggerStreams([]);
self.onmessage = onMessage;
