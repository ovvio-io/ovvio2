import {
  EncodedSession,
  OwnedSession,
  SESSION_CRYPTO_KEY_GEN_PARAMS,
  Session,
  encodeSession,
  encodedSessionFromRecord,
  sessionFromRecord,
  sessionToRecord,
} from '../../auth/session.ts';
import { uniqueId } from '../../base/common.ts';
import { deserializeDate, kDayMs, kHourMs } from '../../base/date.ts';
import { assert } from '../../base/error.ts';
import { Record } from '../../cfds/base/record.ts';
import { HTTPMethod } from '../../logging/metrics.ts';
import { SQLiteRepoStorage } from '../../server/sqlite3-repo-storage.ts';
import { Endpoint, Server, ServerServices } from './server.ts';
import { getRequestPath } from './utils.ts';

export const kAuthEndpointPaths = ['/auth/session'] as const;
export type AuthEndpointPath = (typeof kAuthEndpointPaths)[number];

export type CreateSessionError = 'MissingPublicKey' | 'InvalidPublicKey';

export type AuthError = CreateSessionError;

export class AuthEndpoint implements Endpoint {
  filter(
    services: ServerServices,
    req: Request,
    info: Deno.ServeHandlerInfo
  ): boolean {
    const path = getRequestPath<AuthEndpointPath>(req);
    if (!kAuthEndpointPaths.includes(path)) {
      return false;
    }
    const method = req.method as HTTPMethod;
    switch (path) {
      case '/auth/session':
        return method === 'POST' || method === 'PATCH';
    }
  }

  async processRequest(
    services: ServerServices,
    req: Request,
    info: Deno.ServeHandlerInfo
  ): Promise<Response> {
    const path = getRequestPath<AuthEndpointPath>(req);
    const method = req.method as HTTPMethod;
    switch (path) {
      case '/auth/session':
        if (method === 'POST') {
          return this.createNewSession(services, req);
        }
    }

    return new Response('Unknown request', {
      status: 400,
    });
  }

  private async createNewSession(
    services: ServerServices,
    req: Request
  ): Promise<Response> {
    let publicKey: CryptoKey | undefined;
    try {
      const body = await req.json();
      const jwk = body.publicKey;
      if (typeof jwk !== 'object') {
        return responseForError('MissingPublicKey');
      }
      publicKey = await crypto.subtle.importKey(
        'jwk',
        jwk,
        SESSION_CRYPTO_KEY_GEN_PARAMS,
        true,
        ['verify']
      );
    } catch (e: any) {
      return responseForError('InvalidPublicKey');
    }
    if (!publicKey) {
      return responseForError('MissingPublicKey');
    }
    const sessionId = uniqueId();
    const session: Session = {
      publicKey,
      id: sessionId,
      expiration: deserializeDate(Date.now() + 30 * kDayMs),
    };
    // All sessions are root sessions until setup is complete
    if (!services.settings.setupCompleted) {
      session.owner = 'root';
    }
    await persistSession(services, session);
    const encodedSession = await encodeSession(session);
    const resp = new Response(
      JSON.stringify({
        session: encodedSession,
        roots: fetchEncodedRootSessions(services),
      })
    );
    resp.headers.set('Content-Type', 'application/json');
    return resp;
  }
}

export async function persistSession(
  services: ServerServices,
  session: Session | OwnedSession
): Promise<void> {
  const repo = services.sync.getRepository('sys', 'dir');
  const record = await sessionToRecord(session);
  repo.setValueForKey(session.id, record);
}

function fetchEncodedRootSessions(services: ServerServices): EncodedSession[] {
  const repo = services.sync.getRepository('sys', 'dir');
  const db = repo.storage.db;
  const statement = db.prepare(
    `SELECT json FROM heads WHERE ns = 'sessions' AND json->'$.d'->>'$.owner' = 'root';`
  );
  const encodedRecord = statement.all();
  const result: EncodedSession[] = [];
  for (const r of encodedRecord) {
    const record = Record.fromJS(JSON.parse(r.json));
    if (record.get<Date>('expiration').getTime() - Date.now() <= 0) {
      continue;
    }
    assert(record.get('owner') === 'root');
    result.push(encodedSessionFromRecord(record));
  }
  return result;
}

function responseForError(err: AuthError): Response {
  return new Response(JSON.stringify({ error: err }), {
    status: 400,
  });
}
