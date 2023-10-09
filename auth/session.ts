import {
  encode as b64Encode,
  decode as b64Decode,
} from 'std/encoding/base64.ts';
import { JSONCyclicalEncoder } from '../base/core-types/encoding/json.ts';
import { kDayMs } from '../base/date.ts';
import { ReadonlyJSONObject } from '../base/interfaces.ts';
import { stableStringify } from '../base/json.ts';
import { Commit } from '../repo/commit.ts';

export interface Session {
  publicKey: CryptoKey;
  owner: string;
  expiration: Date;
}

export interface OwnedSession extends Session {
  privateKey: CryptoKey;
}

export async function generateSession(owner: string): Promise<OwnedSession> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-521',
    },
    true,
    ['sign', 'verify']
  );
  const expiration = new Date();
  expiration.setTime(expiration.getTime() + 30 * kDayMs);
  return {
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
      hash: { name: 'SHA-512' },
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
    signature: b64Encode(sig),
  });
}

export async function verify(
  expectedSigner: Session,
  commit: Commit
): Promise<boolean> {
  const sig = commit.signature;
  if (!sig) {
    return false;
  }
  return await crypto.subtle.verify(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-512' },
    },
    expectedSigner.publicKey,
    b64Decode(sig),
    serializeCommitForSigning(commit)
  );
}
