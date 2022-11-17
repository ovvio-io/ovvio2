import {
  Database,
  Statement,
  Transaction,
} from 'https://deno.land/x/sqlite3@0.6.1/mod.ts';
import { resolve as resolvePath } from 'https://deno.land/std@0.160.0/path/mod.ts';
import { Repository, RepoStorage } from '../cfds/base/repo.ts';
import {
  JSONCyclicalDecoder,
  JSONCyclicalEncoder,
} from '../base/core-types/encoding/json.ts';
import { Commit } from '../cfds/base/commit.ts';
import { Record } from '../cfds/base/record.ts';
import * as SetUtils from '../base/set.ts';
import { slices } from '../base/array.ts';

export const TABLE_COMMITS = 'commits';
export const TABLE_HEADS = 'heads';
export const TABLE_REFS = 'refs';
export const INDEX_COMMITS_BY_KEY = 'commitsByKey';

export class SQLiteRepoStorage implements RepoStorage<SQLiteRepoStorage> {
  readonly db: Database;
  private readonly _countStatement: Statement;
  private readonly _getCommitStatement: Statement;
  private readonly _getKeysStatement: Statement;
  private readonly _putCommitStatement: Statement;
  private readonly _putCommitTxn: Transaction<
    [
      commits: Iterable<Commit>,
      repo: Repository<SQLiteRepoStorage>,
      outCommits: Commit[]
    ]
  >;

  constructor(path?: string) {
    if (path) {
      path = resolvePath(path);
    }
    const db = new Database(path || ':memory:');
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
    this._countStatement = db.prepare(`SELECT COUNT(id) from commits;`);
    this._getCommitStatement = db.prepare(
      `SELECT json from commits WHERE ID = :id LIMIT 1;`
    );
    this._getKeysStatement = db.prepare(`SELECT DISTINCT key from commits`);
    this._putCommitStatement = db.prepare(
      `INSERT INTO commits (id, key, ts, json) VALUES (:id, :key, :ts, :json);`
    );
    this._putCommitTxn = db.transaction(([commits, repo, outCommits]) => {
      // First, check we haven't already persisted this commit
      for (const newCommit of commits) {
        if (this._getCommitStatement.values({ id: newCommit.id }).length > 0) {
          continue;
        }
        const { key, session } = newCommit;
        const head = repo.headForKey(key, session);
        const newHead = repo.headForKey(key, session, newCommit)!;
        // Persist our commit to the commits table
        this._putCommitStatement.run({
          id: newCommit.id,
          key: newCommit.key,
          ts: newCommit.timestamp.getTime(),
          json: JSON.stringify(JSONCyclicalEncoder.serialize(newCommit)),
        });
        outCommits.push(newCommit);
        // Skip aux tables update if our head hasn't changed (if this is an
        // historic commit that was missed).
        if (head?.id === newHead?.id) {
          continue;
        }
        this.updateHead(repo, head, newHead);
      }
    });
  }

  numberOfCommits(): number {
    return this._countStatement.value<number[]>()![0];
  }

  getCommit(id: string): Commit | undefined {
    const row = this._getCommitStatement.get({ id });
    return row
      ? new Commit({
          decoder: new JSONCyclicalDecoder(JSON.parse(row.json as string)),
        })
      : undefined;
  }

  *allCommits(): Generator<Commit> {
    const statement = this.db
      .prepare(`SELECT json FROM ${TABLE_COMMITS};`)
      .bind();
    for (const { json } of statement) {
      yield new Commit({
        decoder: new JSONCyclicalDecoder(JSON.parse(json)),
      });
    }
  }

  *commitsForKey(key: string): Generator<Commit> {
    const statement = this.db
      .prepare(`SELECT json WHERE key = ${key} FROM ${TABLE_COMMITS};`)
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
      this._putCommitTxn([s, repo, persistedCommits]);
    }
    return persistedCommits;
  }

  close(): void {
    this.db.close();
  }

  protected updateHead(
    repo: Repository<SQLiteRepoStorage>,
    oldHead: Commit | undefined,
    newHead: Commit
  ): void {
    // NOP in base class
  }
}

export class RecordSQLiteStorage extends SQLiteRepoStorage {
  private readonly _updateHeadStatement: Statement;
  private readonly _deleteRefStatement: Statement;
  private readonly _putRefStatement: Statement;
  constructor(path?: string) {
    super(path);
    const db = this.db;
    db.exec(`CREATE TABLE IF NOT EXISTS heads (
      key TINYTEXT NOT NULL PRIMARY KEY,
      commitId TINYTEXT NOT NULL,
      ns TINYTEXT,
      FOREIGN KEY(commitId) REFERENCES commits(id)
    );`);
    db.exec(`CREATE TABLE IF NOT EXISTS refs (
      src TINYTEXT NOT NULL,
      dst TINYTEXT NOT NULL,
      PRIMARY KEY (src, dst)
    );`);
    this._updateHeadStatement = db.prepare(
      `UPDATE heads SET key = :key, commitId = :commitId, ns = :ns`
    );
    this._putRefStatement = db.prepare(
      `INSERT INTO refs (src, dst) VALUES (:src, :dst);`
    );
    this._deleteRefStatement = db.prepare(
      `DELETE FROM refs WHERE src = :src AND dst = :dst`
    );
  }

  protected updateHead(
    repo: Repository<SQLiteRepoStorage>,
    oldHead: Commit | undefined,
    newHead: Commit
  ): void {
    super.updateHead(repo, oldHead, newHead);
    const headRecord = oldHead
      ? repo.recordForCommit(oldHead)
      : Record.nullRecord();
    const newHeadRecord = repo.recordForCommit(newHead);
    // Update this key's head
    this._updateHeadStatement.run({
      key: newHead.key,
      commitId: newHead.id,
      ns: headRecord.scheme.namespace,
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
