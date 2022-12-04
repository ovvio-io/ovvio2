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
import { ReadonlyJSONObject } from '../base/interfaces.ts';
import { VersionNumber } from '../defs.ts';
import { NormalizedLogEntry } from '../logging/entry.ts';
import { Commit } from '../repo/commit.ts';

export const K_DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * We currently run two distinct types of sync loops: one for collaborative data
 * containing Commit instances, and another for append only log entries.
 * Sync messages support both types of values.
 */
export type SyncValueType = Commit | NormalizedLogEntry;

/**
 * An initial configuration needed to instantiate a new SyncMessage instance.
 */
export interface SyncMessageConfig<T extends SyncValueType> {
  /**
   * A bloom filter holding a record of all value IDs this peer has persisted.
   */
  filter: BloomFilter;
  /**
   * The number of entries the peer which constructed this message, had at the
   * time of construction.
   */
  size: number;
  /**
   * An array of values that the other side is suspected to be missing.
   */
  values?: T[];
  /**
   * A Time To Live in milliseconds. If provided, both parties will
   * automatically drop values older than this TTL.
   */
  ttl?: number;
  /**
   * The protocol used by the sender. If not provided, will use whatever the
   * current build is.
   */
  buildVersion?: VersionNumber;
}

export enum SyncValueFlag {
  Object = 0,
  Commit = 1,
}

/**
 * The Ovvio sync protocol is stateless, peer-to-peer (fully symmetric),
 * lockless, and works on any collection of append-only unordered items.
 *
 * NOTE: In a future version we may remove the append-only restriction but for
 *       now it's not useful for our specific use case.
 *
 * The protocol works as follows:
 * 1. Peer A scans its local collection in a single pass.
 *    For every encountered entry, it records the entry's unique ID in a bloom
 *    filter. Once completed, A sends the resulting filter to peer B.
 *
 * 2. Peer B receives A's filter. It then does a similar local scan of its local
 *    collection, recording IDs in a new bloom filter exactly like step 1.
 *    For every encountered ID, B also checks if it exists in the filter just
 *    received from A. B notes any entries A does not have (no false negatives
 *    in bloom filters), and sends them to A alongside its locally computed
 *    filter.
 *
 * 3. The cycle repeats indefinitely. As long as both peers continue to
 *    randomly choose their the bloom filter's hash functions, eventually both
 *    collections will end up in sync.
 *
 * To control the work the protocol does, we take into account a few different
 * parameters:
 *
 * - The size difference between the collection of two peers (how much entries
 *   do we need to push). Typically we'll be handling one of two extremes:
 *   either the entire collection needs to be copied (server crash, user log
 *   in, etc), or just a few specific entries (realtime collaboration).
 *
 * - The desired duration it'll take for both parties to reach consistency
 *   (equal collections). This varies widely if we're a client-to-server
 *   connection or server-to-server connection.
 *
 * - The frequency in which we run the sync loop. This is dynamic in two
 *   dimensions: First is a variable desired frequency. The desired frequency
 *   changes as a function of activity. Second is the actual time it took to
 *   send the message. We measure the cycle time and take it into account in
 *   the next cycle.
 *
 * The result of all of these inputs ends as the desired accuracy for the bloom
 * filter that a peer constructs in each cycle. The more entries we need to move
 * faster, we need a higher accuracy filter. On the other hand, less entries
 * spread over more time allow us to aggressively reduce the filter's accuracy
 * and our resource consumption (network and disk).
 *
 * Finally, the protocol is aware that entries have a timestamp to them. Thus,
 * both peers may agree on a specific time frame to sync. At the time of this
 * writing the implementation allows for a TTL specification thus keeping the
 * sync size in check. In the future we may also customize the "now" date,
 * effectively providing a rolling time frame sync window.
 */
export class SyncMessage<T extends SyncValueType>
  implements Encodable, Decodable
{
  private _buildVersion!: VersionNumber;
  private _filter!: BloomFilter;
  private _size!: number;
  private _values!: T[];
  private _ttl?: number;

  constructor(config: ConstructorDecoderConfig | SyncMessageConfig<T>) {
    if (isDecoderConfig(config)) {
      this.deserialize(config.decoder);
    } else {
      this._filter = config.filter;
      this._size = config.size;
      this._values = config.values || [];
      if (config.ttl) {
        this._ttl = config.ttl;
      }
      this._buildVersion = config.buildVersion || VersionNumber.Current;
    }
  }

  get buildVersion(): number {
    return this._buildVersion;
  }

  get filter(): BloomFilter {
    return this._filter;
  }

  get size(): number {
    return this._size;
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
    encoder.set('ver', this.buildVersion);
    encoder.set('f', this.filter);
    encoder.set('s', this.size);
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
    this._buildVersion = decoder.get<VersionNumber>('ver')!;
    this._filter.deserialize(decoder.getDecoder('f'));
    this._size = decoder.get<number>('s')!;
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

  static build<T extends SyncValueType>(
    peerFilter: BloomFilter | undefined,
    values: Iterable<[id: string, value: T]>,
    localSize: number,
    peerSize: number,
    expectedSyncCycles: number,
    includeMissing = true
  ): SyncMessage<T> {
    const numberOfEntries = Math.max(1, localSize, peerSize);
    // The expected number of sync cycles is log base (1/fpr) over number of
    // entries. Thus we can work out the False-Positive-Rate based on the
    // desired sync cycles:
    //
    // Log[fpr](numberOfEntries) = expectedSyncCycles      =>
    // fpr = expectedSyncCycles'th root of numberOfEntries =>
    // fpr = numberOfEntries ^ (1 / expectedSyncCycles)
    //
    // Finally, a bloom filter with FPR greater than 0.5 isn't very useful
    // (more than 50% false positives), so we cap the computed value at 0.5.
    const fpr = Math.min(
      0.5,
      Math.pow(numberOfEntries, 1 / expectedSyncCycles)
    );
    const localFilter = new BloomFilter({
      size: numberOfEntries,
      fpr,
    });
    const missingPeerValues: T[] = [];
    if (peerFilter && includeMissing) {
      for (const [id, v] of values) {
        localFilter.add(id);
        if (!peerFilter.has(id)) {
          missingPeerValues.push(v);
        }
      }
    }
    return new this({
      filter: localFilter,
      size: localSize,
      values: missingPeerValues,
    });
  }
}

export function generateSessionId(userId: string): string {
  return `${userId}/${uniqueId()}`;
}
