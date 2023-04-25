import {
  Database,
  Statement,
  Transaction,
} from 'https://deno.land/x/sqlite3@0.9.1/mod.ts';
import { resolve as resolvePath } from 'https://deno.land/std@0.160.0/path/mod.ts';
import { LogClientStorage } from '../net/log-client.ts';
import { NormalizedLogEntry } from '../logging/entry.ts';
import { slices } from '../base/array.ts';
export class SQLiteLogStorage implements LogClientStorage {
  readonly db: Database;
  private readonly _countStatement: Statement;
  private readonly _getIdsStatement: Statement;
  private readonly _getLogEntryStatement: Statement;
  private readonly _getAllEntriesStatement: Statement;
  private readonly _putEntryStatement: Statement;
  private readonly _putEntryTxn: Transaction<
    [
      entries: Iterable<NormalizedLogEntry>,
      persistedEntries: NormalizedLogEntry[]
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
    db.exec(`CREATE TABLE IF NOT EXISTS entries (
      id TEXT NOT NULL PRIMARY KEY,
      severityCode INTEGER NOT NULL,
      ts REAL NOT NULL,
      json TEXT NOT NULL
    );`);
    db.exec(`CREATE INDEX IF NOT EXISTS entriesByTimestamp ON entries (ts);`);
    this._countStatement = db.prepare(`SELECT COUNT(id) from entries;`);
    this._getIdsStatement = db.prepare(`SELECT DISTINCT id from entries`);
    this._getLogEntryStatement = db.prepare(
      `SELECT id from entries WHERE ID = :id LIMIT 1;`
    );
    this._getAllEntriesStatement = db.prepare(`SELECT json from entries`);
    this._putEntryStatement = db.prepare(
      `INSERT INTO entries (id, severityCode, ts, json) VALUES (:id, :severityCode, :ts, :json);`
    );
    this._putEntryTxn = db.transaction(([entries, persistedEntries]) => {
      // First, check we haven't already persisted this entry
      for (const e of entries) {
        if (this._getLogEntryStatement.values({ id: e.logId }).length > 0) {
          continue;
        }
        // Persist our commit to the commits table
        this._putEntryStatement.run({
          id: e.logId,
          severityCode: e.severityCode,
          ts: e.timestamp.getTime(),
          json: JSON.stringify(e),
        });
        persistedEntries.push(e);
        this.onEntryPersisted(e);
      }
    });
  }

  numberOfEntries(): number {
    return this._countStatement.value<number[]>()![0];
  }

  entryIds(): Iterable<string> {
    return this._getIdsStatement.values<string[]>().map((arr) => arr[0]);
  }

  persistEntries(entries: NormalizedLogEntry[]): Promise<number> {
    const persistedEntries: NormalizedLogEntry[] = [];
    for (const s of slices(entries, 100)) {
      this._putEntryTxn([s, persistedEntries]);
    }
    return Promise.resolve(persistedEntries.length);
  }

  async *entries(): AsyncGenerator<NormalizedLogEntry> {
    for (const { json } of this._getAllEntriesStatement) {
      yield json;
    }
  }

  *entriesSync(): Generator<NormalizedLogEntry> {
    for (const { json } of this._getAllEntriesStatement) {
      yield json;
    }
  }

  close(): void {
    this.db.close();
  }

  protected onEntryPersisted(entry: NormalizedLogEntry): void {
    // NOP in base class
  }
}
