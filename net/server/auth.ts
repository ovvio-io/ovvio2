import {
  OwnedSession,
  SESSION_CRYPTO_KEY_GEN_PARAMS,
  SESSION_CRYPTO_KEY_USAGES,
  Session,
  encodeSession,
} from '../../auth/session.ts';
import { uniqueId } from '../../base/common.ts';
import { kDayMs } from '../../base/date.ts';
import { Record } from '../../cfds/base/record.ts';
import { Scheme } from '../../cfds/base/scheme.ts';
import { HTTPMethod } from '../../logging/metrics.ts';
import { Endpoint, Server } from './server.ts';
import { getRequestPath } from './utils.ts';

export const kAuthEndpointPaths = ['/auth/session'] as const;
export type AuthEndpointPath = (typeof kAuthEndpointPaths)[number];

export type CreateSessionError = 'MissingPublicKey' | 'InvalidPublicKey';

export type AuthError = CreateSessionError;

export class AuthEndpoint implements Endpoint {
  constructor(readonly serverSessionId: string) {}

  filter(server: Server, req: Request, info: Deno.ServeHandlerInfo): boolean {
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
    server: Server,
    req: Request,
    info: Deno.ServeHandlerInfo
  ): Promise<Response> {
    const path = getRequestPath<AuthEndpointPath>(req);
    const method = req.method as HTTPMethod;
    switch (path) {
      case '/auth/session':
        if (method === 'POST') {
          return this.createNewSession(server, req);
        }
    }

    return new Response('Unknown request', {
      status: 400,
    });
  }

  private async createNewSession(
    server: Server,
    req: Request
  ): Promise<Response> {
    let publicKey: CryptoKey | undefined;
    try {
      const body = await req.json();
      const jwk = body.publicKey;
      if (typeof jwk !== 'string' || jwk.length > 0) {
        return responseForError('MissingPublicKey');
      }
      publicKey = await crypto.subtle.importKey(
        'jwk',
        JSON.parse(jwk),
        SESSION_CRYPTO_KEY_GEN_PARAMS,
        true,
        SESSION_CRYPTO_KEY_USAGES
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
      expiration: new Date(Date.now() + 30 * kDayMs),
    };
    // const session = await createNewSession(server.service('sync'), publicKey);
    await persistSession(server, session);
    return new Response(JSON.stringify({ session: encodeSession(session) }));
  }
}

export async function persistSession(
  server: Server,
  session: Session | OwnedSession
): Promise<void> {
  const repo = server.service('sync').getRepository('sys', 'dir');
  const record = new Record({
    scheme: Scheme.session(),
    data: await encodeSession(session),
  });
  repo.setValueForKey(session.id, record);
}

function responseForError(err: AuthError): Response {
  return new Response(JSON.stringify({ error: err }), {
    status: 400,
  });
}
