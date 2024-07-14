import { slices } from '../base/array.ts';
import { default as sqlite3InitModule } from '../external/sqlite3.mjs';
import { Repository } from './repo.ts';
import { RepoStorage } from './repo.ts';

type SQLite3Primitive = string | number | null | Uint8Array;

type SQLite3Row<
  K extends string = string,
  V extends SQLite3Primitive = SQLite3Primitive,
> = Record<K, V>;

interface SQLite3DBConstructorProps {
  filename: string;
  flags?: string;
  vfs?: string;
}

interface SQLite3ExecOpts {
  sql?: string;
  returnValue: 'this' | 'resultRows' | 'saveSql';
}

interface SQLite3Statement {
  readonly columnCount: number;
  readonly parameterCount: number;
  bind(params: SQLite3Row): this;
  clearBindings(): this;
  finalize(): number | undefined;
  get(outRow: SQLite3Row): SQLite3Row;
  reset(alsoClearBinds?: boolean): this;
  step(): boolean;
  stepFinalize(): boolean;
  stepReset(): this;
}

type SQLite3TransactionMode = 'DEFERRED' | 'IMMEDIATE' | 'EXCLUSIVE';
type SQLite3TransactionCallback<RT extends SQLite3Row, OT> = (
  db: SQLite3DB<RT>,
) => OT;

interface SQLite3DB<T extends SQLite3Row = SQLite3Row> {
  close(): void;
  exec(
    sql: string | SQLite3ExecOpts,
    opts?: SQLite3ExecOpts,
  ): this | T[] | SQLite3Statement;
  prepare(sql: string): SQLite3Statement;
  transaction<OT>(
    modeOrCallback: SQLite3TransactionMode | SQLite3TransactionCallback<T, OT>,
    callback?: SQLite3TransactionCallback<T, OT>,
  ): OT;
}

interface SQLite3<T extends SQLite3Row = SQLite3Row> {
  oo1: {
    DB: {
      new (props: SQLite3DBConstructorProps): SQLite3DB<T>;
    };
  };
}

type DocumentRow = {
  id: string;
  key: string;
  ts: number;
  json: string;
};

let sqlite3: SQLite3<DocumentRow>;
let pendingSqlite3Callbacks: (() => void)[] | undefined = [];

(self as any).sqlite3ApiConfig = { silent: true };
sqlite3InitModule().then((o: SQLite3<DocumentRow>) => {
  sqlite3 = o;
  for (const f of pendingSqlite3Callbacks!) {
    f();
  }
  pendingSqlite3Callbacks = undefined;
});

export class RepositorySQLite3Index<T extends RepoStorage<T>> {
  private _repositories: Map<string, Map<string, Repository<T>>>;
  private _didSetup: Set<string>;
  private _db: SQLite3DB<DocumentRow> | undefined;
  private _insertCount = 0;

  constructor() {
    this._repositories = new Map();
    this._didSetup = new Set();
    if (!sqlite3) {
      pendingSqlite3Callbacks!.push(() => {
        this._db = new sqlite3.oo1.DB({ filename: ':memory:' });
        this.scanAllRepositories();
      });
    }
  }

  register(orgId: string, repoId: string, repo: Repository<T>): void {
    repoId = Repository.normalizeId(repoId);
    let orgMap = this._repositories.get(orgId);
    if (!orgMap) {
      orgMap = new Map();
      this._repositories.set(orgId, orgMap);
    }
    if (!orgMap.has(repoId)) {
      orgMap.set(repoId, repo);
      this.scanRepo(orgId, repoId, repo);
    }
  }

  repository(orgId: string, repoId: string): Repository<T> | undefined {
    return this._repositories.get(orgId)?.get(Repository.normalizeId(repoId));
  }

  private get db(): SQLite3DB<DocumentRow> | undefined {
    return this._db;
  }

  private recordsTableName(orgId: string, repoId: string): string {
    repoId = Repository.normalizeId(repoId);
    return `${orgId}_records_${repoId.replaceAll(/[^a-zA-Z0-9]+/gu, '_')}`;
  }

  private setupRepoIfNeeded(orgId: string, repoId: string): void {
    const db = this.db;
    if (!db) {
      return;
    }
    repoId = Repository.normalizeId(repoId);
    if (this._didSetup.has(repoId)) {
      return;
    }
    const recordsTableName = this.recordsTableName(orgId, repoId);
    db.exec(
      `CREATE TABLE IF NOT EXISTS ${recordsTableName} (
        key TEXT PRIMARY KEY,
        ns TEXT,
        head TEXT,
        modified REAL,
        json TEXT
      );`,
    );
    db.exec(
      `CREATE INDEX IF NOT EXISTS ${
        recordsTableName + '_byNs'
      } ON ${recordsTableName} (ns);`,
    );
    db.exec(
      `CREATE INDEX IF NOT EXISTS ${
        recordsTableName + '_byModified'
      } ON ${recordsTableName} (modified);`,
    );
    this._didSetup.add(repoId);
  }

  private scanRepo(orgId: string, repoId: string, repo: Repository<T>): void {
    const db = this.db;
    if (!db) {
      return;
    }
    repoId = Repository.normalizeId(repoId);
    const startTime = performance.now();
    this.setupRepoIfNeeded(orgId, repoId);
    const recordsTableName = this.recordsTableName(orgId, repoId);
    const insertStmt = db.prepare(
      `REPLACE INTO ${recordsTableName} VALUES($key, $ns, $head, $modified, $json);`,
    );
    const getStmt: SQLite3Statement = db.prepare(
      `SELECT head, json FROM ${recordsTableName} WHERE key = $key LIMIT 1;`,
    );
    let insertCount = 0;
    for (const batch of slices(repo.keys(), 1000)) {
      db.transaction(() => {
        for (const key of batch) {
          const head = repo.headForKey(key)!;
          getStmt.bind({
            $key: key,
          });
          if (!getStmt.step() || getStmt.get({}).head !== head.id) {
            const record = repo.recordForCommit(head);
            insertStmt.bind({
              $key: head.key,
              $ns: record.scheme.namespace,
              $head: head.id,
              $modified: head.timestamp.getTime(),
              $json: JSON.stringify(record.toJS(true)),
            });
            insertStmt.stepReset();
            ++insertCount;
          }
          getStmt.clearBindings();
          getStmt.reset();
        }
      });
    }
    this._insertCount += insertCount;
    console.log(
      `Scan finished for ${orgId}:${repoId} in ${
        performance.now() - startTime
      }ms. Inserted ${insertCount}, total = ${this._insertCount}`,
    );
  }

  private scanAllRepositories(): void {
    for (const [orgId, orgMap] of this._repositories) {
      for (const [repoId, repo] of orgMap) {
        this.scanRepo(orgId, repoId, repo);
      }
    }
  }
}
