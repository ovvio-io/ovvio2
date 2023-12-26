import {
  decodeSession,
  EncodedSession,
  generateRequestSignature,
  OwnedSession,
  Session,
  signData,
} from '../auth/session.ts';
import { JSONValue, ReadonlyJSONObject } from '../base/interfaces.ts';
import { getOvvioConfig } from '../server/config.ts';

export async function createNewSession(
  publicKey: CryptoKey,
): Promise<[Session | undefined, Session[] | undefined]> {
  try {
    const resp = await sendJSONToEndpoint('/auth/session', undefined, {
      publicKey: (await crypto.subtle.exportKey(
        'jwk',
        publicKey,
      )) as ReadonlyJSONObject,
    });
    if (resp.status !== 200) {
      return [undefined, undefined];
    }
    const body = await resp.json();
    const encodedRoots = body.roots as EncodedSession[];
    const roots: Session[] = [];
    for (const e of encodedRoots) {
      roots.push(await decodeSession(e));
    }
    return [await decodeSession(body.session), roots];
  } catch (_err: unknown) {
    debugger;
    return [undefined, undefined];
  }
}

export async function sendLoginEmail(
  session: OwnedSession,
  email: string,
): Promise<boolean> {
  try {
    const resp = await sendJSONToEndpoint('/auth/send-login-email', undefined, {
      email,
      signature: await signData(session, email),
    });
    return resp.status === 200;
  } catch (_err: unknown) {
    return false;
  }
}

export function getBaseURL(): string {
  const serverURL = getOvvioConfig().serverURL;
  return serverURL || `${location.protocol}//${location.host}`;
}

function urlForEndpoint(endpoint: string): string {
  if (endpoint[0] === '/') {
    endpoint = endpoint.substring(1);
  }
  return `${getBaseURL()}/${endpoint}`;
}

export function sendJSONToEndpoint(
  endpoint: string,
  session: OwnedSession | undefined,
  json: ReadonlyJSONObject,
): Promise<Response> {
  return sendJSONToURL(urlForEndpoint(endpoint), session, json);
}

export async function sendJSONToURL(
  url: string,
  session: OwnedSession | undefined,
  json: JSONValue,
  orgId?: string,
): Promise<Response> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (session !== undefined) {
    headers['x-ovvio-sig'] = await generateRequestSignature(session);
  }
  if (orgId) {
    headers['x-org-id'] = orgId;
  }
  return await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(json),
  });
}
