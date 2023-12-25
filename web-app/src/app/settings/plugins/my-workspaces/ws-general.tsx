import React, { useCallback, useEffect, useRef, useState } from 'react';
import { tabsStyles } from '../../components/tabs-style.tsx';
import { cn, makeStyles } from '../../../../../../styles/css-objects/index.ts';
import SettingsField from '../../components/settings-field.tsx';
import { useGraphManager } from '../../../../core/cfds/react/graph.tsx';
import { usePartialVertex } from '../../../../core/cfds/react/vertex.ts';
import { View } from '../../../../../../cfds/client/graph/vertices/view.ts';
import { VertexManager } from '../../../../../../cfds/client/graph/vertex-manager.ts';
import { Workspace } from '../../../../../../cfds/client/graph/vertices/workspace.ts';
import { User } from '../../../../../../cfds/client/graph/vertices/user.ts';
import { IconMore } from '../../../../../../styles/components/new-icons/icon-more.tsx';
import { brandLightTheme as theme } from '../../../../../../styles/theme.tsx';
import Menu, {
  MenuAction,
  MenuRenderButton,
} from '../../../../../../styles/components/menu.tsx';
import { styleguide } from '../../../../../../styles/styleguide.ts';
import { layout } from '../../../../../../styles/layout.ts';
import {
  AddUserButton,
  DeleteWsButton,
  EditButton,
} from '../../components/settings-buttons.tsx';
import TextField from '../../../../../../styles/components/inputs/TextField.tsx';
import SelectionButton, {
  SelectionItem,
  SelectionPopup,
} from '../../../../shared/selection-button/index.tsx';
import { UISource } from '../../../../../../logging/client-events.ts';
import { suggestResults } from '../../../../../../cfds/client/suggestions.ts';

const useStyles = makeStyles(() => ({
  container: {
    width: '352px',
    height: '400px',
    marginLeft: '144px',
  },
  settingsFields: {
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    fontSize: '13px',
    fontWeight: '600',
    letterSpacing: ' 0.075px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: '10px',
    alignItems: 'flex-end',
  },
  table: {
    width: '100%',
    height: '100%',
    borderRadius: '2px',
    backgroundColor: '#F5F9FB',
    boxShadow: '0px 0px 4px 0px rgba(151, 132, 97, 0.25)',
    display: 'flex',
    flexDirection: 'column',
  },
  row: {
    height: '44px',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: '1px',
    borderRadius: '2px',
  },
  firstColumnStyle: {
    display: 'flex',
    width: '222px',
    height: '20px',
    flexDirection: 'column',
    justifyContent: 'center',
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: '18px',
    letterSpacing: '0.0.75px',
    fontWeight: '400',
  },
  otherColumnStyle: {
    display: 'flex',
    width: '176px',
    height: '17px',
    flexDirection: 'column',
    justifyContent: 'center',
    fontSize: 10,
    color: theme.colors.text,
    lineHeight: '14px',
    fontWeight: '400',
  },
  overflowIcon: {
    opacity: 0,
  },
  user: {
    height: styleguide.gridbase * 6,
    paddingLeft: styleguide.gridbase * 2,
    paddingRight: styleguide.gridbase * 2,
    transition: `background-color ${styleguide.transition.duration.short}ms linear`,
    boxSizing: 'border-box',
    ':hover': {
      backgroundColor: '#FBF6EF',
      itemMenu: {
        opacity: 1,
      },
    },
    alignItems: 'center',
    basedOn: [layout.row],
  },
  itemMenu: {
    opacity: 0,
    ...styleguide.transition.short,
    transitionProperty: 'opacity',
  },
  itemMenuOpen: {
    opacity: 1,
  },
  deleteConfirmation: {
    marginBottom: styleguide.gridbase,
    display: 'flex',
    width: '324px',
    alignItems: 'center',
    gap: '8px',
    borderRadius: '18px',
    background:
      'radial-gradient(130.54% 130.54% at 7.69% 7.69%, rgba(255, 255, 255, 0.30) 0%, rgba(229, 229, 229, 0.30) 100%)',
    boxShadow: '0px 0px 1px 0px rgba(0, 0, 0, 0.20)',
    backdropFilter: 'blur(0.5px)',
  },
  deleteWsButton: {
    width: '178px',
  },
  deleteContainer: {
    basedOn: [layout.column],
    marginTop: '69px',
    width: '324px',
  },

  //-----------------------------------------------------------------
  popup: {
    backgroundColor: theme.colors.background,
    width: styleguide.gridbase * 16.5,
    marginBottom: styleguide.gridbase * 2,
  },
}));

export function WsGeneralSettings() {
  const styles = tabsStyles();
  const graph = useGraphManager();
  const mgr = graph.getVertexManager<View>('ViewWsSettings');
  const partialView = usePartialVertex(mgr, ['selectedWorkspaces']);
  const ws = [...partialView.selectedWorkspaces][0];
  // const ws = partialView.selectedWorkspaces;
  const wsManager = graph.getVertexManager<Workspace>(ws);
  //TODO: maybe put wsManager as state.
  const onDelete = () => {};
  return (
    <div
      className={cn(styles.barRow)}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        flexDirection: 'row',
      }}
    >
      <div className={cn(styles.settingsFields)}>
        <SettingsField
          title="Workspace's Name"
          toggle="editable"
          value={ws && ws.name}
          onChange={(newValue) => (ws.name = newValue)} //TODO: Fix
        />

        <SettingsField
          title="Description"
          placeholder="Add a description of the project/client/etc."
          toggle="editable"
          value=""
        />
        <DeleteConfirmWsButton
          workspaceManager={wsManager}
          onDelete={onDelete}
        />
      </div>
      <UsersList workspaceManager={wsManager} />
    </div>
  );
}

interface UserItemProps {
  user: User;
}
function UserItem({ user }: UserItemProps) {
  const styles = useStyles();

  interface ImageIconProps {
    width?: string;
    height?: string;
    src: string;
    alt?: string;
  }

  const ImageIcon: React.FC<ImageIconProps> = ({ width, height, src, alt }) => {
    return <img src={src} alt={alt || 'icon'} width={width} height={height} />;
  };

  const renderButton = useCallback(
    ({ isOpen }: { isOpen: boolean }) => (
      <div className={isOpen ? styles.itemMenuOpen : styles.itemMenu}>
        <img key="IconMoreSettings" src="/icons/settings/More.svg" />
      </div>
    ),
    []
  );
  return (
    <div className={cn(styles.user)}>
      <div className={cn(styles.firstColumnStyle)}>{user.name}</div>
      <div className={cn(styles.otherColumnStyle)}>{user.email}</div>
      <Menu
        renderButton={renderButton}
        position="left"
        align="start"
        direction="out"
      >
        <MenuAction
          IconComponent={(props: ImageIconProps) => (
            <ImageIcon
              {...props}
              src="/icons/settings/Delete.svg"
              alt="Delete"
            />
          )}
          text="Remove From Workspace"
          iconWidth="16px"
          iconHeight="16px"
        />
      </Menu>
    </div>
  );
}
// ------------------------------------------------------------------------------------
interface RenderItemFunctionProps<T> {
  item: T;
  key?: string;
}

type RenderItemFunction<
  T,
  PT extends RenderItemFunctionProps<T> = RenderItemFunctionProps<T>
> = (props: PT) => React.ReactNode;

interface AddSelectionButtonProps<T> {
  className?: string;
  children: MenuRenderButton;
  onSelected: (item: T) => void;
  trigger?: string;
  getItems: (filter: string) => SelectionItem<T>[];
  renderItem: RenderItemFunction<T>;
}
export default function AddSelectionButton<T>({
  className,
  children,
  onSelected,
  renderItem,
  getItems,
  trigger = '',
}: AddSelectionButtonProps<T>) {
  const styles = useStyles();
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  useEffect(() => {
    if (users) {
      const filtered = suggestResults(
        searchTerm,
        users,
        (t) => t.name,
        Number.MAX_SAFE_INTEGER
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  return (
    <Menu
      renderButton={children}
      position="right"
      align="end"
      direction="out"
      className={className}
      style={style}
      popupClassName={cn(styles.popup)}
    >
      <SelectionPopup
        onSelected={onSelected}
        trigger={trigger}
        renderItem={renderItem}
        getItems={getItems}
      />
    </Menu>
  );
}

interface AddMemberToWsButtonProps {
  workspaceManager: VertexManager<Workspace>;
}

export function AddMemberToWsButton({
  workspaceManager,
}: AddMemberToWsButtonProps) {
  const styles = useStyles();
  const inputRef = useRef();
  const assignees = usePartialVertex(workspaceManager, ['assignees']); // check
  const source: UISource = 'list';

  const onClick = () => {
    setIsDeleting(true);
  };

  return (
    <div className={cn()}>
      <AddSelectionButton source={source} onSelected={() => {}}>
        {() => <EditButton />}{' '}
      </AddSelectionButton>
    </div>
  );
}

// ------------------------------------------------------------------------------------

interface DeleteConfirmWsButtonProps {
  workspaceManager: VertexManager<Workspace>;
  onDelete: () => void;
}

export function DeleteConfirmWsButton({
  workspaceManager,
  onDelete, // what should happen after the ws has been deleted?
}: DeleteConfirmWsButtonProps) {
  const styles = useStyles();
  const inputRef = useRef();
  const [name, setName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const partialWS = usePartialVertex(workspaceManager, ['name', 'isDeleted']);
  const displayName = partialWS.name;

  useEffect(() => {
    if (isDeleting && inputRef.current) {
      (inputRef.current as any).focus();
    }
  }, [isDeleting, workspaceManager]);

  const onClick = () => {
    setIsDeleting(true);
  };

  return (
    <div className={cn(styles.deleteContainer)}>
      {isDeleting && (
        <TextField
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          className={cn(styles.deleteConfirmation)}
          placeholder="Type workspace name to confirm"
          ref={inputRef}
        />
      )}
      <DeleteWsButton
        disabled={isDeleting && name !== displayName}
        onDeleteClick={onClick}
        className={cn(styles.deleteWsButton)}
      />
    </div>
  );
}

interface UsersListProps {
  workspaceManager: VertexManager<Workspace>;
}

function UsersList({ workspaceManager }: UsersListProps) {
  const styles = useStyles();
  const { users } = usePartialVertex(workspaceManager, ['users']);
  return (
    <div className={cn(styles.container)}>
      <div className={cn(styles.header)}>
        <div className={cn(styles.title)}>Workspace's members</div>
        <AddUserButton />
      </div>
      <div className={cn(styles.table)}>
        {Array.from(users).map((u: User) => (
          <div className={cn(styles.row)} key={u.key}>
            <UserItem user={u} />
          </div>
        ))}
      </div>
    </div>
  );
}
