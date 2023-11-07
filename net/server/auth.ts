import { encodeBase64Url } from 'std/encoding/base64url.ts';
import {
  EncodedSession,
  OwnedSession,
  SESSION_CRYPTO_KEY_GEN_PARAMS,
  Session,
  encodeSession,
  encodedSessionFromRecord,
  sessionToRecord,
} from '../../auth/session.ts';
import { uniqueId } from '../../base/common.ts';
import { deserializeDate, kDayMs } from '../../base/date.ts';
import { assert } from '../../base/error.ts';
import { JSONObject } from '../../base/interfaces.ts';
import { stableStringify } from '../../base/json.ts';
import { Record } from '../../cfds/base/record.ts';
import { HTTPMethod } from '../../logging/metrics.ts';
import { Endpoint, ServerServices } from './server.ts';
import { getBaseURL, getRequestPath } from './utils.ts';
import { ResetPasswordEmail } from '../../emails/reset-password.tsx';

export const kAuthEndpointPaths = [
  '/auth/session',
  '/auth/send-login-email',
  '/auth/temp-login',
] as const;
export type AuthEndpointPath = (typeof kAuthEndpointPaths)[number];

export type CreateSessionError = 'MissingPublicKey' | 'InvalidPublicKey';
export type LoginError = 'MissingEmail' | 'SMTPNotConfigured';

export type AuthError = CreateSessionError | LoginError;

export interface TemporaryLoginToken extends JSONObject {
  e: string; // Email address
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

  private async sendTemporaryLoginEmail(
    services: ServerServices,
    req: Request
  ): Promise<Response> {
    const smtp = services.email;
    const body = await req.json();
    const email = body.email;
    if (typeof email !== 'string') {
      return responseForError('MissingEmail');
    }

    // TODO (ofri): Rate limit this call

    // We unconditionally generate the signed token so this call isn't
    // vulnerable to timing attacks.
    const signedToken = await signToken(services.settings.session, {
      e: email,
      ts: Date.now(),
      sl: uniqueId(),
    });
    const clickURL = `${getBaseURL(
      services
    )}/auth/temp-login?t=${encodeBase64Url(JSON.stringify(signedToken))}`;
    // Only send the mail if a user really exists. We send the email
    // asynchronously both for speed and to avoid timing attacks.
    const userRecord = fetchUserByEmail(services, email);
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
): Record | undefined {
  const repo = services.sync.getSysDir();
  const db = repo.storage.db;
  const statement = db.prepare(
    `SELECT json FROM heads WHERE ns = 'users' AND json->'$.d'->>'$.email' = '${email}' LIMIT 1;`
  );
  const row = statement.get();
  if (!row || typeof row.json !== 'string') {
    return undefined;
  }
  return Record.fromJS(JSON.parse(row.json));
}

function responseForError(err: AuthError): Response {
  return new Response(JSON.stringify({ error: err }), {
    status: 400,
  });
}

async function signToken(
  session: OwnedSession,
  token: TemporaryLoginToken
): Promise<SignedTemporaryLoginToken> {
  const str = stableStringify(token);
  const buffer = new TextEncoder().encode(str);
  const sig = await crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-384' },
    },
    session.privateKey,
    buffer
  );
  return {
    t: token,
    s: `${session.id}/${encodeBase64Url(sig)}`,
  };
}
