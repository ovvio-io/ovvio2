import { BloomFilter } from '../base/bloom.ts';
import { uniqueId } from '../base/common.ts';
import { CoreValue, Encodable, Encoder } from '../base/core-types/base.ts';
import {
  JSONCyclicalDecoder,
  JSONCyclicalEncoder,
} from '../base/core-types/encoding/json.ts';
import {
  DecodedValue,
  ReadonlyDecodedArray,
} from '../base/core-types/encoding/types.ts';
import { ReadonlyJSONObject, ReadonlyJSONValue } from '../base/interfaces.ts';
import { Commit } from '../cfds/base/commit.ts';

export class SyncMessage<ValueType extends CoreValue> implements Encodable {
  readonly filter: BloomFilter;
  readonly repoSize: number;
  readonly values: ValueType[];

  constructor(filter: BloomFilter, repoSize: number, values?: ValueType[]) {
    this.filter = filter;
    this.repoSize = repoSize;
    this.values = values || [];
  }

  toJS(): ReadonlyJSONValue {
    return JSONCyclicalEncoder.serialize(this);
  }

  serialize(
    encoder: Encoder<string, CoreValue, CoreValue, unknown>,
    options?: unknown
  ): void {
    encoder.set('f', this.filter);
    encoder.set('s', this.repoSize);
    this.serializeValues(encoder, options);
  }

  protected serializeValues(
    encoder: Encoder<string, CoreValue, CoreValue, unknown>,
    _options?: unknown
  ): void {
    encoder.set('v', this.values);
  }

  static fromJS<ValueType extends CoreValue>(
    obj: ReadonlyJSONValue
  ): SyncMessage<ValueType> {
    const decoder = new JSONCyclicalDecoder(obj as ReadonlyJSONObject);
    const filter = new BloomFilter({ decoder: decoder.getDecoder('f') });
    return new this(
      filter,
      decoder.get<number>('s', 0)!,
      decoder.get('v', []) as ValueType[]
    );
  }

  /**
   * This constant determines the approximate number of sync cycles it'll take
   * for two parties to fully sync. The bloom filter's accuracy is scaled
   * dynamically to match the desired number of cycles.
   *
   * If we sync 3 times per second, 5 cycles will finish in a bit under 2 seconds.
   * This value must be matched with the sync frequency.
   */
  static build<ValueType extends CoreValue>(
    peerFilter: BloomFilter | undefined,
    values: Iterable<[id: string, value: ValueType]>,
    localSize: number,
    peerSize: number,
    expectedSyncCycles: number
  ): SyncMessage<ValueType> {
    const size = Math.max(1, Math.max(localSize, peerSize));
    // The expected number of sync cycles is log base (1/fpr) over number of
    // commits. Thus we can work out the FPR based on the desired sync cycles:
    //
    // Log[fpr](numberOfCommits) = expectedSyncCycles      =>
    // fpr = expectedSyncCycles'th root of numberOfCommits =>
    // fpr = numberOfCommits ^ (1 / expectedSyncCycles)
    //
    // Finally, a bloom filter with FPR greater than 0.5 isn't very useful
    // (more than 50% false positives), so we cap the computed value at 0.5.
    const fpr = Math.min(0.5, Math.pow(size, 1 / expectedSyncCycles));
    const localFilter = new BloomFilter({
      size,
      fpr,
    });
    const missingPeerValues: ValueType[] = [];
    if (peerFilter) {
      for (const [id, v] of values) {
        localFilter.add(id);
        if (!peerFilter.has(id)) {
          missingPeerValues.push(v);
        }
      }
    }
    return new this(localFilter, localSize, missingPeerValues);
  }
}

export class CommitsSyncMessage extends SyncMessage<Commit> {
  protected serializeValues(
    encoder: Encoder<string, CoreValue, CoreValue, unknown>,
    _options?: unknown
  ): void {
    encoder.set(
      'c',
      this.values.map((c) => JSONCyclicalEncoder.serialize(c))
    );
  }
}

export function generateSessionId(userId: string): string {
  return `${userId}/${uniqueId()}`;
}

export function syncMessageFromJs<ValueType extends CoreValue>(
  obj: ReadonlyJSONObject
): SyncMessage<ValueType> {
  const decoder = new JSONCyclicalDecoder(obj as ReadonlyJSONObject);
  const filter = new BloomFilter({ decoder: decoder.getDecoder('f') });
  return new SyncMessage(
    filter,
    decoder.get<number>('s', 0)!,
    decoder.get('v', []) as ValueType[]
  );
}

export function commitsSyncMessagefromJS(
  obj: ReadonlyJSONValue
): SyncMessage<Commit> {
  const decoder = new JSONCyclicalDecoder(obj as ReadonlyJSONObject);
  const filter = new BloomFilter({ decoder: decoder.getDecoder('f') });
  const commits = decoder
    .get<ReadonlyDecodedArray>('c', [])!
    .map((obj: DecodedValue) => {
      const decoder = new JSONCyclicalDecoder(obj as ReadonlyJSONObject);
      return new Commit({ decoder });
    });
  return new CommitsSyncMessage(filter, decoder.get<number>('s', 0)!, commits);
}
