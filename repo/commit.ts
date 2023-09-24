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

export type CommitResolver = (commitId: string) => Commit;

export interface RecordContents extends ReadonlyCoreObject {
  readonly record: Record;
}

export interface DeltaContents extends ReadonlyCoreObject {
  readonly base: string;
  readonly edit: Edit;
}

export type CommitContents = RecordContents | DeltaContents;

export interface CommitConfig {
  id?: string;
  session: string;
  key?: string | null;
  contents: Record | CommitContents;
  parents?: string | Iterable<string>;
  timestamp?: Date;
  buildVersion?: VersionNumber;
}

export class Commit implements Encodable, Decodable, Equatable {
  private _buildVersion!: VersionNumber;
  private _id!: string;
  private _session!: string;
  private _key: string | undefined;
  private _parents: string[] | undefined;
  private _timestamp!: Date;
  private _contents!: CommitContents;

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
      if (commitContentsIsRecord(this._contents)) {
        this._contents.record.lock();
      }
      this._buildVersion = config.buildVersion || getOvvioConfig().version;
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
    const contents = this.contents;
    return commitContentsIsRecord(contents)
      ? contents.record.checksum
      : contents.edit.dstChecksum;
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

  serialize(encoder: Encoder): void {
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
  }

  deserialize(decoder: Decoder): void {
    this._buildVersion = decoder.get<number>('ver')!;
    this._id = decoder.get<string>('id', uniqueId())!;
    this._key = decoder.get<string | null>('k', null)!;
    this._session = decoder.get<string>('s', 'unknown-' + uniqueId())!;
    this._timestamp = decoder.get<Date>('ts', new Date())!;
    this._parents = decoder.get<string[]>('p');
    this._contents = commitContentsDeserialize(decoder.getDecoder('c'));
  }

  isEqual(other: Commit): boolean {
    if (this.id !== other.id) {
      return false;
    }
    assert(compareCommitsByValue(this, other));
    return true;
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
  encoder: Encoder
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
    return {
      record: new Record({ decoder: decoder.getDecoder('r') }),
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
  return {
    record: contents.record.clone(),
  };
}
