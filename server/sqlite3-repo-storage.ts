import { Database, Statement } from 'sqlite3';
import { resolve as resolvePath, dirname } from 'std/path/mod.ts';
import { Repository, RepoStorage } from '../repo/repo.ts';
import {
  JSONCyclicalDecoder,
  JSONCyclicalEncoder,
} from '../base/core-types/encoding/json.ts';
import { Commit } from '../repo/commit.ts';
import { Record as CFDSRecord } from '../cfds/base/record.ts';
import * as SetUtils from '../base/set.ts';
import { slices } from '../base/array.ts';
import { Code, ServerError } from '../cfds/base/errors.ts';
import { log } from '../logging/log.ts';
import { randomInt } from '../base/math.ts';

const ALL_COMMITS_CACHE_MS = 100;
export type UnknownRow = Record<string, unknown>;

export interface CommitRow extends UnknownRow {
  id: string;
  key: string | null;
  ts: number;
  json: string;
}

export interface HeadRow extends UnknownRow {
  commitId: string;
  ns: string;
  ts: number;
  json: string;
}

export interface RefRow extends UnknownRow {
  src: string;
  dst: string;
}

/**
 * An SQLite storage that also maintains additional tables designed for sane
 * queries over the record graph.
 *
 * This class maintains the following tables:
 *
 * "commits": The raw commit objects, delta compressed.
 * "heads": A mapping of key to latest, full, Record value, for easy querying.
 * "refs": All edges in the graph defined by the "heads" table.
 */
export class SQLiteRepoStorage implements RepoStorage<SQLiteRepoStorage> {
  private _allCommitsCache: string[] | undefined;
  private _allCommitsCacheTs: number = 0;

  readonly db: Database;
  constructor(readonly path?: string) {
    if (path) {
      path = resolvePath(path);
      const dir = dirname(path);
      Deno.mkdirSync(dir, { recursive: true });
    }
    const db = new Database(path || ':memory:', { create: true });
    this.db = db;
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA busy_timeout = 1000;');
    db.exec('PRAGMA foreign_keys = ON;');
    db.exec(`CREATE TABLE IF NOT EXISTS commits (
      id TINYTEXT NOT NULL PRIMARY KEY,
      key TINYTEXT,
      ts TIMESTAMP NOT NULL,
      json TEXT NOT NULL
    );`);
    db.exec(`CREATE INDEX IF NOT EXISTS commitsByKey ON commits (key);`);
    // NOTE: The `heads` table holds the full JSON record for simplicity so we
    // don't have to deal with delta compression when reading.
    db.exec(`CREATE TABLE IF NOT EXISTS heads (
      key TINYTEXT NOT NULL PRIMARY KEY,
      commitId TINYTEXT NOT NULL,
      ns TINYTEXT,
      ts TIMESTAMP NOT NULL,
      json TEXT NOT NULL
    );`);
    db.exec(`CREATE TABLE IF NOT EXISTS refs (
      src TINYTEXT NOT NULL,
      dst TINYTEXT NOT NULL,
      PRIMARY KEY (src, dst)
    );`);
  }

  get countStatement(): Statement {
    return this.db.prepare(`SELECT COUNT(id) from commits;`);
  }
  get getCommitStatement(): Statement {
    return this.db.prepare(`SELECT json from commits WHERE ID = :id LIMIT 1;`);
  }
  get getKeysStatement(): Statement {
    return this.db.prepare(`SELECT DISTINCT key from commits`);
  }

  get putCommitStatement(): Statement {
    return this.db.prepare(
      `INSERT INTO commits (id, key, ts, json) VALUES (:id, :key, :ts, :json);`
    );
  }
  get getHeadStatement(): Statement {
    return this.db.prepare(`SELECT json from heads WHERE KEY = :key LIMIT 1;`);
  }

  get updateHeadStatement(): Statement {
    return this.db.prepare(
      `INSERT OR REPLACE INTO heads (key, commitId, ns, ts, json) VALUES (:key, :commitId, :ns, :ts, :json)`
    );
  }

  get putRefStatement(): Statement {
    return this.db.prepare(
      `INSERT OR IGNORE INTO refs (src, dst) VALUES (:src, :dst);`
    );
  }

  get deleteRefStatement(): Statement {
    return this.db.prepare(`DELETE FROM refs WHERE src = :src AND dst = :dst`);
  }

  private putCommitInTxn(
    commits: Iterable<Commit>,
    repo: Repository<SQLiteRepoStorage>,
    outCommits: Commit[]
  ): number {
    let persistedCount = 0;
    // First, check we haven't already persisted this commit
    for (const newCommit of commits) {
      if (this.getCommitStatement.values({ id: newCommit.id }).length > 0) {
        continue;
      }
      const { key, session } = newCommit;
      const headId = this.headIdForKey(key);
      const head = headId ? this.getCommit(headId) : undefined;
      // Persist our commit to the commits table
      this.putCommitStatement.run({
        id: newCommit.id,
        key: newCommit.key,
        ts: newCommit.timestamp.getTime(),
        json: JSON.stringify(JSONCyclicalEncoder.serialize(newCommit)),
      });
      outCommits.push(newCommit);
      ++persistedCount;
      const newHead = repo.headForKey(key, session, newCommit)!;
      // Skip aux tables update if our head hasn't changed (if this is an
      // historic commit that was missed).
      if (headId === newHead?.id) {
        continue;
      }
      this.updateHead(repo, head, newHead);
    }
    return persistedCount;
  }

  numberOfCommits(): number {
    return this.countStatement.value<number[]>()![0];
  }

  getCommit(id: string): Commit | undefined {
    const row = this.getCommitStatement.get<CommitRow>({ id });
    return row
      ? new Commit({
          decoder: new JSONCyclicalDecoder(JSON.parse(row.json)),
        })
      : undefined;
  }

  allCommitsIds(): Iterable<string> {
    if (
      this._allCommitsCache &&
      performance.now() - this._allCommitsCacheTs <= ALL_COMMITS_CACHE_MS
    ) {
      return this._allCommitsCache;
    }
    const statement = this.db.prepare(`SELECT id FROM commits;`).bind();
    const result: string[] = [];
    for (const { id } of statement) {
      result.push(id);
    }
    this._allCommitsCache = result;
    this._allCommitsCacheTs = performance.now();
    return result;
  }

  *commitsForKey(key: string): Generator<Commit> {
    const statement = this.db
      .prepare(`SELECT json FROM commits WHERE key = '${key}';`)
      .bind();
    for (const { json } of statement) {
      yield new Commit({
        decoder: new JSONCyclicalDecoder(JSON.parse(json)),
      });
    }
  }

  allKeys(): Iterable<string> {
    return this.getKeysStatement.values<string[]>().map((arr) => arr[0]);
  }

  persistCommits(
    commits: Iterable<Commit>,
    repo: Repository<SQLiteRepoStorage>
  ): Iterable<Commit> {
    const startTime = performance.now();
    const persistedCommits: Commit[] = [];
    const repoPathForMetric = this.path || ':memory:';
    let commitCount = 0;
    for (const s of slices(commits, 100)) {
      try {
        this.db.transaction(() => {
          commitCount += this.putCommitInTxn(s, repo, persistedCommits);
        })();
      } catch (err: unknown) {
        // if (err instanceof Error && err.message === 'database is locked') {
        log({
          severity: 'METRIC',
          name: 'DBError',
          unit: 'Count',
          value: 1,
          path: repoPathForMetric,
          trace: (err as Error).stack,
        });
        // } else {
        //   throw err;
        // }
      }
    }
    log({
      severity: 'METRIC',
      name: 'CommitsPersistTime',
      unit: 'Milliseconds',
      value: performance.now() - startTime,
      path: repoPathForMetric,
    });
    log({
      severity: 'METRIC',
      name: 'CommitsPersistCount',
      unit: 'Milliseconds',
      value: commitCount,
      path: repoPathForMetric,
    });
    if (randomInt(0, 10) === 0) {
      try {
        this.db.exec('PRAGMA wal_checkpoint');
      } catch (_: unknown) {}
    }
    return persistedCommits;
  }

  close(): void {
    this.db.close();
  }

  valueForKey(key: string | null): CFDSRecord | undefined {
    const row = this.getHeadStatement.get<HeadRow>({ key });
    return row
      ? new CFDSRecord({
          decoder: new JSONCyclicalDecoder(JSON.parse(row.json as string)),
        })
      : undefined;
  }

  headIdForKey(key: string | null): string | undefined {
    const row = this.getHeadStatement.get<HeadRow>({ key });
    return row?.commitId;
  }

  protected updateHead(
    repo: Repository<SQLiteRepoStorage>,
    oldHead: Commit | undefined,
    newHead: Commit
  ): void {
    try {
      const headRecord = oldHead
        ? repo.recordForCommit(oldHead)
        : CFDSRecord.nullRecord();
      const newHeadRecord = repo.recordForCommit(newHead);
      // Update this key's head
      this.updateHeadStatement.run({
        key: newHead.key,
        commitId: newHead.id,
        ns: newHeadRecord.scheme.namespace,
        ts: newHead.timestamp.getTime(),
        json: JSON.stringify(JSONCyclicalEncoder.serialize(newHeadRecord)),
      });
      const deletedRefs = SetUtils.subtract(
        headRecord.refs,
        newHeadRecord.refs
      );
      const addedRefs = SetUtils.subtract(newHeadRecord.refs, headRecord.refs);
      // Update refs table
      const src = newHead.key;
      for (const ref of deletedRefs) {
        this.deleteRefStatement.run({ src, dst: ref });
      }
      for (const ref of addedRefs) {
        this.putRefStatement.run({ src, dst: ref });
      }
    } catch (err: unknown) {
      if (
        !(err instanceof ServerError) ||
        err.code !== Code.ServiceUnavailable
      ) {
        throw err;
      }
    }
  }
}
