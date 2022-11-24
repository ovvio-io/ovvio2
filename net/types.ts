import { BloomFilter } from '../base/bloom.ts';
import { uniqueId } from '../base/common.ts';
import { CoreValue, Encodable, Encoder } from '../base/core-types/base.ts';
import {
  JSONCyclicalDecoder,
  JSONCyclicalEncoder,
} from '../base/core-types/encoding/json.ts';
import {
  ConstructorDecoderConfig,
  Decodable,
  DecodedValue,
  Decoder,
  ReadonlyDecodedArray,
} from '../base/core-types/encoding/types.ts';
import { isDecoderConfig } from '../base/core-types/encoding/utils.ts';
import { ReadonlyJSONObject, ReadonlyJSONValue } from '../base/interfaces.ts';
import { NormalizedLogEntry } from '../logging/entry.ts';
import { Commit } from '../repo/commit.ts';

export const K_DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type SyncValueType = Commit | NormalizedLogEntry;

export interface SyncMessageConfig<T extends SyncValueType> {
  filter: BloomFilter;
  repoSize: number;
  values?: T[];
  ttl?: number;
  protocolVersion?: number;
}

export enum SyncValueFlag {
  Object = 0,
  Commit = 1,
}

export enum ProtocolVersion {
  V3_0 = 1,
}

export class SyncMessage<T extends SyncValueType>
  implements Encodable, Decodable
{
  private _protocolVersion!: ProtocolVersion;
  private _filter!: BloomFilter;
  private _repoSize!: number;
  private _values!: T[];
  private _ttl?: number;

  constructor(config: ConstructorDecoderConfig | SyncMessageConfig<T>) {
    if (isDecoderConfig(config)) {
      this.deserialize(config.decoder);
    } else {
      this._filter = config.filter;
      this._repoSize = config.repoSize;
      this._values = config.values || [];
      if (config.ttl) {
        this._ttl = config.ttl;
      }
      this._protocolVersion =
        config.protocolVersion || SyncMessage.buildProtocolVersion;
    }
  }

  static get buildProtocolVersion(): number {
    return ProtocolVersion.V3_0;
  }

  get protocolVersion(): number {
    return this._protocolVersion;
  }

  get filter(): BloomFilter {
    return this._filter;
  }

  get repoSize(): number {
    return this._repoSize;
  }

  get values(): T[] {
    return this._values;
  }

  protected set values(v: T[]) {
    this._values = v;
  }

  get ttl(): number | undefined {
    return this._ttl;
  }

  get valueFlag(): SyncValueFlag {
    const values = this.values;
    if (values.length > 0 && values[0] instanceof Commit) {
      return SyncValueFlag.Commit;
    }
    return SyncValueFlag.Object;
  }

  serialize(
    encoder: Encoder<string, CoreValue, CoreValue, unknown>,
    _options?: unknown
  ): void {
    encoder.set('pv', this.protocolVersion);
    encoder.set('f', this.filter);
    encoder.set('s', this.repoSize);
    switch (this.valueFlag) {
      case SyncValueFlag.Commit:
        encoder.set(
          'c',
          (this.values as Commit[]).map((c) => JSONCyclicalEncoder.serialize(c))
        );
        break;

      case SyncValueFlag.Object:
        encoder.set('v', this.values);
        break;
    }
    if (this.ttl) {
      encoder.set('t', this.ttl);
    }
  }

  deserialize(
    decoder: Decoder<string, DecodedValue>,
    _options?: unknown
  ): void {
    this._protocolVersion = decoder.get<ProtocolVersion>('pv')!;
    this._filter.deserialize(decoder.getDecoder('f'));
    this._repoSize = decoder.get<number>('s')!;
    this._ttl = decoder.get('t');
    if (decoder.has('c')) {
      this._values = decoder
        .get<ReadonlyDecodedArray>('c', [])!
        .map((obj: DecodedValue) => {
          const decoder = new JSONCyclicalDecoder(obj as ReadonlyJSONObject);
          return new Commit({ decoder });
        }) as T[];
    } else {
      this._values = decoder.get('v')! as T[];
    }
  }

  /**
   * This constant determines the approximate number of sync cycles it'll take
   * for two parties to fully sync. The bloom filter's accuracy is scaled
   * dynamically to match the desired number of cycles.
   *
   * If we sync 3 times per second, 5 cycles will finish in a bit under 2 seconds.
   * This value must be matched with the sync frequency.
   */
  static build<T extends SyncValueType>(
    peerFilter: BloomFilter | undefined,
    values: Iterable<[id: string, value: T]>,
    localSize: number,
    peerSize: number,
    expectedSyncCycles: number
  ): SyncMessage<T> {
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
    const missingPeerValues: T[] = [];
    if (peerFilter) {
      for (const [id, v] of values) {
        localFilter.add(id);
        if (!peerFilter.has(id)) {
          missingPeerValues.push(v);
        }
      }
    }
    return new this({
      filter: localFilter,
      repoSize: localSize,
      values: missingPeerValues,
    });
  }
}

export function generateSessionId(userId: string): string {
  return `${userId}/${uniqueId()}`;
}
