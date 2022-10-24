import React from 'react';
import cssObjects, { cn } from '@ovvio/styles/lib/css-objects';
import { styleguide, layout } from '@ovvio/styles/lib';
import Menu from '@ovvio/styles/lib/components/menu';
import { useTheme } from '@ovvio/styles/lib/theme';

import { IconAssignee } from '@ovvio/styles/lib/components/icons';
import { MentionItem, MentionPopup } from './mention';
import { useScopedObservable } from 'core/state';
import { Workspace } from 'stores/workspaces';
import { wordDist } from '@ovvio/cfds/lib/primitives-old/plaintext';
import Avatar from '@ovvio/styles/lib/components/avatar';
import { assignNote } from 'shared/utils/assignees';

const styles = cssObjects(theme => ({
  popup: {
    backgroundColor: theme.background[0],
    width: styleguide.gridbase * 32,
    marginBottom: styleguide.gridbase * 2,
  },
  popupContent: {
    backgroundColor: theme.background[0],
    width: '100%',
    boxSizing: 'border-box',
    basedOn: [layout.column],
  },
  input: {
    border: 'none',
    width: '100%',
    borderBottom: '1px solid rgba(156, 178, 205, 0.6)',
    borderRadius: 0,
  },
  userName: {
    flexGrow: 1,
    whiteSpace: 'nowrap',
    marginLeft: styleguide.gridbase,
    color: theme.background.text,
  },
}));

function AssignActionPopup({ items, close, onAssigned }) {
  const workspace = useScopedObservable(Workspace);
  const getItems = filter => {
    if (!workspace) {
      return [];
    }
    return workspace.users
      .map(u => {
        const item = {
          user: u,
          key: u.id,
          dist: wordDist(u.name.toLowerCase(), filter.toLowerCase()),
        };

        return item;
      })
      .filter(u => !filter || u.dist > 0.1)
      .sort((a, b) => b.dist - a.dist);
  };
  const onSelected = item => {
    const { user } = item;

    for (const doc of items) {
      assignNote(doc, user.id);
    }
    onAssigned(user);
  };
  const renderItem = (item, props) => (
    <MentionItem {...props} key={item.key}>
      <Avatar user={item.user} />
      <span className={cn(styles.userName)}>{item.user.name}</span>
    </MentionItem>
  );

  return (
    <MentionPopup
      getItems={getItems}
      close={close}
      trigger="@"
      onSelected={onSelected}
      renderItem={renderItem}
    />
  );
}

export function AssignAction({ items, onAssigned, className }) {
  const theme = useTheme();
  return (
    <Menu
      renderButton={({ isOpen }) => {
        const props = {};
        if (isOpen) {
          props.fill = theme.primary[500];
        }
        return <IconAssignee {...props} />;
      }}
      position="top"
      align="center"
      direction="out"
      className={className}
      popupClassName={cn(styles.popup)}
    >
      <AssignActionPopup items={items} onAssigned={onAssigned} />
    </Menu>
  );
}
