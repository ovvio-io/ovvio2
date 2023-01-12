import React, {
  useContext,
  useEffect,
  useState,
} from 'https://esm.sh/react@18.2.0';
import {
  openDB,
  deleteDB,
  DBSchema,
  IDBPDatabase,
} from 'https://esm.sh/idb@7.1.1/with-async-ittr';
import {
  GlobalLogger,
  log,
  Logger,
  newLogger,
} from '../../../../../logging/log.ts';
import { LogClient, LogClientStorage } from '../../../../../net/log-client.ts';
import { SessionInfo } from '../../../app/login/index.tsx';
import { NormalizedLogEntry } from '../../../../../logging/entry.ts';
import { kSyncConfigClient } from '../../../../../net/base-client.ts';
import { ConsoleLogStream } from '../../../../../logging/stream.ts';

const loggerContext = React.createContext<Logger>(GlobalLogger);

interface LoggerProviderProps {
  sessionInfo?: SessionInfo;
  children: React.ReactNode;
}
export function LoggerProvider({ sessionInfo, children }: LoggerProviderProps) {
  const [logger, setLogger] = useState(GlobalLogger);
  useEffect(() => {
    if (!sessionInfo) {
      setLogger(GlobalLogger);
      return;
    }

    const storage = new LogClientIDBStorage(sessionInfo.user.id);
    const client = new LogClient(
      storage,
      'http://localhost',
      kSyncConfigClient
    );
    const clientLogger = newLogger([client, new ConsoleLogStream('DEBUG')]);
    setLogger(clientLogger);
    const unloadHandler = () => {
      client.close();
      storage.close();
    };

    addEventListener('unload', unloadHandler);
    return () => {
      removeEventListener('unload', unloadHandler);
      clientLogger.log({
        severity: 'INFO',
        event: 'SessionEnd',
      });
      client.close();
      storage.close();
    };
  }, [sessionInfo]);
  return (
    <loggerContext.Provider value={logger}>{children}</loggerContext.Provider>
  );
}

export function useLogger() {
  return useContext(loggerContext);
}

const K_DB_VERSION = 1;

interface LogStorageSchema extends DBSchema {
  logEntries: {
    key: string;
    value: NormalizedLogEntry;
  };
}

class LogClientIDBStorage implements LogClientStorage {
  private _dbPromise: Promise<IDBPDatabase<LogStorageSchema>> | undefined;
  constructor(readonly dbName: string) {
    this.getDB(); // Start open of our DB as soon as possible
  }

  private getDB(): Promise<IDBPDatabase<LogStorageSchema>> {
    if (this._dbPromise === undefined) {
      this._dbPromise = openDB<LogStorageSchema>(this.dbName, K_DB_VERSION, {
        upgrade(db) {
          db.createObjectStore('logEntries', { keyPath: 'logId' });
        },
      });
    }
    return this._dbPromise;
  }

  async close(): Promise<boolean> {
    if (undefined === this._dbPromise) {
      return false;
    }
    const db = await this._dbPromise;
    db.close();
    this._dbPromise = undefined;
    return true;
  }

  async delete(): Promise<void> {
    await this.close();
    await deleteDB(this.dbName);
  }

  async persistEntries(entries: NormalizedLogEntry[]): Promise<void> {
    const db = await this.getDB();
    const txn = db.transaction('logEntries', 'readwrite', {
      durability: 'relaxed',
    });
    const store = txn.objectStore('logEntries');
    const promises: Promise<void>[] = [];
    for (const e of entries) {
      promises.push(
        (async () => {
          try {
            await store.put(e, e.logId);
          } catch (e) {
            log({
              severity: 'ERROR',
              error: 'LoggerWriteFailed',
              message: e.message,
              trace: e.stack,
              repo: this.dbName,
              commit: e.logId,
            });
            throw e;
          }
        })()
      );
    }
    for (const p of promises) {
      await p;
    }
    await txn.done;
  }

  async *entries(): AsyncGenerator<NormalizedLogEntry> {
    const db = await this.getDB();
    const txn = db.transaction('logEntries', 'readonly', {
      durability: 'relaxed',
    });
    for await (const e of txn.store) {
      yield e.value;
    }
  }
}
