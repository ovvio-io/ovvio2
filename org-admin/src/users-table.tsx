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
import {
  useQuery2,
  useSharedQuery,
} from '../../web-app/src/core/cfds/react/query.ts';
import { User } from '../../cfds/client/graph/vertices/user.ts';
import {
  usePartialVertex,
  usePartialVertices,
} from '../../web-app/src/core/cfds/react/vertex.ts';
import Toolbar from '../../web-app/src/app/workspace-content/workspace-view/toolbar/index.tsx';
import { VertexId } from '../../cfds/client/graph/vertex.ts';
import { useGraphManager } from '../../web-app/src/core/cfds/react/graph.tsx';

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
    marginTop: styleguide.gridbase * 2,
    marginBottom: styleguide.gridbase * 3,
  },
  editButton: {
    background: theme.colors.primaryButton,
    height: styleguide.gridbase * 3,
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
  table: {
    textAlign: 'center',
    border: '1px solid',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
    width: '100%',
    whiteSpace: 'normal',
  },
  row: {
    border: '1px solid',
  },
  cell: {
    border: '1px solid',
  },
  textInput: {
    textAlign: 'center',
    ':read-only': {
      outline: 'none',
      border: 'none',
    },
  },
}));

export interface UserRowProps {
  userId: VertexId<User>;
}

export function UserRow({ userId }: UserRowProps) {
  const styles = useStyles();
  const partialUser = usePartialVertex(userId, ['name', 'email']);
  const [name, setName] = useState(partialUser.name);
  const [email, setEmail] = useState(partialUser.email);
  const [readonly, setReadonly] = useState(true);
  return (
    <tr className={cn(styles.row)}>
      <td id={`${partialUser.key}/key`} className={cn(styles.cell)}>
        {partialUser.key}
      </td>
      <td className={cn(styles.cell)}>
        <input
          id={`${partialUser.key}/email`}
          className={cn(styles.textInput)}
          value={email}
          placeholder="Null"
          readOnly={readonly}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
        />
      </td>
      <td className={cn(styles.cell)}>
        <input
          id={`${partialUser.key}/name`}
          className={cn(styles.textInput)}
          value={name}
          placeholder="Null"
          readOnly={readonly}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
      </td>
      <td className={cn(styles.cell)}>
        <Button
          className={cn(styles.editButton)}
          onClick={() => {
            if (!readonly) {
              partialUser.name = name;
              partialUser.email = email;
            }
            setReadonly(!readonly);
          }}
        >
          {readonly ? 'Edit' : 'Save'}
        </Button>
      </td>
    </tr>
  );
}

export function UsersTable() {
  const styles = useStyles();
  const query = useSharedQuery('users');
  const graph = useGraphManager();

  const onClick = useCallback(() => {
    graph.createVertex(SchemeNamespace.USERS, {});
  }, [graph]);

  return (
    <div className={cn(styles.contents)}>
      <Toolbar />
      <Button className={cn(styles.newButton)} onClick={onClick}>
        New User
      </Button>
      <table className={cn(styles.table)}>
        <tr className={cn(styles.row)}>
          <th className={cn(styles.cell)}>Key</th>
          <th className={cn(styles.cell)}>Email</th>
          <th className={cn(styles.cell)}>Name</th>
          <th className={cn(styles.cell)}></th>
        </tr>
        {query.map((u) => (
          <UserRow userId={u.key} />
        ))}
      </table>
    </div>
  );
}
