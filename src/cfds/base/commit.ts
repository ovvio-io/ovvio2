import { ReadonlyCoreObject } from '../../base/core-types/base.ts';
import { JSONCyclicalDecoder } from '../../base/core-types/encoding/json.ts';
import { ReadonlyJSONObject } from '../../base/interfaces.ts';
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
  parents?: Iterable<string>
): Commit {
  return {
    id,
    session,
    key,
    record,
    parents: parents ? Array.from(parents) : [],
    timestamp: new Date(),
  };
}
