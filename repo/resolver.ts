import { assert, notReached } from '../base/error.ts';
import { Record } from '../cfds/base/record.ts';
import {
  KEY_SUFFIX_SETTINGS,
  SchemeNamespace,
} from '../cfds/base/scheme-types.ts';
import { RepositoryType } from './repo.ts';

export function repositoryForRecord(key: string | null, rec: Record): string {
  let storage: RepositoryType;
  let id: string;
  switch (rec.scheme.namespace) {
    case SchemeNamespace.NOTES:
    case SchemeNamespace.TAGS:
      storage = 'data';
      id = rec.get<string>('workspace')!;
      break;

    case SchemeNamespace.USERS:
    case SchemeNamespace.WORKSPACE:
      storage = 'sys';
      id = 'dir';
      break;

    case SchemeNamespace.USER_SETTINGS:
      assert(
        typeof key === 'string' && key.endsWith(KEY_SUFFIX_SETTINGS),
        'Invalid key for settings record'
      );
      storage = 'data';
      id = key.substring(0, key.length - KEY_SUFFIX_SETTINGS.length);
      break;

    case SchemeNamespace.VIEWS:
      storage = 'user';
      id = rec.get<string>('owner')!;
      break;

    case SchemeNamespace.Null:
      notReached("Null records can't be persisted to a repository");
  }
  return `${storage}/${id}`;
}
