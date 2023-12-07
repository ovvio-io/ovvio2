import { sessionIdFromSignature } from '../auth/session.ts';
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
  // ATTENTION: We look at the session who signed the commit (source) for
  // determining permissions, rather than the session who transmits the commit
  // (transport).
  return (repo, commit, session, write: boolean) => {
    if (!commit.signature) {
      return false;
    }
    let userKey: string | undefined;
    if (commit.key === session.id) {
      userKey = session.owner;
    } else {
      const commitSignerSessionRecord = repo.valueForKey(
        sessionIdFromSignature(commit.signature)
      );
      userKey =
        commitSignerSessionRecord.scheme.namespace === SchemeNamespace.SESSIONS
          ? commitSignerSessionRecord.get<string>('owner')
          : undefined;
    }
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
    const email =
      userRecord.scheme.namespace === SchemeNamespace.USERS
        ? userRecord.get<string>('email')
        : undefined;
    const operatorEmails = fetchOperatorEmails();
    const isOperator =
      typeof email === 'string' && operatorEmails.includes(email);
    if (isOperator) {
      return true;
    }
    // If a current record doesn't exist, and we got a delta commit or a null
    // commit, reject it as an invalid case.
    if (record.isNull && (!commit.scheme || commit.scheme?.isNull)) {
      return false;
    }
    // Derive the scheme either from the existing record (update) or from the
    // new commit (create).
    const namespace = record.isNull
      ? repo.recordForCommit(commit).scheme?.namespace
      : commit.scheme?.namespace;
    // Per-namespace breakdown of permissions
    switch (namespace) {
      // Read-write access to members only
      case SchemeNamespace.WORKSPACE: {
        // Anyone is allowed to create a new workspace
        if (record.isNull) {
          return true;
        }
        // Only members of an existing workspace are allowed to edit it
        const users = record.get<Set<string>>('users');
        return users?.has(userKey) === true;
      }

      // Readonly access to everyone. Operators are transparent to everyone but
      // other operators.
      case SchemeNamespace.USERS:
        return write === false || isOperator;

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
  // ATTENTION: We look at the session who signed the commit (source) for
  // determining permissions, rather than the session who transmits the commit
  // (transport).
  return (repo, commit, session, write: boolean) => {
    if (!commit.signature) {
      return false;
    }
    const commitSignerSessionRecord = sysDir.valueForKey(
      sessionIdFromSignature(commit.signature)
    );
    if (
      commitSignerSessionRecord.scheme.namespace !== SchemeNamespace.SESSIONS
    ) {
      return false;
    }
    const userKey = commitSignerSessionRecord.get<string>('owner');
    // Anonymous session
    if (!userKey) {
      return false;
    }
    // Root access
    if (userKey === 'root') {
      return true;
    }

    // Operator Access
    const userRecord = sysDir.valueForKey(userKey);
    const email =
      userRecord.scheme.namespace === SchemeNamespace.USERS
        ? userRecord.get<string>('email')
        : undefined;
    const isOperator = email && fetchOperatorEmails().includes(email);
    if (isOperator) {
      return true;
    }

    // Full read-write for workspace members
    const workspaceRecord = sysDir.valueForKey(workspaceKey);
    const users =
      workspaceRecord.scheme.namespace === SchemeNamespace.WORKSPACE
        ? workspaceRecord.get<Set<string>>('users')
        : undefined;
    return users?.has(userKey) === true;
  };
}

export function createUserAuthorizer<ST extends RepoStorage<ST>>(
  sysDir: Repository<ST>,
  userKey: string
): Authorizer<ST> {
  // ATTENTION: We look at the session who signed the commit (source) for
  // determining permissions, rather than the session who transmits the commit
  // (transport).
  return (repo, commit, session, write: boolean) => {
    if (!commit.signature) {
      return false;
    }
    const commitSignerSessionRecord = sysDir.valueForKey(
      sessionIdFromSignature(commit.signature)
    );
    return (
      userKey === 'root' || userKey === commitSignerSessionRecord.get('owner')
    );
  };
}
