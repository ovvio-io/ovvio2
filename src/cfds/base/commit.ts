import { ReadonlyCoreObject } from '../../base/core-types/base.ts';
import { Record } from './record.ts';
import { Edit } from './edit.ts';

export type CommitResolver = (commitId: string) => Commit;

export interface RecordContents extends ReadonlyCoreObject {
  readonly record: Record;
}

export interface DeltaContents extends ReadonlyCoreObject {
  readonly base: string;
  readonly edit: Edit;
}

export type CommitContents = RecordContents | DeltaContents;

export interface Commit extends ReadonlyCoreObject {
  readonly id: string;
  readonly session: string;
  readonly key: string;
  readonly parents: string[];
  readonly timestamp: Date;
  readonly contents: CommitContents;
}

export function commitInit(
  id: string,
  session: string,
  key: string,
  contents: Record | CommitContents,
  parents?: string | Iterable<string>
): Commit {
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
  return {
    id,
    session,
    key,
    parents: parents as string[],
    timestamp: new Date(),
    contents,
  };
}

export function commitContentsIsDelta(c: CommitContents): c is DeltaContents {
  return typeof c.base === 'string';
}

export function commitContentsIsRecord(c: CommitContents): c is RecordContents {
  return c.record instanceof Record;
}
