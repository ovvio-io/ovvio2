import {
  encode as b64Encode,
  decode as b64Decode,
} from 'std/encoding/base64.ts';
import { JSONCyclicalEncoder } from '../base/core-types/encoding/json.ts';
import { deserializeDate, kDayMs, serializeDate } from '../base/date.ts';
import { JSONObject, ReadonlyJSONObject } from '../base/interfaces.ts';
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

export interface EncodedSession extends JSONObject {
  id: string;
  publicKey: ReadonlyJSONObject;
  owner?: string;
  expiration: number;
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
  const expiration = deserializeDate(Date.now() + ttlMs);
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
    parents: commit.parents,
    signature: `${session.id}/${b64Encode(sig)}`,
  });
}

function parseSignature(
  sig: string | undefined
): [sessionId: string | undefined, encodedSig: string | undefined] {
  if (!sig) {
    return [undefined, undefined];
  }
  const sepIdx = sig.indexOf('/');
  if (sepIdx <= 0 || sepIdx > sig.length - 1) {
    return [undefined, undefined];
  }
  return [sig.substring(0, sepIdx), sig.substring(sepIdx + 1)];
}

export async function verify(
  expectedSigner: Session,
  commit: Commit
): Promise<boolean> {
  const [sessionId, sig] = parseSignature(commit.signature);
  if (
    sessionId === undefined ||
    sig === undefined ||
    sessionId !== expectedSigner.id
  ) {
    return false;
  }
  if (expectedSigner.expiration.getTime() - Date.now() <= 0) {
    return false;
  }
  return await crypto.subtle.verify(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-384' },
    },
    expectedSigner.publicKey,
    b64Decode(sig),
    serializeCommitForSigning(commit)
  );
}

export function signerIdForCommit(commit: Commit): string | undefined {
  const sig = commit.signature;
  if (sig === undefined) {
    return undefined;
  }
  const sepIdx = sig.indexOf('/');
  if (sepIdx <= 0) {
    return undefined;
  }
  return sig.substring(0, sepIdx);
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
      expiration: serializeDate(session.expiration),
    };
  }
  return {
    ...session,
    publicKey,
    expiration: serializeDate(session.expiration),
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
      expiration: deserializeDate(session.expiration),
    };
  }
  return {
    ...session,
    publicKey,
    expiration: deserializeDate(session.expiration),
  };
}

export async function sessionToRecord(session: Session): Promise<Record> {
  const encodedSession = await encodeSession(session);
  return encodedSessionToRecord(encodedSession);
}

export async function sessionFromRecord(record: Record): Promise<Session> {
  return await decodeSession(encodedSessionFromRecord(record));
}

export function encodedSessionToRecord(encodedSession: EncodedSession): Record {
  const data = {
    ...encodedSession,
    publicKey: JSON.stringify(encodedSession.publicKey),
    expiration: deserializeDate(encodedSession.expiration),
  };
  // Private keys don't exist in the Session scheme, but just to be extra
  // cautious, we delete the field here as well.
  delete (data as any).privateKey;
  return new Record({
    scheme: Scheme.session(),
    data,
  });
}

export function encodedSessionFromRecord(record: Record): EncodedSession {
  const data = record.cloneData(['id', 'owner', 'publicKey', 'expiration']);
  data.publicKey = JSON.parse(data.publicKey);
  data.expiration = serializeDate(data.expiration);
  return data;
}

/**
 * The trust pool manages a set of trusted sessions that we can securely
 * respect as signers of commits.
 */
export class TrustPool {
  readonly currentSession: OwnedSession;
  readonly roots: Session[];
  private readonly _sessions: Map<string, Session>;

  constructor(
    currentSession: OwnedSession,
    roots?: Session[],
    trustedSessions?: Session[]
  ) {
    this.currentSession = currentSession;
    this.roots = roots || [];
    const sessions = new Map<string, Session>();
    this._sessions = sessions;

    if (trustedSessions) {
      trustedSessions.forEach((s) => sessions.set(s.id, s));
    }

    for (const s of this.roots) {
      sessions.set(s.id, s);
    }
    sessions.set(currentSession.id, currentSession);
  }

  get trustedSessions(): Session[] {
    return Array.from(this._sessions.values());
  }

  /**
   * Commits containing sessions follow stricter verification rules than all
   * other commits. Session commits MUST be signed by a root (server) session
   * or else we can't trust them.
   *
   * @param commit The commit to verify.
   */
  private async verifySession(commit: Commit): Promise<boolean> {
    if (!commit.signature) {
      return false;
    }
    const signerId = signerIdForCommit(commit);
    if (
      this.currentSession.owner === 'root' &&
      signerId === this.currentSession.id
    ) {
      return await verify(this.currentSession, commit);
    }
    for (const rootSession of this.roots) {
      if (signerId === rootSession.id) {
        return await verify(rootSession, commit);
      }
    }
    return false;
  }

  /**
   * When a commit containing a session is discovered, use this method to add
   * it to the trust pool. This method does the necessary checks to ensure the
   * integrity of this commit, then if all checks pass it adds the session to
   * the trust pool.
   *
   * @param s
   * @param commit
   * @returns
   */
  async addSession(s: Session, commit: Commit): Promise<boolean> {
    let updated = false;
    if (await this.verifySession(commit)) {
      const newExpiration = s.expiration.getTime();
      const existingSession = this._sessions.get(s.id);
      if (
        !existingSession ||
        existingSession.expiration.getTime() < newExpiration
      ) {
        this._sessions.set(s.id, s);
        updated = true;
      }
      if (s.owner === 'root') {
        const roots = this.roots;
        let updated = false;
        for (let i = 0; i < roots.length; ++i) {
          if (
            roots[i].id === s.id &&
            roots[i].expiration.getTime() < newExpiration
          ) {
            roots[i] = s;
            updated = true;
            break;
          }
        }
        if (!updated) {
          roots.push(s);
        }
      }
    }
    return updated;
  }

  getSession(id: string): Session | undefined {
    return this._sessions.get(id);
  }

  async verify(commit: Commit): Promise<boolean> {
    const signerId = signerIdForCommit(commit);
    if (!signerId) {
      return false;
    }
    const session = this.getSession(signerId);
    if (!session) {
      return false;
    }
    return await verify(session, commit);
  }
}
