import { Database, Statement } from 'sqlite3';
import { resolve as resolvePath, dirname } from 'std/path/mod.ts';
import { LogEntry, LogStream } from './log.ts';
import { NormalizedLogEntry } from './entry.ts';
import { randomInt } from '../base/math.ts';

export class SQLiteLogStream implements LogStream {
  readonly db: Database;

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
    db.exec(`CREATE TABLE IF NOT EXISTS entries (
      id TINYTEXT NOT NULL PRIMARY KEY,
      ts TIMESTAMP NOT NULL,
      code INTEGER NOT NULL,
      severity TINYTEXT NOT NULL,
      json TEXT NOT NULL
    );`);
    db.exec('CREATE INDEX IF NOT EXISTS entriesByTs ON entries (ts)');
  }

  appendEntry(e: NormalizedLogEntry<LogEntry>): void {
    if (e.code === 403) {
      return;
    }
    const statement = this.db.prepare(
      `INSERT OR IGNORE INTO entries (id, ts, code, severity, json) VALUES (:id, :ts, :code, :severity, :json);`
    );
    statement.run({
      id: e.logId,
      ts: e.timestamp,
      code: e.severityCode,
      severity: e.severity,
      json: JSON.stringify(e),
    });
    if (randomInt(0, 100) === 0) {
      try {
        this.db.exec('PRAGMA wal_checkpoint');
      } catch (_: unknown) {}
    }
  }
}
