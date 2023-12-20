import { open } from 'npm:lmdb';
import { mapIterable } from '../base/common.ts';
import {
  JSONCyclicalDecoder,
  JSONCyclicalEncoder,
} from '../base/core-types/encoding/json.ts';
import { Commit } from '../repo/commit.ts';

export class LMDBRepoBackup {
  private readonly _db: any;

  constructor(readonly path: string) {
    this._db = open({
      path,
      compression: true,
    });
  }

  async persistCommits(commits: Iterable<Commit>): Promise<void> {
    const db = this._db;
    await Promise.all(
      Array.from(mapIterable(commits, (c) => {
        const encodedCommit = JSONCyclicalEncoder.serialize(c);
        return db.ifNoExists(c.id, () => {
          db.put(c.id, encodedCommit);
        });
      })),
    );
  }

  allCommits(): Commit[] {
    const results: Commit[] = [];
    for (const { key, value } of this._db.getRange()) {
      results.push(
        new Commit({
          decoder: new JSONCyclicalDecoder(value),
        }),
      );
    }
    return results;
  }
}
