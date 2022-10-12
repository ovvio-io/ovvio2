import { Repository } from './repo.ts';
import { BloomFilter } from '../../base/bloom.ts';
import { Commit } from './commit.ts';

export interface BroadcastPayload {
  filter: BloomFilter;
  commits?: Iterable<Commit>;
}

export class Peer {
  private readonly _filters: BloomFilter[];

  constructor(readonly repo: Repository, readonly session: string) {
    this._filters = [];
  }

  has(c: Commit): boolean {
    const filters = this._filters;
    if (filters.length > 0) {
      const id = c.id;
      for (const f of filters) {
        if (!f.has(id)) {
          return false;
        }
      }
    }
    return true;
  }
}
