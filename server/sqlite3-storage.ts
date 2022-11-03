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
import { assert } from '../base/error.ts';
import { Record } from '../cfds/base/record.ts';
import * as SetUtils from '../base/set.ts';

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
  private readonly _updateHeadStatement: Statement;
  private readonly _deleteRefStatement: Statement;
  private readonly _putRefStatement: Statement;
  private readonly _putCommitTxn: Transaction<
    [c: Commit, repo: Repository<SQLiteRepoStorage>]
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
      key TINYTEXT NOT NULL,
      ts TIMESTAMP NOT NULL,
      json TEXT NOT NULL
    );`);
    db.exec(`CREATE INDEX IF NOT EXISTS commitsByKey ON commits (key);`);
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
    this._countStatement = db.prepare(`SELECT COUNT(id) from commits;`);
    this._getCommitStatement = db.prepare(
      `SELECT json from commits WHERE ID = :id;`
    );
    this._getKeysStatement = db.prepare(`SELECT DISTINCT key from commits`);
    this._putCommitStatement = db.prepare(
      `INSERT INTO commits (id, key, ts, json) VALUES (:id, :key, :ts, :json);`
    );
    this._updateHeadStatement = db.prepare(
      `UPDATE heads SET key = :key, commitId = :commitId, ns = :ns`
    );
    this._putRefStatement = db.prepare(
      `INSERT INTO refs (src, dst) VALUES (:src, :dst);`
    );
    this._deleteRefStatement = db.prepare(
      `DELETE FROM refs WHERE src = :src AND dst = :dst`
    );
    this._putCommitTxn = db.transaction(([newCommit, repo]) => {
      // First, check we haven't already persisted this commit
      if (this._getCommitStatement.run({ id: newCommit.id }) !== undefined) {
        throw new Error('Commit already exists');
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
      // Commit the transaction early if our head hasn't changed (if this is an
      // historic commit that was missed).
      if (head?.id === newHead?.id) {
        return;
      }
      const headRecord = head
        ? repo.recordForCommit(head)
        : Record.nullRecord();
      const newHeadRecord = repo.recordForCommit(newHead);
      // Update this key's head
      this._updateHeadStatement.run({
        key: newHead.key,
        commitId: newHead.id,
        ns: headRecord.scheme.namespace,
      });
      const deletedRefs = SetUtils.subtract(
        headRecord.refs,
        newHeadRecord.refs
      );
      const addedRefs = SetUtils.subtract(newHeadRecord.refs, headRecord.refs);
      // Update refs table
      const src = newCommit.key;
      for (const ref of deletedRefs) {
        this._deleteRefStatement.run({ src, dst: ref });
      }
      for (const ref of addedRefs) {
        this._putRefStatement.run({ src, dst: ref });
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

  persistCommit(c: Commit, repo: Repository<SQLiteRepoStorage>): void {
    // const existing = this.getCommit(c.id);
    // if (existing) {
    //   assert(existing.isEqual(c));
    //   return;
    // }
    // this._putCommitStatement.run({
    //   id: c.id,
    //   key: c.key,
    //   ts: c.timestamp.getTime(),
    //   json: JSON.stringify(JSONCyclicalEncoder.serialize(c)),
    // });
    this._putCommitTxn([c, repo]);
  }

  close(): void {
    this.db.close();
  }
}
