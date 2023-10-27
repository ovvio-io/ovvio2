import React, { useCallback, useMemo, useState } from 'react';
import { useTrustPool } from '../../auth/react.tsx';
import {
  EVENT_NEW_COMMIT,
  MemRepoStorage,
  Repository,
} from '../../repo/repo.ts';
import { RepoClient } from '../../net/repo-client.ts';
import { getBaseURL } from '../../net/rest-api.ts';
import { kSyncConfigClient } from '../../net/base-client.ts';
import { appendPathComponent } from '../../base/string.ts';
import { filterIterable } from '../../base/common.ts';
import { SchemeNamespace } from '../../cfds/base/scheme-types.ts';
import { cn, makeStyles } from '../../styles/css-objects/index.ts';
import { Button } from '../../styles/components/buttons.tsx';
import { layout } from '../../styles/layout.ts';
import { styleguide } from '../../styles/styleguide.ts';
import { brandLightTheme as theme } from '../../styles/theme.tsx';
import { useNavigate } from 'react-router-dom';

const useStyles = makeStyles(() => ({
  contents: {
    width: '100%',
    height: '100%',
    padding: styleguide.gridbase,
    display: 'flex',
    flexDirection: 'column',
  },
  newButton: {
    background: theme.colors.primaryButton,
    height: styleguide.gridbase * 4,
    boxSizing: 'border-box',
    padding: [0, styleguide.gridbase],
    borderRadius: styleguide.gridbase * 2,
    ...styleguide.transition.short,
    transitionProperty: 'box-shadow',
    ':hover': {
      boxShadow: theme.shadows.z2,
    },
    alignItems: 'center',
    basedOn: [layout.row],
    color: theme.mono.m0,
    margin: '0px auto',
  },
}));

export function UsersTable() {
  const styles = useStyles();
  const trustPool = useTrustPool();
  const baseURL = getBaseURL();
  const navigate = useNavigate();
  const [userKeys, setUserKeys] = useState<string[]>([]);
  const [repo, client] = useMemo(() => {
    const repo = new Repository(new MemRepoStorage(), trustPool);
    const client = new RepoClient(
      repo,
      appendPathComponent(baseURL, 'sys', 'dir', 'sync'),
      kSyncConfigClient
    );
    repo.on(EVENT_NEW_COMMIT, () =>
      setUserKeys(
        Array.from(
          filterIterable(
            repo.keys(),
            (k) =>
              repo.valueForKey(k).scheme.namespace === SchemeNamespace.SESSIONS
          )
        )
      )
    );
    client.startSyncing();
    return [repo, client];
  }, [trustPool, baseURL, setUserKeys]);

  const onClick = useCallback(
    () => navigate('/tenant-admin/new-user'),
    [navigate]
  );
  return (
    <div className={cn(styles.contents)}>
      <Button className={cn(styles.newButton)} onClick={onClick}>
        New User
      </Button>
      <table>
        <tr>
          <th>Key</th>
          <th>Email</th>
          <th>Name</th>
        </tr>
        {userKeys.map((key) => {
          const record = repo.valueForKey(key);
          return (
            <tr>
              <td>{key}</td>
              <td>{record.get('email') || 'null'}</td>
              <td>{record.get('name') || 'null'}</td>
            </tr>
          );
        })}
      </table>
    </div>
  );
}
