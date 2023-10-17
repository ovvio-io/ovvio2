import { Session, decodeSession } from '../auth/session.ts';
import { ReadonlyJSONObject } from '../base/interfaces.ts';

export async function createNewSession(
  publicKey: CryptoKey
): Promise<Session | undefined> {
  try {
    const resp = await sendJSONToEndpoint('/auth/session', {
      publicKey: (await crypto.subtle.exportKey(
        'jwk',
        publicKey
      )) as ReadonlyJSONObject,
    });
    if (resp.status !== 200) {
      return undefined;
    }
    const body = await resp.json();
    return await decodeSession(body.session);
  } catch (_err: unknown) {
    debugger;
    return undefined;
  }
}

export function getBaseURL(): string {
  return `${location.protocol}//${location.host}`;
}

function urlForEndpoint(endpoint: string): string {
  if (endpoint[0] === '/') {
    endpoint = endpoint.substring(1);
  }
  return `${getBaseURL()}/${endpoint}`;
}

function sendJSONToEndpoint(
  endpoint: string,
  json: ReadonlyJSONObject
): Promise<Response> {
  return fetch(urlForEndpoint(endpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(json),
  });
}
