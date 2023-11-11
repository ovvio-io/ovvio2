import { SchemeNamespace } from '../cfds/base/scheme-types.ts';
import { Authorizer, RepoStorage, Repository } from './repo.ts';

export type FetchOperatorEmails = () => readonly string[];

/**
 * Creates and returns an Authorizer function for /sys/dir.
 *
 * @param fetchOperatorEmails A function that fetches the current list of
 *                            operator emails.
 * @returns An authorizer function for /sys/dir.
 */
export function createSysDirAuthorizer<ST extends RepoStorage<ST>>(
  fetchOperatorEmails: FetchOperatorEmails
): Authorizer<ST> {
  return (repo, commit, session, write: boolean) => {
    const userKey = session.owner;
    // Anonymous session
    if (!userKey) {
      return commit.key === session.id;
    }
    // Root access
    if (userKey === 'root') {
      return true;
    }
    // A user is always allowed to edit its own record
    if (userKey === commit.key) {
      return true;
    }
    // Operator Access
    const record = repo.valueForKey(commit.key);
    const userRecord = repo.valueForKey(userKey);
    const email = userRecord.get<string>('email');
    const operatorEmails = fetchOperatorEmails();
    const isOperator = email && operatorEmails.includes(email);
    if (isOperator) {
      return true;
    }
    // Per-namespace breakdown of permissions
    switch (record.scheme.namespace) {
      // Read-write access to members only
      case SchemeNamespace.WORKSPACE: {
        const users = record.get<Set<string>>('users');
        return users?.has(userKey) === true;
      }

      // Readonly access to everyone. Operators are transparent to everyone but
      // other operators.
      case SchemeNamespace.USERS:
        return !operatorEmails.includes(record.get<string>('email'));

      // Readonly access to everyone
      case SchemeNamespace.SESSIONS:
        return write === false;

      default:
        return false;
    }
  };
}

/**
 * Creates and returns an Authorizer function for a workspace repository.
 *
 * @param fetchOperatorEmails A function that fetches the current list of
 *                            operator emails.
 * @param sysDir The /sys/dir repository.
 * @param workspaceKey The key of this workspace in /sys/dir.
 * @returns An authorizer function for a workspace repository.
 */
export function createWorkspaceAuthorizer<ST extends RepoStorage<ST>>(
  fetchOperatorEmails: FetchOperatorEmails,
  sysDir: Repository<ST>,
  workspaceKey: string
): Authorizer<ST> {
  return (repo, commit, session, write: boolean) => {
    const userKey = session.owner;
    // Anonymous session
    if (!userKey) {
      return false;
    }
    // Root access
    if (userKey === 'root') {
      return true;
    }

    // Operator Access
    const userRecord = repo.valueForKey(userKey);
    const email = userRecord.get<string>('email');
    const isOperator = email && fetchOperatorEmails().includes(email);
    if (isOperator) {
      return true;
    }

    // Full read-write for workspace members
    const workspaceRecord = sysDir.valueForKey(workspaceKey);
    const users = workspaceRecord.get<Set<string>>('users');
    return users?.has(userKey) === true;
  };
}

export function createUserAuthorizer<ST extends RepoStorage<ST>>(
  userKey: string
): Authorizer<ST> {
  return (repo, commit, session, write: boolean) => {
    return userKey === 'root' || userKey === session.owner;
  };
}
