import { MAX_TS } from '@ovvio/base/lib/utils/time';
import { COLUMN_REF_NS, COLUMN_VERSION_KEY, RefInfo } from './record-db';
import { RowData } from './stores/crud';

export enum PathType {
  WorkingCopy,
  Version,
  DestRef,
}

export interface RecordPath {
  readonly key: string;
  readonly path: string;
  readonly type?: PathType;
  readonly version?: number;
}

const PATH_SEP = '/';
const DIR_DST_REFS = '1_DR';
const DIR_VERSIONS = '2_V';
const KEY_SUFFIX = '_r';
const COLUMN_METADATA_PRE = 'md_';
export const INDEX_PREFIX = 'index_';

export function decodePath(path: string): RecordPath | undefined {
  const parts = path.split(PATH_SEP);
  const key = parts[0];

  const last = parts[parts.length - 1];
  if (last === '.' + KEY_SUFFIX) {
    return {
      key,
      path,
      type: PathType.WorkingCopy,
    };
  }

  if (parts.includes(DIR_VERSIONS)) {
    return {
      key,
      path,
      type: PathType.Version,
    };
  }

  if (parts.includes(DIR_DST_REFS)) {
    return {
      key,
      path,
      type: PathType.DestRef,
    };
  }

  return;
}

export function wcOf(key: string): RecordPath {
  return {
    key,
    path: composePath(key, '.') + KEY_SUFFIX,
    type: PathType.WorkingCopy,
  };
}

export function versionOf(key: string, version: number): RecordPath {
  return {
    key,
    path: composePath(key, DIR_VERSIONS, MAX_TS - version) + KEY_SUFFIX,
    type: PathType.Version,
    version,
  };
}

export function globalVersionOf(key: string, version: number): RecordPath {
  return {
    key,
    path: `default://versions/${key}/${version}`,
    type: PathType.Version,
    version,
  };
}

export function destRefOf(
  sourceKey: string,
  destinationKey: string,
  modifyTime: Date
) {
  const revTS = MAX_TS - modifyTime.getTime();

  return {
    key: destinationKey,
    path:
      composePath(destinationKey, DIR_DST_REFS, revTS, sourceKey) + KEY_SUFFIX,
    type: PathType.DestRef,
  };
}

export function getRefPrefix(key: string) {
  return composePath(key, DIR_DST_REFS);
}

export function parseRefInfo(refKey: string, refData: RowData): RefInfo {
  const comps = refKey.split(PATH_SEP);

  const result: RefInfo = {
    key: comps[3].split(KEY_SUFFIX)[0],
    timestamp: MAX_TS - parseInt(comps[2]),
    namespace: refData[COLUMN_REF_NS],
  };

  if (refData[COLUMN_VERSION_KEY]) {
    result.version = parseInt(refData[COLUMN_VERSION_KEY]);
  }

  return result;
}

export function metadataColumn(metadataKey: string) {
  return `${COLUMN_METADATA_PRE}${metadataKey}`;
}

export function indexOf(indexName: string, keys: string[], value: string) {
  return composePath(INDEX_PREFIX + indexName, ...keys, value);
}

export function indexAllPrefix(indexName: string) {
  return composePath(INDEX_PREFIX + indexName) + PATH_SEP;
}

export function indexPrefix(indexName: string, keys: string[]) {
  return composePath(INDEX_PREFIX + indexName, ...keys) + PATH_SEP;
}

export function parseIndexName(indexPath: string) {
  const comps = indexPath.split(PATH_SEP);
  const first = comps[0];

  const iName = first.substring(INDEX_PREFIX.length);
  return iName;
}

export function parseIndexValue(indexPath: string) {
  const comps = indexPath.split(PATH_SEP);
  return comps[comps.length - 1];
}

function composePath(...args: (string | number)[]) {
  let result = '';
  for (let i = 0; i < args.length - 1; ++i) {
    result += String(args[i]) + PATH_SEP;
  }
  if (args.length) {
    result += String(args[args.length - 1]);
  }
  return result;
}

export default {
  wcOf,
  versionOf,
};
