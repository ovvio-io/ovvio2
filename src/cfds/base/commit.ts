import { Record } from './record.ts';

export type CommitResolver = (commitId: string) => Commit;

export class Commit {
  readonly parents: string[];
  readonly timestamp: Date;

  constructor(
    readonly id: string,
    readonly session: string,
    readonly key: string,
    readonly record: Record,
    parents?: Iterable<string>
  ) {
    this.parents = parents ? Array.from(parents) : [];
    this.timestamp = new Date();
  }
}
