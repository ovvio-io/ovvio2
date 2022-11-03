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
import {
  DecodedValue,
  ReadonlyDecodedArray,
} from '../base/core-types/encoding/types.ts';
import { ReadonlyJSONObject, ReadonlyJSONValue } from '../base/interfaces.ts';
import { Commit, CommitContents } from '../cfds/base/commit.ts';
import { Edit } from '../cfds/base/edit.ts';
import { Record } from '../cfds/base/record.ts';
import { Repository, RepoStorage } from '../cfds/base/repo.ts';

export class SyncMessage implements Encodable {
  readonly filter: BloomFilter;
  readonly repoSize: number;
  readonly commits: Commit[];

  constructor(filter: BloomFilter, repoSize: number, commits?: Commit[]) {
    this.filter = filter;
    this.repoSize = repoSize;
    this.commits = commits || [];
  }

  toJS(): ReadonlyJSONValue {
    return JSONCyclicalEncoder.serialize(this);
  }

  serialize(
    encoder: Encoder<string, CoreValue, CoreValue, unknown>,
    _options?: unknown
  ): void {
    encoder.set('f', this.filter);
    encoder.set(
      'c',
      this.commits.map((c) => JSONCyclicalEncoder.serialize(c))
    );
    encoder.set('s', this.repoSize);
  }

  static fromJS(obj: ReadonlyJSONValue): SyncMessage {
    const decoder = new JSONCyclicalDecoder(obj as ReadonlyJSONObject);
    const filter = new BloomFilter({ decoder: decoder.getDecoder('f') });
    const commits = decoder
      .get<ReadonlyDecodedArray>('c', [])!
      .map((obj: DecodedValue) => {
        const decoder = new JSONCyclicalDecoder(obj as ReadonlyJSONObject);
        return new Commit({ decoder });
      });
    return new this(filter, decoder.get<number>('s', 0)!, commits);
  }

  /**
   * This constant determines the approximate number of sync cycles it'll take
   * for two parties to fully sync. The bloom filter's accuracy is scaled
   * dynamically to match the desired number of cycles.
   *
   * If we sync 3 times per second, 5 cycles will finish in a bit under 2 seconds.
   * This value must be matched with the sync frequency.
   */
  static build<T extends RepoStorage<T>>(
    peerFilter: BloomFilter | undefined,
    localRepo: Repository<T>,
    peerSize: number,
    expectedSyncCycles: number
  ): SyncMessage {
    const size = Math.max(1, Math.max(localRepo.numberOfCommits, peerSize));
    // The expected number of sync cycles is log base (1/fpr) over number of
    // commits. Thus we can work out the FPR based on the desired sync cycles:
    //
    // LOG(fpr, numberOfCommits) = expectedSyncCycles      =>
    // fpr = expectedSyncCycles'th root of numberOfCommits =>
    // fpr = numberOfCommits ^ (1 / expectedSyncCycles)
    //
    // Finally, a bloom filter with FPR greater than 0.5 isn't very useful
    // (more than 50% false positives), so cap the computed value at 0.5.
    const fpr = Math.min(0.5, Math.pow(size, 1 / expectedSyncCycles));
    const localFilter = new BloomFilter({
      size,
      fpr,
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
    return new this(localFilter, localRepo.numberOfCommits, missingPeerCommits);
  }
}

export function generateSessionId(userId: string): string {
  return `${userId}/${uniqueId()}`;
}
