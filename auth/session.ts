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

export const SESSION_CRYPTO_KEY_USAGES: KeyUsage[] = ['sign', 'verify'];

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

export interface EncodedSession extends CoreObject {
  id: string;
  publicKey: string;
  owner?: string;
  expiration: Date;
}

export interface OwnedSession extends Session {
  privateKey: CryptoKey;
}

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    SESSION_CRYPTO_KEY_GEN_PARAMS,
    true,
    SESSION_CRYPTO_KEY_USAGES
  );
}

export async function generateSession(
  owner: string | undefined,
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

export async function encodeSession(session: Session): Promise<EncodedSession> {
  const publicKey = (await crypto.subtle.exportKey(
    'jwk',
    session.publicKey
  )) as ReadonlyJSONObject;

  const res: EncodedSession = {
    ...session,
    publicKey: JSON.stringify(publicKey),
  };
  return res;
}

export async function decodeSession(
  session: EncodedSession
): Promise<Session | OwnedSession> {
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    JSON.parse(session.publicKey),
    SESSION_CRYPTO_KEY_GEN_PARAMS,
    true,
    SESSION_CRYPTO_KEY_USAGES
  );
  return {
    ...session,
    publicKey,
  };
}
