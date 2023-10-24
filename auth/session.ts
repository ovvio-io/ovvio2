import {
  encode as b64Encode,
  decode as b64Decode,
} from 'std/encoding/base64.ts';
import { JSONCyclicalEncoder } from '../base/core-types/encoding/json.ts';
import { kDayMs } from '../base/date.ts';
import { ReadonlyJSONObject } from '../base/interfaces.ts';
import { stableStringify } from '../base/json.ts';
import { Commit } from '../repo/commit.ts';
import { uniqueId } from '../base/common.ts';
import { CoreObject } from '../base/core-types/index.ts';
import { Record } from '../cfds/base/record.ts';
import { Scheme } from '../cfds/base/scheme.ts';

export const SESSION_CRYPTO_KEY_GEN_PARAMS: EcKeyGenParams = {
  name: 'ECDSA',
  namedCurve: 'P-384',
};

export interface Session {
  id: string;
  publicKey: CryptoKey;
  owner?: string;
  expiration: Date;
}

export interface OwnedSession extends Session {
  privateKey: CryptoKey;
}

export interface EncodedSession extends CoreObject {
  id: string;
  publicKey: ReadonlyJSONObject;
  owner?: string;
  expiration: Date;
}

export interface EncodedOwnedSession extends EncodedSession {
  privateKey: ReadonlyJSONObject;
}

export function isOwnedSession(session: Session): session is OwnedSession {
  return (session as OwnedSession).privateKey !== undefined;
}

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(SESSION_CRYPTO_KEY_GEN_PARAMS, true, [
    'sign',
    'verify',
  ]);
}

export async function generateSession(
  owner?: string,
  ttlMs = 30 * kDayMs
): Promise<OwnedSession> {
  const keyPair = await generateKeyPair();
  const expiration = new Date();
  expiration.setTime(expiration.getTime() + ttlMs);
  return {
    id: uniqueId(),
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
    owner,
    expiration,
  };
}

function serializeCommitForSigning(commit: Commit): Uint8Array {
  const encoder = new JSONCyclicalEncoder();
  commit.serialize(encoder, { signed: false });
  const str = stableStringify(encoder.getOutput() as ReadonlyJSONObject);
  return new TextEncoder().encode(str);
}

export async function sign(
  session: OwnedSession,
  commit: Commit
): Promise<Commit> {
  const sig = await crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-384' },
    },
    session.privateKey,
    serializeCommitForSigning(commit)
  );
  return new Commit({
    id: commit.id,
    session: commit.session,
    key: commit.key,
    contents: commit.contents,
    timestamp: commit.timestamp,
    signature: `${session.id}/${b64Encode(sig)}`,
  });
}

function parseSignature(
  sig: string | undefined
): [sessionId: string, encodedSig: string] | undefined {
  if (!sig) {
    return undefined;
  }
  const comps = sig.split('/');
  if (comps.length !== 2) {
    return undefined;
  }
  return comps as [string, string];
}

export async function verify(
  expectedSigner: Session,
  commit: Commit
): Promise<boolean> {
  const comps = parseSignature(commit.signature);
  if (!comps) {
    return false;
  }
  if (comps[0] !== expectedSigner.id) {
    return false;
  }
  return await crypto.subtle.verify(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-384' },
    },
    expectedSigner.publicKey,
    b64Decode(comps[1]),
    serializeCommitForSigning(commit)
  );
}

export function signerIdFromCommit(commit: Commit): string | undefined {
  const comps = parseSignature(commit.signature);
  return comps && comps[0];
}

export async function encodeSession(
  session: OwnedSession
): Promise<EncodedOwnedSession>;

export async function encodeSession(session: Session): Promise<EncodedSession>;

export async function encodeSession(
  session: Session | OwnedSession
): Promise<EncodedSession | EncodedOwnedSession> {
  const publicKey = (await crypto.subtle.exportKey(
    'jwk',
    session.publicKey
  )) as ReadonlyJSONObject;

  if (isOwnedSession(session)) {
    return {
      ...session,
      publicKey,
      privateKey: (await crypto.subtle.exportKey(
        'jwk',
        session.privateKey
      )) as ReadonlyJSONObject,
    };
  }
  return {
    ...session,
    publicKey,
  };
}

export async function decodeSession(
  session: EncodedSession | EncodedOwnedSession
): Promise<Session | OwnedSession> {
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    session.publicKey as JsonWebKey,
    SESSION_CRYPTO_KEY_GEN_PARAMS,
    true,
    ['verify']
  );
  if (session.privateKey) {
    const privateKey = await crypto.subtle.importKey(
      'jwk',
      session.privateKey as JsonWebKey,
      SESSION_CRYPTO_KEY_GEN_PARAMS,
      true,
      ['sign']
    );
    return {
      ...session,
      publicKey,
      privateKey,
    };
  }
  return {
    ...session,
    publicKey,
  };
}

export async function sessionToRecord(session: Session): Promise<Record> {
  const encodedSession = await encodeSession(session);
  // Private keys don't exist in the Session scheme, but just to be extra
  // cautious, we delete the field here as well.
  delete encodedSession.privateKey;
  return new Record({
    scheme: Scheme.session(),
    data: {
      ...encodedSession,
      publicKey: JSON.stringify(encodedSession.publicKey),
    },
  });
}
