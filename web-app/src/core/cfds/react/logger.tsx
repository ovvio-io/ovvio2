import React, { useContext, useEffect, useState } from 'react';
import {
  DBSchema,
  deleteDB,
  IDBPDatabase,
  openDB,
} from 'https://esm.sh/idb@7.1.1/with-async-ittr';
import {
  GlobalLogger,
  log,
  Logger,
  newLogger,
  resetGlobalLoggerStreams,
  setGlobalLoggerStreams,
} from '../../../../../logging/log.ts';
// import { LogClient, LogClientStorage } from '../../../../../net/log-client.ts';
import { NormalizedLogEntry } from '../../../../../logging/entry.ts';
// import { kSyncConfigClient } from '../../../../../net/base-client.ts';
import { LogStream } from '../../../../../logging/log.ts';
import { ConsoleLogStream } from '../../../../../logging/console-stream.ts';
import { OwnedSession } from '../../../../../auth/session.ts';
import { RepoLogStream } from '../../../../../logging/repo-log-stream.ts';
import { useGraphManager } from './graph.tsx';
import { Repository } from '../../../../../repo/repo.ts';
import { kMinuteMs } from '../../../../../base/date.ts';

interface LoggerContext {
  logger: Logger;
}

const loggerContext = React.createContext<LoggerContext>({
  logger: GlobalLogger,
});

interface LoggerProviderProps {
  children: React.ReactNode;
}
export function LoggerProvider({ children }: LoggerProviderProps) {
  const [ctx, setCtx] = useState<LoggerContext>({ logger: GlobalLogger });
  const graphManager = useGraphManager();
  useEffect(() => {
    // Rather than using a different logger, we change the GlobalLogger's
    // streams to match the current user. This diverts logs from the entire
    // client stack rather than just UI stuff rendered with react.
    const streams: LogStream[] = [
      new ConsoleLogStream('DEBUG'),
      new RepoLogStream([
        graphManager.repository(Repository.id('events', graphManager.rootKey)),
        graphManager.repository(
          Repository.id('events', graphManager.rootKey + '--A'),
        ),
        graphManager.repository(
          Repository.id('events', graphManager.rootKey + '--B'),
        ),
      ]),
    ];
    // if (client) {
    //   streams.unshift(client);
    // }
    setGlobalLoggerStreams(streams);
    // const clientLogger = newLogger([client, new ConsoleLogStream('DEBUG')]);
    // setCtx({ logger: clientLogger });
    const unloadHandler = () => {
      resetGlobalLoggerStreams();
      // storage.close();
    };

    addEventListener('unload', unloadHandler);
    return () => {
      removeEventListener('unload', unloadHandler);
      // Log this session's end
      GlobalLogger.log({
        severity: 'EVENT',
        event: 'SessionEnd',
      });
      // Reset our global logger to default mode
      resetGlobalLoggerStreams();
    };
  }, [graphManager]);

  useEffect(() => {
    ctx.logger.log({
      severity: 'EVENT',
      event: 'SessionAlive',
      foreground: document.visibilityState === 'visible',
    });
    const sessionIntervalId = setInterval(() => {
      ctx.logger.log({
        severity: 'EVENT',
        event: 'SessionAlive',
        foreground: document.visibilityState === 'visible',
      });
    }, kMinuteMs);

    return () => {
      clearInterval(sessionIntervalId);
    };
  }, [ctx, graphManager]);
  return (
    <loggerContext.Provider value={ctx}>{children}</loggerContext.Provider>
  );
}

export function useLogger(): Logger {
  return useContext(loggerContext).logger;
}

const K_DB_VERSION = 1;

interface LogStorageSchema extends DBSchema {
  logEntries: {
    key: string;
    value: NormalizedLogEntry;
  };
}

// class LogClientIDBStorage implements LogClientStorage {
//   private _dbPromise: Promise<IDBPDatabase<LogStorageSchema>> | undefined;
//   constructor(readonly dbName: string) {
//     this.getDB(); // Start open of our DB as soon as possible
//   }
//
//   private getDB(): Promise<IDBPDatabase<LogStorageSchema>> {
//     if (this._dbPromise === undefined) {
//       this._dbPromise = openDB<LogStorageSchema>(this.dbName, K_DB_VERSION, {
//         upgrade(db) {
//           db.createObjectStore('logEntries', { keyPath: 'logId' });
//         },
//       });
//     }
//     return this._dbPromise;
//   }
//
//   async close(): Promise<boolean> {
//     if (undefined === this._dbPromise) {
//       return false;
//     }
//     const db = await this._dbPromise;
//     db.close();
//     this._dbPromise = undefined;
//     return true;
//   }
//
//   async delete(): Promise<void> {
//     await this.close();
//     await deleteDB(this.dbName);
//   }
//
//   async persistEntries(entries: NormalizedLogEntry[]): Promise<void> {
//     const db = await this.getDB();
//     const txn = db.transaction('logEntries', 'readwrite', {
//       durability: 'relaxed',
//     });
//     const store = txn.objectStore('logEntries');
//     const promises: Promise<void>[] = [];
//     for (const e of entries) {
//       promises.push(
//         (async () => {
//           try {
//             await store.put(e);
//           } catch (e) {
//             log({
//               severity: 'ERROR',
//               error: 'LoggerWriteFailed',
//               message: e.message,
//               trace: e.stack,
//               repo: this.dbName,
//               commit: e.logId,
//             });
//             throw e;
//           }
//         })(),
//       );
//     }
//     for (const p of promises) {
//       await p;
//     }
//     await txn.done;
//   }
//
//   async *entries(): AsyncGenerator<NormalizedLogEntry> {
//     const db = await this.getDB();
//     const txn = db.transaction('logEntries', 'readonly', {
//       durability: 'relaxed',
//     });
//     for await (const e of txn.store) {
//       yield e.value;
//     }
//   }
// }
