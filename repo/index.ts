import { Repository, RepoStorage } from './repo.ts';
import { Record } from '../cfds/base/record.ts';
import { Commit } from './commit.ts';
import { coreValueCompare } from '../base/core-types/comparable.ts';

export type Row = [key: string | null, record: Record];
export type Predicate = (key: string | null, record: Record) => boolean;
export type SortDescriptor = (
  key1: string | null,
  record1: Record,
  key2: string | null,
  record2: Record,
) => number;

export class RepositoryIndex<T extends RepoStorage<T>> {
  private readonly _headIdForKey: Map<string | null, string>; // Key -> Commit ID
  private readonly _tempRecordForKey: Map<string | null, Record>;
  private readonly _includedKeys: Set<string | null>; // Keys
  private _cachedValues: undefined | Row[];

  constructor(
    readonly repo: Repository<T>,
    readonly predicate: Predicate,
    readonly sortDescriptor: SortDescriptor = (k1, _r1, k2, _r2) =>
      coreValueCompare(k1, k2),
  ) {
    this._headIdForKey = new Map();
    this._tempRecordForKey = new Map();
    this._includedKeys = new Set();
  }

  public activate(): void {
    this.scanRepo();
    this.repo.attach('NewCommit', (c: Commit) => this.onNewCommit(c));
  }

  private recordIncludedInIndex(key: string | null, record: Record): boolean {
    if (
      record.scheme.hasField('isDeleted') &&
      record.get('isDeleted', 0) !== 0
    ) {
      return false;
    }
    return this.predicate(key, record);
  }

  private onNewCommit(commit: Commit): void {
    const repo = this.repo;
    const key = commit.key;
    const prevHeadId = this._headIdForKey.get(key);
    const currentHead = this.repo.headForKey(key);
    if (currentHead && prevHeadId !== currentHead?.id) {
      const prevRecord = prevHeadId
        ? repo.recordForCommit(prevHeadId)
        : Record.nullRecord();
      const currentRecord = currentHead
        ? repo.recordForCommit(currentHead)
        : Record.nullRecord();
      if (!prevRecord.isEqual(currentRecord)) {
        this._cachedValues = undefined;
        this._headIdForKey.set(key, currentHead!.id);
        this._tempRecordForKey.delete(key);
        if (this.recordIncludedInIndex(key, currentRecord)) {
          this._includedKeys.add(key);
        } else if (this._includedKeys.has(key)) {
          this._includedKeys.delete(key);
        }
      }
    }
  }

  private onTemporaryRecord(key: string | null, record: Record): void {
    const prevHeadId = this._headIdForKey.get(key);
    let prevRecord: Record | undefined;
    if (prevHeadId) {
      prevRecord = this.repo.recordForCommit(prevHeadId);
    }
    if (!prevRecord || prevRecord.isNull) {
      prevRecord = this._tempRecordForKey.get(key);
    }
    if (!prevRecord || !prevRecord.isEqual(record)) {
      this._cachedValues = undefined;
      this._tempRecordForKey.set(key, record);
      this._headIdForKey.delete(key);
      if (this.recordIncludedInIndex(key, record)) {
        this._includedKeys.add(key);
      } else if (this._includedKeys.has(key)) {
        this._includedKeys.delete(key);
      }
    }
  }

  recordForKey(key: string | null | undefined): Record {
    if (key === undefined) {
      return Record.nullRecord();
    }
    const head = this._headIdForKey.get(key);
    return (
      (head && this.repo.recordForCommit(head)) ||
      this._tempRecordForKey.get(key) ||
      Record.nullRecord()
    );
  }

  values(): Row[] {
    if (this._cachedValues) {
      return this._cachedValues;
    }
    const result: Row[] = [];
    for (const key of this._includedKeys) {
      result.push([key, this.recordForKey(key)]);
    }
    const sortDescriptor = this.sortDescriptor;
    result.sort((e1, e2) => {
      const [key1, record1] = e1;
      const [key2, record2] = e2;
      return sortDescriptor(key1, record1, key2, record2);
    });
    this._cachedValues = result;
    return result;
  }

  find(predicate: Predicate, limit?: number): Row[] {
    const result: Row[] = [];
    for (const key of this._includedKeys) {
      const record = this.recordForKey(key);
      if (predicate(key, record)) {
        result.push([key, record]);
        if (limit && result.length >= limit) {
          break;
        }
      }
    }
    return result;
  }

  count(predicate: Predicate, limit?: number): number {
    let result = 0;
    for (const key of this._includedKeys) {
      const record = this.recordForKey(key);
      if (predicate(key, record)) {
        ++result;
        if (limit && result >= limit) {
          break;
        }
      }
    }
    return result;
  }

  scanRepo(): void {
    const repo = this.repo;
    for (const key of repo.keys()) {
      const head = repo.headForKey(key)!;
      if (head) {
        this.onNewCommit(head);
      } else {
        const record = repo.valueForKey(key);
        if (!record.isNull) {
          this.onTemporaryRecord(key, record);
        }
      }
    }
  }
}
