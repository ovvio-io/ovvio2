import { openDB, DBSchema, OpenDBCallbacks } from 'https://esm.sh/idb@7.1.1';
import { OwnedSession } from './session.ts';

const K_DB_VERSION = 1;
const K_DB_NAME = 'sessions';

interface SessionDBSchema extends DBSchema {
  session: {
    key: string;
    value: OwnedSession;
  };
}

const kOpenDBOpts: OpenDBCallbacks<SessionDBSchema> = {
  upgrade(db, oldVersion, newVersion, txn, event) {
    db.createObjectStore('session', { keyPath: 'owner' });
  },
};

export async function loadSession(
  userId: string
): Promise<OwnedSession | undefined> {
  const db = await openDB(K_DB_NAME, K_DB_VERSION, kOpenDBOpts);
  const res = await db.get('session', userId);
  db.close();
  return res;
}

export async function loadAllSessions(): Promise<OwnedSession[]> {
  const db = await openDB(K_DB_NAME, K_DB_VERSION, kOpenDBOpts);
  const res = await db.getAll('session');
  db.close();
  return res;
}

export async function storeSession(session: OwnedSession): Promise<void> {
  const db = await openDB(K_DB_NAME, K_DB_VERSION, kOpenDBOpts);
  await db.put('session', session);
  db.close();
}
