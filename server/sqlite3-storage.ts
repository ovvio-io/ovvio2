import { Database, Statement } from 'https://deno.land/x/sqlite3@0.6.1/mod.ts';
import { resolve as resolvePath } from 'https://deno.land/std@0.160.0/path/mod.ts';
import { RepoStorage } from '../cfds/base/repo.ts';
import {
  JSONCyclicalDecoder,
  JSONCyclicalEncoder,
} from '../base/core-types/encoding/json.ts';
import { Commit } from '../cfds/base/commit.ts';
import { assert } from '../base/error.ts';

const COMMITS_TABLE = 'commits';
const COMMITS_BY_KEY_IDX = 'commitsByKey';

export class SQLiteRepoStorage implements RepoStorage {
  private readonly _db: Database;
  private readonly _countStatement: Statement;
  private readonly _getCommitStatement: Statement;
  private readonly _getKeysStatement: Statement;
  private readonly _putCommitStatement: Statement;

  constructor(path: string) {
    path = resolvePath(path);
    const db = new Database(path);
    this._db = db;
    db.exec(`CREATE TABLE IF NOT EXISTS ${COMMITS_TABLE} (
      id TINYTEXT NOT NULL PRIMARY KEY,
      key TINYTEXT NOT NULL,
      ts TIMESTAMP NOT NULL,
      json TEXT NOT NULL
    );`);
    db.exec(
      `CREATE INDEX IF NOT EXISTS ${COMMITS_BY_KEY_IDX} ON ${COMMITS_TABLE} (key);`
    );
    this._countStatement = db.prepare(
      `SELECT COUNT(id) from ${COMMITS_TABLE};`
    );
    this._getCommitStatement = db.prepare(
      `SELECT json from ${COMMITS_TABLE} WHERE ID = :id;`
    );
    this._getKeysStatement = db.prepare(
      `SELECT DISTINCT key from ${COMMITS_TABLE}`
    );
    this._putCommitStatement = db.prepare(
      `INSERT INTO ${COMMITS_TABLE} (id, key, ts, json) VALUES (:id, :key, :ts, :json);`
    );
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
    const statement = this._db
      .prepare(`SELECT json FROM ${COMMITS_TABLE};`)
      .bind();
    for (const { json } of statement) {
      yield new Commit({
        decoder: new JSONCyclicalDecoder(JSON.parse(json)),
      });
    }
  }

  *commitsForKey(key: string): Generator<Commit> {
    const statement = this._db
      .prepare(`SELECT json WHERE key = ${key} FROM ${COMMITS_TABLE};`)
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

  persistCommit(c: Commit): void {
    const existing = this.getCommit(c.id);
    if (existing) {
      assert(existing.isEqual(c));
      return;
    }
    this._putCommitStatement.run({
      id: c.id,
      key: c.key,
      ts: c.timestamp.getTime(),
      json: JSON.stringify(JSONCyclicalEncoder.serialize(c)),
    });
  }
}
