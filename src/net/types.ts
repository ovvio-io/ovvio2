import { BloomFilter } from '../base/bloom.ts';
import { uniqueId } from '../base/common.ts';
import {
  CoreObject,
  CoreValue,
  Encodable,
  Encoder,
  ReadonlyCoreArray,
} from '../base/core-types/base.ts';
import {
  JSONCyclicalDecoder,
  JSONCyclicalEncoder,
} from '../base/core-types/encoding/json.ts';
import { ReadonlyDecodedArray } from '../base/core-types/encoding/types.ts';
import { ReadonlyJSONObject, ReadonlyJSONValue } from '../base/interfaces.ts';
import { Commit, CommitContents } from '../cfds/base/commit.ts';
import { Edit } from '../cfds/base/edit.ts';
import { Record } from '../cfds/base/record.ts';
import { Repository } from '../cfds/base/repo.ts';

export class SyncMessage implements Encodable {
  readonly filter: BloomFilter;
  readonly commits: Commit[];

  constructor(filter: BloomFilter, commits?: Commit[]) {
    this.filter = filter;
    this.commits = commits || [];
  }

  toJS(): ReadonlyJSONValue {
    const encoder = new JSONCyclicalEncoder();
    this.serialize(encoder);
    return encoder.getOutput();
  }

  serialize(
    encoder: Encoder<string, CoreValue, CoreValue, unknown>,
    _options?: unknown
  ): void {
    encoder.set('f', this.filter);
    encoder.set('c', this.commits);
  }

  static fromJS(obj: ReadonlyJSONValue): SyncMessage {
    const decoder = new JSONCyclicalDecoder(obj as ReadonlyJSONObject);
    const filter = new BloomFilter({ decoder: decoder.getDecoder('f') });
    const commits = decoder
      .get<ReadonlyDecodedArray>('c', [])!
      .map((obj: any) => {
        let contents: CommitContents;
        if (obj.contents.record !== undefined) {
          contents = { record: new Record({ decoder: obj.contents.record }) };
        } else {
          contents = {
            base: obj.contents.base,
            edit: new Edit({ decoder: obj.contents.edit }),
          };
        }
        return {
          ...obj,
          contents,
        } as Commit;
      });
    return new this(filter, commits);
  }

  static build(
    peerFilter: BloomFilter | undefined,
    localRepo: Repository
  ): SyncMessage {
    const localFilter = new BloomFilter({
      size: Math.max(localRepo.numberOfCommits, 1),
      fpr: 0.5,
    });
    const missingPeerCommits: Commit[] = [];
    if (peerFilter) {
      for (const commit of localRepo.commits()) {
        localFilter.add(commit.id);
        if (!peerFilter.has(commit.id)) {
          missingPeerCommits.push(commit);
        }
      }
    }
    return new this(localFilter, missingPeerCommits);
  }
}

export function generateSessionId(userId: string): string {
  return `${userId}/${uniqueId()}`;
}
