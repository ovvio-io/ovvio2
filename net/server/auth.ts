import { decodeBase64Url, encodeBase64Url } from 'std/encoding/base64url.ts';
import {
  EncodedSession,
  OwnedSession,
  SESSION_CRYPTO_KEY_GEN_PARAMS,
  Session,
  encodeSession,
  encodedSessionFromRecord,
  sessionFromRecord,
  sessionToRecord,
  signBuffer,
  signerIdFromSignature,
  verifyBuffer,
} from '../../auth/session.ts';
import { uniqueId } from '../../base/common.ts';
import { deserializeDate, kDayMs } from '../../base/date.ts';
import { assert } from '../../base/error.ts';
import { JSONObject } from '../../base/interfaces.ts';
import { stableStringify } from '../../base/json.ts';
import { Record } from '../../cfds/base/record.ts';
import { HTTPMethod } from '../../logging/metrics.ts';
import { Endpoint, ServerServices } from './server.ts';
import { getBaseURL, getRequestPath, getServerBaseURL } from './utils.ts';
import { ResetPasswordEmail } from '../../emails/reset-password.tsx';
import { Scheme } from '../../cfds/base/scheme.ts';
import { normalizeEmail } from '../../base/string.ts';

export const kAuthEndpointPaths = [
  '/auth/session',
  '/auth/send-login-email',
  '/auth/temp-login',
] as const;
export type AuthEndpointPath = (typeof kAuthEndpointPaths)[number];

export type GenericAuthError = 'AccessDenied';
export type CreateSessionError = 'MissingPublicKey' | 'InvalidPublicKey';
export type LoginError = 'MissingEmail' | 'MissingSignature';

export type AuthError = GenericAuthError | CreateSessionError | LoginError;

export interface TemporaryLoginToken extends JSONObject {
  u: string; // User key
  s: string; // Session ID
  ts: number; // Creation timestamp
  sl: string; // A random salt to ensure uniqueness
}

export interface SignedTemporaryLoginToken extends JSONObject {
  t: TemporaryLoginToken; // The token itself
  s: string; // Signature
}

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

      case '/auth/send-login-email':
        return method === 'POST';

      case '/auth/temp-login':
        return method === 'GET';
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
        break;

      case '/auth/send-login-email':
        return this.sendTemporaryLoginEmail(services, req);

      case '/auth/temp-login':
        return this.loginWithToken(services, req);
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

  private async sendTemporaryLoginEmail(
    services: ServerServices,
    req: Request
  ): Promise<Response> {
    const smtp = services.email;
    const body = await req.json();
    const email = normalizeEmail(body.email);
    if (typeof email !== 'string') {
      return responseForError('MissingEmail');
    }

    const sig = body.signature;
    if (typeof sig !== 'string') {
      return responseForError('MissingSignature');
    }

    const requestingSessionId = signerIdFromSignature(sig);
    if (!requestingSessionId) {
      return responseForError('AccessDenied');
    }

    const requestingSession = fetchSessionById(services, requestingSessionId);
    if (!requestingSession) {
      return responseForError('AccessDenied');
    }

    // Make sure a session doesn't try to change its owner
    if (requestingSession.get('owner') !== undefined) {
      return responseForError('AccessDenied');
    }

    // Verify it's actually this session who generated the request
    if (!verifyBuffer(await sessionFromRecord(requestingSession), sig, email)) {
      return responseForError('AccessDenied');
    }

    const [userKey, userRecord] = fetchUserByEmail(services, email);

    // TODO (ofri): Rate limit this call

    // We unconditionally generate the signed token so this call isn't
    // vulnerable to timing attacks.
    const signedToken = await signToken(services.settings.session, {
      u: userKey || '',
      s: requestingSessionId,
      ts: Date.now(),
      sl: uniqueId(),
    });
    const clickURL = `${getBaseURL(
      services
    )}/auth/temp-login?t=${encodeBase64Url(JSON.stringify(signedToken))}`;
    // Only send the mail if a user really exists. We send the email
    // asynchronously both for speed and to avoid timing attacks.
    if (userRecord !== undefined) {
      smtp.send({
        to: email,
        subject: 'Login to Ovvio',
        plaintext: `Click on this link to login to Ovvio: ${clickURL}`,
        html: ResetPasswordEmail({
          clickURL,
          baseUrl: getBaseURL(services),
          username: userRecord.get('name') || 'Anonymous',
          orgname: services.organizationId,
        }),
      });
    }
    return new Response('OK', { status: 200 });
  }

  private async loginWithToken(
    services: ServerServices,
    req: Request
  ): Promise<Response> {
    const encodedToken = new URL(req.url).searchParams.get('t');
    if (!encodedToken) {
      return responseForError('AccessDenied');
    }
    try {
      const decoder = new TextDecoder();
      const token: SignedTemporaryLoginToken = JSON.parse(
        decoder.decode(decodeBase64Url(encodedToken))
      );
      const signerId = signerIdFromSignature(token.s);
      if (!signerId) {
        return responseForError('AccessDenied');
      }
      const signerRecord = fetchSessionById(services, signerId);
      if (!signerRecord) {
        return responseForError('AccessDenied');
      }
      const signerSession = await sessionFromRecord(signerRecord);
      if (!verifyToken(signerSession, token)) {
        return responseForError('AccessDenied');
      }
      const userKey = token.t.u;
      const repo = services.sync.getSysDir();
      const userRecord = repo.valueForKey(userKey);
      if (!userRecord || userRecord.isNull) {
        return responseForError('AccessDenied');
      }
      const sessionRecord = fetchSessionById(services, token.t.s);
      if (!sessionRecord) {
        return responseForError('AccessDenied');
      }
      if (sessionRecord.get('owner') !== undefined) {
        return responseForError('AccessDenied');
      }
      sessionRecord.set('owner', userKey);
      repo.setValueForKey(token.t.s, sessionRecord);
      // userRecord.set('lastLoggedIn', new Date());
      // repo.setValueForKey(userKey, userRecord);
      return new Response(null, {
        status: 307,
        headers: {
          Location: getServerBaseURL(services),
        },
      });
    } catch (_: unknown) {
      return responseForError('AccessDenied');
    }
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

function fetchUserByEmail(
  services: ServerServices,
  email: string
): [key: string | undefined, record: Record | undefined] {
  const repo = services.sync.getSysDir();
  const db = repo.storage.db;
  const statement = db.prepare(
    `SELECT json, key FROM heads WHERE ns = 'users' AND json->'$.d'->>'$.email' = '${email}' LIMIT 1;`
  );
  const row = statement.get();
  if (!row || typeof row.json !== 'string' || typeof row.key !== 'string') {
    if (services.settings.operatorEmails.includes(email)) {
      // Lazily create operator records
      const record = new Record({
        scheme: Scheme.user(),
        data: {
          email,
        },
      });
      const key = uniqueId();
      repo.setValueForKey(key, record);
      return [key, record];
    } else {
      return [undefined, undefined];
    }
  }
  return [row.key, Record.fromJS(JSON.parse(row.json))];
}

function fetchSessionById(
  services: ServerServices,
  sessionId: string
): Record | undefined {
  const repo = services.sync.getSysDir();
  const db = repo.storage.db;
  const statement = db.prepare(
    `SELECT json FROM heads WHERE ns = 'sessions' AND json->'$.d'->>'$.id' = '${sessionId}' LIMIT 1;`
  );
  const row = statement.get();
  if (!row || typeof row.json !== 'string') {
    return undefined;
  }
  return Record.fromJS(JSON.parse(row.json));
}

function responseForError(err: AuthError): Response {
  let status = 400;
  if (err === 'AccessDenied') {
    status = 403;
  }
  return new Response(JSON.stringify({ error: err }), {
    status,
  });
}

async function signToken(
  session: OwnedSession,
  token: TemporaryLoginToken
): Promise<SignedTemporaryLoginToken> {
  return {
    t: token,
    s: await signBuffer(session, stableStringify(token)),
  };
}

async function verifyToken(
  session: Session,
  token: SignedTemporaryLoginToken
): Promise<boolean> {
  return await verifyBuffer(session, token.s, stableStringify(token.t));
}
