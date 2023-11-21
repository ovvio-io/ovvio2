import {
  Database,
  Statement,
  Transaction,
} from 'https://deno.land/x/sqlite3@0.9.1/mod.ts';
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

// export const TABLE_COMMITS = 'commits';
// export const INDEX_COMMITS_BY_KEY = 'commitsByKey';

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
  readonly db: Database;
  private readonly _countStatement: Statement;
  private readonly _getCommitStatement: Statement;
  private readonly _getKeysStatement: Statement;
  private readonly _putCommitStatement: Statement;
  private readonly _getHeadStatement: Statement;
  private readonly _updateHeadStatement: Statement;
  private readonly _deleteRefStatement: Statement;
  private readonly _putRefStatement: Statement;

  constructor(path?: string) {
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
    this._countStatement = db.prepare(`SELECT COUNT(id) from commits;`);
    this._getCommitStatement = db.prepare(
      `SELECT json from commits WHERE ID = :id LIMIT 1;`
    );
    this._getKeysStatement = db.prepare(`SELECT DISTINCT key from commits`);
    this._putCommitStatement = db.prepare(
      `INSERT INTO commits (id, key, ts, json) VALUES (:id, :key, :ts, :json);`
    );
    this._getHeadStatement = db.prepare(
      `SELECT json from heads WHERE KEY = :key LIMIT 1;`
    );
    this._updateHeadStatement = db.prepare(
      `INSERT OR REPLACE INTO heads (key, commitId, ns, ts, json) VALUES (:key, :commitId, :ns, :ts, :json)`
    );
    this._putRefStatement = db.prepare(
      `INSERT OR IGNORE INTO refs (src, dst) VALUES (:src, :dst);`
    );
    this._deleteRefStatement = db.prepare(
      `DELETE FROM refs WHERE src = :src AND dst = :dst`
    );
  }

  private putCommitInTxn(
    commits: Iterable<Commit>,
    repo: Repository<SQLiteRepoStorage>,
    outCommits: Commit[]
  ): void {
    // First, check we haven't already persisted this commit
    for (const newCommit of commits) {
      if (this._getCommitStatement.values({ id: newCommit.id }).length > 0) {
        continue;
      }
      const { key, session } = newCommit;
      const headId = this.headIdForKey(key);
      const head = headId ? this.getCommit(headId) : undefined;
      // Persist our commit to the commits table
      this._putCommitStatement.run({
        id: newCommit.id,
        key: newCommit.key,
        ts: newCommit.timestamp.getTime(),
        json: JSON.stringify(JSONCyclicalEncoder.serialize(newCommit)),
      });
      outCommits.push(newCommit);
      const newHead = repo.headForKey(key, session, newCommit)!;
      // Skip aux tables update if our head hasn't changed (if this is an
      // historic commit that was missed).
      if (headId === newHead?.id) {
        continue;
      }
      this.updateHead(repo, head, newHead);
    }
  }

  numberOfCommits(): number {
    return this._countStatement.value<number[]>()![0];
  }

  getCommit(id: string): Commit | undefined {
    const row = this._getCommitStatement.get<CommitRow>({ id });
    return row
      ? new Commit({
          decoder: new JSONCyclicalDecoder(JSON.parse(row.json)),
        })
      : undefined;
  }

  *allCommits(): Generator<Commit> {
    const statement = this.db.prepare(`SELECT json FROM commits;`).bind();
    for (const { json } of statement) {
      yield new Commit({
        decoder: new JSONCyclicalDecoder(JSON.parse(json)),
      });
    }
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
    return this._getKeysStatement.values<string[]>().map((arr) => arr[0]);
  }

  persistCommits(
    commits: Iterable<Commit>,
    repo: Repository<SQLiteRepoStorage>
  ): Iterable<Commit> {
    const persistedCommits: Commit[] = [];
    for (const s of slices(commits, 100)) {
      this.db
        .transaction(() => {
          this.putCommitInTxn(s, repo, persistedCommits);
        })
        .immediate(undefined);
    }
    return persistedCommits;
  }

  close(): void {
    this.db.close();
  }

  valueForKey(key: string | null): CFDSRecord | undefined {
    const row = this._getHeadStatement.get<HeadRow>({ key });
    return row
      ? new CFDSRecord({
          decoder: new JSONCyclicalDecoder(JSON.parse(row.json as string)),
        })
      : undefined;
  }

  headIdForKey(key: string | null): string | undefined {
    const row = this._getHeadStatement.get<HeadRow>({ key });
    return row?.commitId;
  }

  protected updateHead(
    repo: Repository<SQLiteRepoStorage>,
    oldHead: Commit | undefined,
    newHead: Commit
  ): void {
    const headRecord = oldHead
      ? repo.recordForCommit(oldHead)
      : CFDSRecord.nullRecord();
    const newHeadRecord = repo.recordForCommit(newHead);
    // Update this key's head
    this._updateHeadStatement.run({
      key: newHead.key,
      commitId: newHead.id,
      ns: newHeadRecord.scheme.namespace,
      ts: newHead.timestamp.getTime(),
      json: JSON.stringify(JSONCyclicalEncoder.serialize(newHeadRecord)),
    });
    const deletedRefs = SetUtils.subtract(headRecord.refs, newHeadRecord.refs);
    const addedRefs = SetUtils.subtract(newHeadRecord.refs, headRecord.refs);
    // Update refs table
    const src = newHead.key;
    for (const ref of deletedRefs) {
      this._deleteRefStatement.run({ src, dst: ref });
    }
    for (const ref of addedRefs) {
      this._putRefStatement.run({ src, dst: ref });
    }
  }
}
