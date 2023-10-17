import {
  OwnedSession,
  SESSION_CRYPTO_KEY_GEN_PARAMS,
  Session,
  encodeSession,
  sessionToRecord,
} from '../../auth/session.ts';
import { uniqueId } from '../../base/common.ts';
import { kDayMs } from '../../base/date.ts';
import { HTTPMethod } from '../../logging/metrics.ts';
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
      expiration: new Date(Date.now() + 30 * kDayMs),
    };
    // const session = await createNewSession(server.service('sync'), publicKey);
    await persistSession(services, session);
    const encodedSession = await encodeSession(session);
    const resp = new Response(JSON.stringify({ session: encodedSession }));
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

function responseForError(err: AuthError): Response {
  return new Response(JSON.stringify({ error: err }), {
    status: 400,
  });
}
