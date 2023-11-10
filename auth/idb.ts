import { openDB, DBSchema, OpenDBCallbacks } from 'https://esm.sh/idb@7.1.1';
import { OwnedSession, Session } from './session.ts';
import { SerialScheduler } from '../base/serial-scheduler.ts';

const K_DB_VERSION = 1;
const K_DB_NAME = 'sessions';

export interface SessionData {
  currentSession: OwnedSession;
  roots: Session[];
  trustedSessions: Session[];
}

interface SessionDBSchema extends DBSchema {
  session: {
    key: string;
    value: SessionData;
  };
}

const kOpenDBOpts: OpenDBCallbacks<SessionDBSchema> = {
  upgrade(db, oldVersion, newVersion, txn, event) {
    db.createObjectStore('session', { keyPath: 'currentSession.id' });
  },
};

export function loadAllSessions(): Promise<SessionData[]> {
  return SerialScheduler.get('idb').run(async () => {
    const db = await openDB(K_DB_NAME, K_DB_VERSION, kOpenDBOpts);
    const res = await db.getAll('session');
    db.close();
    return res;
  });
}

export function storeSessionData(
  session: OwnedSession,
  roots: Session[],
  trustedSessions: Session[]
): Promise<void> {
  return SerialScheduler.get('idb').run(async () => {
    const db = await openDB(K_DB_NAME, K_DB_VERSION, kOpenDBOpts);
    await db.put('session', {
      currentSession: session,
      roots,
      trustedSessions,
    });
    db.close();
  });
}
