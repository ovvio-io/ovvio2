import React, { useCallback, useEffect, useRef, useState } from 'react';
import { tabsStyles } from '../../components/tabs-style.tsx';
import { cn, makeStyles } from '../../../../../../styles/css-objects/index.ts';
import SettingsField from '../../components/settings-field.tsx';
import { useGraphManager } from '../../../../core/cfds/react/graph.tsx';
import {
  usePartialVertex,
  useVertex,
  useVertices,
} from '../../../../core/cfds/react/vertex.ts';
import { View } from '../../../../../../cfds/client/graph/vertices/view.ts';
import { VertexManager } from '../../../../../../cfds/client/graph/vertex-manager.ts';
import { Workspace } from '../../../../../../cfds/client/graph/vertices/workspace.ts';
import { User } from '../../../../../../cfds/client/graph/vertices/user.ts';
import { brandLightTheme as theme } from '../../../../../../styles/theme.tsx';
import Menu, { MenuAction } from '../../../../../../styles/components/menu.tsx';
import { styleguide } from '../../../../../../styles/styleguide.ts';
import { layout } from '../../../../../../styles/layout.ts';
import {
  AddUserButton,
  CancelButton,
  DeleteWsButton,
  RemoveButton,
} from '../../components/settings-buttons.tsx';
import TextField from '../../../../../../styles/components/inputs/TextField.tsx';
import { useSharedQuery } from '../../../../core/cfds/react/query.ts';
import { MemberPicker } from '../../../../../../components/member-picker.tsx';

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
  hidden: {
    display: 'none',
  },
  popup: {
    backgroundColor: theme.colors.background,
    maxWidth: styleguide.gridbase * 21,
    maxHeight: styleguide.gridbase * 20,
    // padding: '3px 2px 0px 2px',
    flexShrink: 0,
    // marginBottom: styleguide.gridbase * 2,
  },
  confirmation: {
    display: 'flex',
    padding: '8px 10px 10px ',
    flexDirection: 'column',
    alignItems: 'center',
    fontWeight: '600',
    fontSize: '14px',
  },
  confirmationButtons: {
    display: 'flex',
    padding: '16px 0px 16px 0px',
    flexDirection: 'column',
    width: '180px',
  },
}));

export function WsGeneralSettings() {
  const styles = tabsStyles();
  const graph = useGraphManager();
  const mgr = graph.getVertexManager<View>('ViewWsSettings');
  const partialView = usePartialVertex(mgr, ['selectedWorkspaces']);
  const ws = [...partialView.selectedWorkspaces][0];
  const wsV = useVertex(ws);
  const wsManager = ws.manager;
  const onWorkspaceDeleted = () => {};

  return (
    <div>
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
            value={wsV && wsV.name}
            onChange={(newValue) => (wsV.name = newValue)}
          />
          <SettingsField
            title="Description"
            placeholder="Add a description of the project/client/etc."
            toggle="editable"
            value=""
          />
          <DeleteConfirmWsButton
            wsMng={wsManager}
            onDeleted={onWorkspaceDeleted}
          />
        </div>
        <UsersList wsMng={wsManager} ws={ws} />
      </div>
    </div>
  );
}

interface UserItemProps {
  user: User;
  ws: Workspace;
  userMng: VertexManager<User>;
  removeUser: (userMng: VertexManager<User>, ws: Workspace) => void;
}
function UserItem({ user, userMng, removeUser, ws }: UserItemProps) {
  const styles = useStyles();
  const [removeUserStep, setRemoveUserStep] = useState('startRemove');

  const renderButton = useCallback(
    ({ isOpen }: { isOpen: boolean }) => (
      <div className={isOpen ? styles.itemMenuOpen : styles.itemMenu}>
        <img key="IconMoreSettings" src="/icons/settings/More.svg" />
      </div>
    ),
    []
  );

  interface ImageIconProps {
    width?: string;
    height?: string;
    src: string;
    alt?: string;
  }
  useEffect(() => {
    let timeoutId: number;

    if (removeUserStep === 'removeProcessing') {
      timeoutId = setTimeout(() => {
        setRemoveUserStep('confirmRemove');
      }, 10);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [removeUserStep]);

  const ImageIcon: React.FC<ImageIconProps> = ({ width, height, src, alt }) => {
    return <img src={src} alt={alt || 'icon'} width={width} height={height} />;
  };

  const removeUser1 = (userMng: VertexManager<User>) => {
    removeUser(userMng, ws);
    setRemoveUserStep('startRemove');
  };

  return (
    <div className={cn(styles.user)}>
      <div className={cn(styles.firstColumnStyle)}>{user.name}</div>
      <div className={cn(styles.otherColumnStyle)}>{user.email}</div>
      {removeUserStep === 'startRemove' ? (
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
            onClick={() => {
              setRemoveUserStep('removeProcessing');
            }}
          />
        </Menu>
      ) : removeUserStep === 'confirmRemove' ? (
        <Menu
          renderButton={renderButton}
          position="left"
          align="start"
          direction="out"
          openImmediately={true}
        >
          <div className={cn(styles.confirmation)}>
            Remove from workspace?
            <div className={cn(styles.confirmationButtons)}>
              <RemoveButton onRemove={() => removeUser1(userMng)} />
              <CancelButton onCancel={() => setRemoveUserStep('startRemove')} />
            </div>
          </div>
        </Menu>
      ) : null}
    </div>
  );
}
// ------------------------------------------------------------------------------------

interface AddSelectionButtonProps<T> {
  className?: string;
  ws: Workspace;
}
export default function AddSelectionButton<T>({
  className,
  ws,
}: AddSelectionButtonProps<T>) {
  const styles = useStyles();
  const usersQuery = useSharedQuery('users');
  const users = useVertices(usersQuery.results) as User[];
  const [isSearching, setIsSearching] = useState(false);

  const onRowSelect = (user: User) => {
    console.log('ws is ', ws, 'user is ', user);
    ws.users.add(user);
  };

  return (
    <Menu
      renderButton={() => (
        <AddUserButton onAddClick={() => setIsSearching(true)} />
      )}
      position="right"
      align="start"
      direction="out"
      className={className}
      popupClassName={cn(styles.popup)}
    >
      <MemberPicker
        users={users}
        onRowSelect={onRowSelect}
        setIsSearching={setIsSearching}
        isSearching={isSearching}
      />
    </Menu>
  );
}

// ------------------------------------------------------------------------------------

interface DeleteConfirmWsButtonProps {
  wsMng: VertexManager<Workspace>;
  onDeleted: () => void;
}

export function DeleteConfirmWsButton({
  wsMng,
  onDeleted,
}: DeleteConfirmWsButtonProps) {
  const styles = useStyles();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const partialWS = usePartialVertex(wsMng, ['name', 'isDeleted']);
  const displayName = partialWS.name;
  const canDelete = isDeleting && name === displayName;

  useEffect(() => {
    if (isDeleting && inputRef.current) {
      (inputRef.current as any).focus();
    }
  }, [isDeleting, wsMng]);

  const deleteWs = (wsMng: VertexManager<Workspace>) => {
    setIsDeleting(true);
    if (canDelete) {
      //why do i need this if statement? without it it doesnt work and i dont know why.
      const ws = wsMng.getVertexProxy();
      ws.isDeleted = 1;
      onDeleted();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsDeleting(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [inputRef]);

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
        onDeleteClick={deleteWs}
        className={cn(styles.deleteWsButton)}
        wsMng={wsMng}
      />
    </div>
  );
}

interface UsersListProps {
  wsMng: VertexManager<Workspace>;
  ws: Workspace;
}

function UsersList({ wsMng, ws }: UsersListProps) {
  const styles = useStyles();
  const { users } = usePartialVertex(wsMng, ['users']);

  const removeUser = (userMng: VertexManager<User>, ws: Workspace) => {
    const user = userMng.getVertexProxy();
    ws.users.delete(user);
  };

  return (
    <div className={cn(styles.container)}>
      <div className={cn(styles.header)}>
        <div className={cn(styles.title)}>Workspace's members</div>
        <AddSelectionButton ws={ws} />
      </div>
      <div className={cn(styles.table)}>
        {Array.from(users).map((u: User) => (
          <div className={cn(styles.row)} key={u.key}>
            <UserItem
              userMng={u.manager as VertexManager<User>}
              user={u}
              ws={ws}
              key={u.key}
              removeUser={removeUser}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
