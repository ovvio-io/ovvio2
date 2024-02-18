import {
  Encodable,
  Encoder,
  Equatable,
  ReadonlyCoreObject,
} from '../base/core-types/base.ts';
import { Record } from '../cfds/base/record.ts';
import { Edit } from '../cfds/base/edit.ts';
import {
  ConstructorDecoderConfig,
  Decodable,
  Decoder,
} from '../base/core-types/encoding/types.ts';
import { isDecoderConfig } from '../base/core-types/encoding/utils.ts';
import { uniqueId } from '../base/common.ts';
import { coreValueEquals } from '../base/core-types/equals.ts';
import { assert } from '../base/error.ts';
import { Scheme } from '../cfds/base/scheme.ts';
import { VersionNumber } from '../base/version-number.ts';
import { getOvvioConfig } from '../server/config.ts';
import { Comparable, coreValueCompare } from '../base/core-types/index.ts';
import { ReadonlyJSONObject } from '../base/interfaces.ts';
import {
  JSONCyclicalDecoder,
  JSONCyclicalEncoder,
} from '../base/core-types/encoding/json.ts';
import { HashMap } from '../base/collections/hash-map.ts';
import { coreValueHash } from '../base/core-types/encoding/hash.ts';

export type CommitResolver = (commitId: string) => Commit;

export interface RecordContents extends ReadonlyCoreObject {
  readonly record: Record;
}

export interface DeltaContents extends ReadonlyCoreObject {
  readonly base: string;
  readonly edit: Edit;
}

export type CommitContents = RecordContents | DeltaContents;

// NOTE: When adding fields to a commit, support must also be explicitly added
// in:
// 1. /auth/session.ts > signCommit()
// 2. /repo/repo.ts -> Repository.deltaCompressIfNeeded()
export interface CommitConfig {
  id?: string;
  session: string;
  key?: string | null;
  contents: Record | CommitContents;
  parents?: string | Iterable<string>;
  timestamp?: Date;
  buildVersion?: VersionNumber;
  signature?: string;
  mergeBase?: string;
  mergeLeader?: string;
  revert?: string;
  frozen?: true;
}

export interface CommitSerializeOptions {
  signed?: boolean;
}

const FROZEN_COMMITS = new Map<string, Commit>();
const SERIALIZED_COMMITS = new Map<string, ReadonlyJSONObject>();

export class Commit implements Encodable, Decodable, Equatable, Comparable {
  private _buildVersion!: VersionNumber;
  private _id!: string;
  private _session!: string;
  private _key: string | undefined;
  private _parents: string[] | undefined;
  private _timestamp!: Date;
  private _contents!: CommitContents;
  private _signature?: string;
  private _mergeBase?: string;
  private _mergeLeader?: string;
  private _revert?: string;
  private _cachedJSON?: ReadonlyJSONObject;
  private _cachedChecksum?: string;
  private _frozen: boolean = false;

  constructor(config: CommitConfig | ConstructorDecoderConfig) {
    if (isDecoderConfig(config)) {
      this.deserialize(config.decoder);
    } else {
      let { parents, contents } = config;
      if (typeof parents === 'string') {
        parents = [parents];
      } else if (!parents) {
        parents = [];
      } else {
        parents = Array.from(parents);
      }
      if (contents instanceof Record) {
        contents = {
          record: contents,
        };
      }

      this._id = config.id || uniqueId();
      this._session = config.session;
      this._key = config.key || undefined;
      this._parents = Array.from(parents);
      this._timestamp = config.timestamp || new Date();
      this._contents = commitContentsClone(contents);
      // Actively ensure nobody tries to mutate our record. Commits must be
      // immutable.
      if (commitContentsIsRecord(this._contents)) {
        this._contents.record.lock();
      }
      this._buildVersion = config.buildVersion || getOvvioConfig().version;
      this._signature = config.signature;
      this._mergeBase = config.mergeBase;
      this._mergeLeader = config.mergeLeader;
      this._revert = config.revert;
      this._frozen = config.frozen === true;
    }
  }

  get id(): string {
    return this._id;
  }

  get key(): string | null {
    return this._key || null;
  }

  get session(): string {
    return this._session;
  }

  get parents(): string[] {
    return this._parents || [];
  }

  get timestamp(): Date {
    return this._timestamp;
  }

  get contents(): CommitContents {
    return this._contents;
  }

  get contentsChecksum(): string {
    if (!this._cachedChecksum) {
      const contents = this.contents;
      this._cachedChecksum = commitContentsIsRecord(contents)
        ? contents.record.checksum
        : contents.edit.dstChecksum;
    }
    return this._cachedChecksum;
  }

  get buildVersion(): VersionNumber {
    return this._buildVersion;
  }

  get scheme(): Scheme | undefined {
    const contents = this.contents;
    if (commitContentsIsDelta(contents)) {
      return contents.edit.scheme;
    }
    return contents.record.scheme;
  }

  get signature(): string | undefined {
    return this._signature;
  }
  get mergeBase(): string | undefined {
    return this._mergeBase;
  }
  get mergeLeader(): string | undefined {
    return this._mergeLeader;
  }

  get revert(): string | undefined {
    return this._revert;
  }

  get frozen(): boolean {
    return this._frozen;
  }

  serialize(encoder: Encoder, opts?: CommitSerializeOptions): void {
    encoder.set('ver', this.buildVersion);
    encoder.set('id', this.id);
    if (this.key) {
      encoder.set('k', this.key);
    }
    encoder.set('s', this.session);
    encoder.set('ts', this.timestamp);
    const parents = this.parents;
    if (parents.length > 0) {
      encoder.set('p', parents);
    }
    const contentsEncoder = encoder.newEncoder();
    commitContentsSerialize(this.contents, contentsEncoder);
    encoder.set('c', contentsEncoder.getOutput());
    if (this._signature && opts?.signed !== false) {
      encoder.set('sig', this._signature);
    }
    if (this.mergeBase) {
      encoder.set('mb', this.mergeBase);
    }
    if (this.mergeLeader) {
      encoder.set('ml', this.mergeLeader);
    }
    if (this.revert) {
      encoder.set('revert', this.mergeLeader);
    }
  }

  toJS(): ReadonlyJSONObject {
    const id = this.id;
    let result = SERIALIZED_COMMITS.get(id);
    if (!result) {
      result = JSONCyclicalEncoder.serialize(this);
      SERIALIZED_COMMITS.set(id, result);
    }
    return result;
  }

  static fromJS(obj: ReadonlyJSONObject): Commit {
    const id = obj.id as string;
    let result = FROZEN_COMMITS.get(id);
    if (!result) {
      const decoder = new JSONCyclicalDecoder(obj);
      result = new Commit({ decoder });
      result._frozen = true;
      FROZEN_COMMITS.set(id, result);
      SERIALIZED_COMMITS.set(id, obj);
    }
    return result;
  }

  deserialize(decoder: Decoder): void {
    assert(!this.frozen);
    this._buildVersion = decoder.get<number>('ver')!;
    this._id = decoder.get<string>('id', uniqueId())!;
    this._key = decoder.get<string | null>('k', null)!;
    this._session = decoder.get<string>('s', 'unknown-' + uniqueId())!;
    this._timestamp = decoder.get<Date>('ts', new Date())!;
    this._parents = decoder.get<string[]>('p');
    this._contents = commitContentsDeserialize(decoder.getDecoder('c'));
    this._signature = decoder.get<string | undefined>('sig');
    this._mergeBase = decoder.get<string | undefined>('mb');
    this._mergeLeader = decoder.get<string | undefined>('ml');
    this._revert = decoder.get<string | undefined>('revert');
    this._cachedJSON = undefined;
    this._cachedChecksum = undefined;
  }

  isEqual(other: Commit): boolean {
    if (this.id !== other.id) {
      return false;
    }
    assert(compareCommitsByValue(this, other));
    return true;
  }

  compare(other: Commit): number {
    const dt = this.timestamp.getTime() - other.timestamp.getTime();
    if (dt !== 0) {
      return dt;
    }
    return coreValueCompare(this.key, other.key);
  }
}

export function commitContentsIsDelta(c: CommitContents): c is DeltaContents {
  return typeof c.base === 'string';
}

export function commitContentsIsRecord(c: CommitContents): c is RecordContents {
  return c.record instanceof Record;
}

export function commitContentsSerialize(
  c: CommitContents,
  encoder: Encoder,
): void {
  if (commitContentsIsRecord(c)) {
    encoder.set('r', c.record.toJS());
  } else {
    encoder.set('b', c.base);
    encoder.set('e', c.edit.toJS());
  }
}

export function commitContentsDeserialize(decoder: Decoder): CommitContents {
  if (decoder.has('r')) {
    const record = new Record({ decoder: decoder.getDecoder('r') });
    record.lock();
    return {
      record: record,
    };
  } else {
    return {
      base: decoder.get<string>('b')!,
      edit: new Edit({ decoder: decoder.getDecoder('e') }),
    };
  }
}

function compareCommitsByValue(c1: Commit, c2: Commit): boolean {
  return (
    c1.id === c2.id &&
    c1.buildVersion === c2.buildVersion &&
    c1.key === c2.key &&
    c1.session === c2.session &&
    coreValueEquals(c1.timestamp, c2.timestamp) &&
    coreValueEquals(c1.parents, c2.parents) &&
    coreValueEquals(c1.contents, c2.contents)
  );
}

function commitContentsClone(contents: CommitContents): CommitContents {
  if (commitContentsIsDelta(contents)) {
    return {
      base: contents.base,
      edit: contents.edit.clone(),
    };
  }
  const record = contents.record.clone();
  record.normalize();
  return {
    record,
  };
}
