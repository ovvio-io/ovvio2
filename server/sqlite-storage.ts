import * as path from 'std/path/mod.ts';
import { BindValue, Database, Statement } from 'sqlite3';
import { RepoStorage } from '../repo/repo.ts';
import { Repository } from '../repo/repo.ts';
import { Commit } from '../repo/commit.ts';
import { assert } from '../base/error.ts';
import { JSONArray, JSONObject, JSONValue } from '../base/interfaces.ts';

export class SQLite3ServerStorage {
  readonly db: Database;
  private readonly _repoStorage: Map<string, SQLite3RepoStorage>;

  constructor(dbPath: string, readonly = false) {
    Deno.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new Database(':memory:', {
      // readonly: readonly === true,
      unsafeConcurrency: true,
      memory: true,
    });
    this._repoStorage = new Map();
  }

  get(orgId: string, repoId: string): SQLite3RepoStorage {
    assert(this.db.open);
    repoId = Repository.normalizeId(repoId);
    const key = `${orgId}:${repoId}`;
    let storage = this._repoStorage.get(key);
    if (!storage) {
      storage = new SQLite3RepoStorage(this, orgId, repoId);
      this._repoStorage.set(key, storage);
    }
    return storage;
  }

  close(): void {
    Array.from(this._repoStorage.values()).forEach((s) => s.close());
    this.db.close();
  }

  _markClosed(
    orgId: string,
    repoId: string,
    storage: SQLite3RepoStorage,
  ): void {
    const key = `${orgId}:${repoId}`;
    assert(this._repoStorage.get(key) === storage);
    this._repoStorage.delete(key);
  }
}

interface CommitRow {
  id: string;
  key: string;
  json: string;
  ts: number;
}

export class SQLite3RepoStorage implements RepoStorage<SQLite3RepoStorage> {
  readonly repoId: string;
  private readonly _numberOfCommitsStatement: Statement;
  private readonly _commitByIdStatement: Statement;
  private readonly _allIdsStatement: Statement;
  private readonly _commitsByKeyStatement: Statement;
  private readonly _allKeysStatement: Statement;
  private readonly _insertCommitStatement: Statement;
  private _closed = false;
  constructor(
    readonly storage: SQLite3ServerStorage,
    readonly orgId: string,
    repoId: string,
  ) {
    this.repoId = Repository.normalizeId(repoId);
    const commitsTableName = `${orgId}_commits_${this.repoId.replaceAll(
      /[^a-zA-Z0-9]+/gu,
      '_',
    )}`;
    storage.db.exec(
      `CREATE TABLE IF NOT EXISTS ${commitsTableName} (
        id TEXT PRIMARY KEY,
        key TEXT,
        json TEXT,
        ts REAL
      );`,
    );
    storage.db.exec(
      `CREATE INDEX ${
        commitsTableName + '_byKey'
      } ON ${commitsTableName} (key);`,
    );
    this._numberOfCommitsStatement = storage.db.prepare(
      `SELECT COUNT(*) as res FROM ${commitsTableName};`,
    );
    this._commitByIdStatement = storage.db.prepare(
      `SELECT json FROM ${commitsTableName} WHERE id = ? LIMIT 1;`,
    );
    this._allIdsStatement = storage.db.prepare(
      `SELECT id FROM ${commitsTableName};`,
    );
    this._commitsByKeyStatement = storage.db.prepare(
      `SELECT json FROM ${commitsTableName} WHERE key = ?;`,
    );
    this._allKeysStatement = storage.db.prepare(
      `SELECT DISTINCT key from ${commitsTableName};`,
    );
    this._insertCommitStatement = storage.db.prepare(
      `INSERT OR IGNORE INTO ${commitsTableName} VALUES(:id, :key, :json, :ts);`,
    );
  }

  numberOfCommits(): number {
    return (
      this._numberOfCommitsStatement.get<Record<'res', number>>()?.res || 0
    );
  }

  hasCommit(id: string): boolean {
    return (
      this._commitByIdStatement.get<Record<'json', string>>(id)?.json !==
      undefined
    );
  }

  getCommit(id: string): Commit | undefined {
    const str = this._commitByIdStatement.get<Record<'json', string>>(id)?.json;
    try {
      return str ? Commit.fromJS(this.orgId, JSON.parse(str)) : undefined;
    } catch (_: unknown) {
      // skip
    }
    return undefined;
  }

  *allCommitsIds(): Generator<string> {
    for (const { id } of this._allIdsStatement) {
      if (this._closed) {
        break;
      }
      yield id;
    }
  }

  commitsForKey(key: string | null): Iterable<Commit> {
    const result: Commit[] = [];
    for (const { json } of this._commitsByKeyStatement.all(key)) {
      if (this._closed) {
        break;
      }
      if (json) {
        try {
          result.push(Commit.fromJS(this.orgId, JSON.parse(json)));
        } catch (_: unknown) {
          // skip
        }
      }
    }
    return result;
  }

  allKeys(): Iterable<string> {
    const result: string[] = [];
    for (const { key } of this._allKeysStatement) {
      if (this._closed) {
        break;
      }
      result.push(key);
    }
    return result;
  }

  persistCommits(commits: Iterable<Commit>): Iterable<Commit> {
    const result: Commit[] = [];
    const encodedCommits: [Commit, Record<string, BindValue>][] = [];
    for (const c of commits) {
      encodedCommits.push([
        c,
        {
          id: c.id,
          key: c.key,
          ts: c.timestamp.getTime(),
          json: JSON.stringify(c.toJS()),
        },
      ]);
    }
    this.storage.db.transaction(() => {
      for (const [c, json] of encodedCommits) {
        if (this._closed) {
          break;
        }
        if (!this.hasCommit(c.id)) {
          this._insertCommitStatement.run(json);
        }
        result.push(c);
      }
    })();
    return result;
  }

  close(): void {
    this._closed = true;
    this.storage._markClosed(this.orgId, this.repoId, this);
  }
}
