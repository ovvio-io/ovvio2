import { Record } from '../base/record';

export interface CacheData {
  record?: Record;
  didList?: boolean;
  errorCode?: number;
  isDeleted?: boolean;
}

export interface CacheEntry extends CacheData {
  key: string;
}

export interface ClientCache {
  persistVersion(
    key: string,
    record: Record,
    didList: boolean,
    deleted: boolean
  ): Promise<boolean>;
  persistError(key: string, errorCode: number): Promise<boolean>;
  loadAll(f: (entry: CacheEntry) => void): Promise<void>;
}
