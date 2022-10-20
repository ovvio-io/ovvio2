import { ReadonlyCoreObject } from '../../base/core-types/base.ts';
import { Record } from './record.ts';

export type CommitResolver = (commitId: string) => Commit;

export interface Commit extends ReadonlyCoreObject {
  readonly id: string;
  readonly session: string;
  readonly key: string;
  readonly record: Record;
  readonly parents: string[];
  readonly timestamp: Date;
}

export function commitInit(
  id: string,
  session: string,
  key: string,
  record: Record,
  parents?: string | Iterable<string>
): Commit {
  if (typeof parents === 'string') {
    parents = [parents];
  } else if (!parents) {
    parents = [];
  } else {
    parents = Array.from(parents);
  }
  return {
    id,
    session,
    key,
    record,
    parents: parents as string[],
    timestamp: new Date(),
  };
}
