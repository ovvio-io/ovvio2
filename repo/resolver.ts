import { assert, notReached } from '../base/error.ts';
import { Record } from '../cfds/base/record.ts';
import {
  KEY_SUFFIX_SETTINGS,
  SchemeNamespace,
} from '../cfds/base/scheme-types.ts';
import { Repository, RepositoryType } from './repo.ts';

/**
 * This function defines the mapping between records and their corresponding
 * repositories. Whenever a new namespace is added, this function must be
 * updated.
 *
 * This is a central point through which the entire system goes, both the client
 * and the server code.
 *
 * @param key The key of the record.
 * @param rec The latest value of the record.
 *
 * @returns A repository id.
 */
export function repositoryForRecord(
  key: string | null,
  rec: Record,
  rootKey: string | undefined,
): string {
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
    case SchemeNamespace.SESSIONS:
      storage = 'sys';
      id = 'dir';
      break;

    case SchemeNamespace.USER_SETTINGS:
      assert(
        typeof key === 'string' && key.endsWith(KEY_SUFFIX_SETTINGS),
        'Invalid key for settings record',
      );
      storage = 'user';
      id = key.substring(0, key.length - KEY_SUFFIX_SETTINGS.length);
      break;

    case SchemeNamespace.VIEWS:
      storage = 'user';
      id = rec.get<string>('owner')!;
      break;

    case SchemeNamespace.EVENTS:
      assert(rootKey !== undefined);
      storage = 'events';
      id = rootKey;
      break;

    case SchemeNamespace.Null:
      notReached("Null records can't be persisted to a repository");
  }
  return Repository.id(storage, id);
}
