import { BloomFilter } from '../base/bloom.ts';
import { uniqueId } from '../base/common.ts';
import { Commit } from '../cfds/base/commit.ts';

export type SyncMessage = [filter: BloomFilter, commits?: Commit[]];

export function generateSessionId(userId: string): string {
  return `${userId}/${uniqueId()}`;
}
