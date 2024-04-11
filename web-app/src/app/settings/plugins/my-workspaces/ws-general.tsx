import React, { useCallback, useEffect, useRef, useState } from 'react';
import { tabsStyles } from '../../components/tabs-style.tsx';
import { cn, makeStyles } from '../../../../../../styles/css-objects/index.ts';
import SettingsField from '../../components/settings-field.tsx';
import {
  useGraphManager,
  usePartialView,
} from '../../../../core/cfds/react/graph.tsx';
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
import { DeleteWsButton } from '../../components/settings-buttons.tsx';
import TextField from '../../../../../../styles/components/inputs/TextField.tsx';
import { useSharedQuery } from '../../../../core/cfds/react/query.ts';
import { MemberPicker } from '../../../../../../components/member-picker.tsx';
import { BlueActionButton } from '../../components/settings-buttons.tsx';
import { ConfirmationDialog } from '../../../../../../styles/components/confirmation-menu.tsx';

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
    fontFamily: 'PoppinsBold, HeeboBold',
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
    overflowY: 'scroll',
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
    marginTop: '250px',
    width: '324px',
  },
  hidden: {
    display: 'none',
  },
  popup: {
    backgroundColor: theme.colors.background,
    maxWidth: styleguide.gridbase * 21,
    maxHeight: styleguide.gridbase * 21,
    flexShrink: 0,
  },
}));

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

  interface ImageIconProps {
    width?: string;
    height?: string;
    src: string;
    alt?: string;
  }

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
          <ConfirmationDialog
            approveButtonText={'Remove'}
            titleText={'Remove from workspace?'}
            handleApproveClick={() => removeUser1(userMng)}
            handleCancelClick={() => setRemoveUserStep('startRemove')}
          />
        </Menu>
      ) : null}
    </div>
  );
}
// ------------------------------------------------------------------------------------

interface AddSelectionButtonProps<T> {
  className?: string;
  existUsers: Set<User>;
  ws: Workspace;
}
export default function AddSelectionButton<T>({
  className,
  existUsers,
  ws,
}: AddSelectionButtonProps<T>) {
  const styles = useStyles();
  const usersQuery = useSharedQuery('users');
  const users = useVertices(usersQuery.results) as User[];
  const [menuOpen, setMenuOpen] = useState(true);

  const onRowSelect = (user: User) => {
    ws.users.add(user);
  };

  const usersSet = new Set(users);

  const newUsersSet = new Set(
    [...usersSet].filter((user) => !existUsers.has(user))
  );

  return (
    menuOpen && (
      <Menu
        renderButton={() => (
          <BlueActionButton
            disable={false}
            buttonText={'Add'}
            imgSrc={'/icons/settings/InviteWhite.svg'}
          />
        )}
        position="right"
        align="start"
        direction="out"
        className={className}
        popupClassName={cn(styles.popup)}
      >
        <MemberPicker
          users={Array.from(newUsersSet).map((u) => u.manager)}
          onRowSelect={onRowSelect}
        />
      </Menu>
    )
  );
}

// ------------------------------------------------------------------------------------

interface DeleteConfirmWsButtonProps {
  wsMng: VertexManager<Workspace>;
}
export function DeleteConfirmWsButton({ wsMng }: DeleteConfirmWsButtonProps) {
  const styles = useStyles();
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLInputElement>(null);
  const [inputName, setInputName] = useState('');
  const [startConfirmation, setStartConfirmation] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const partialWS = usePartialVertex(wsMng, ['name']);
  const displayName = partialWS.name;
  const view = usePartialView('selectedWorkspaces');

  useEffect(() => {
    if (startConfirmation && inputRef.current) {
      inputRef.current.focus();
    }
  }, [startConfirmation]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        buttonRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setStartConfirmation(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setIsConfirmed(inputName === displayName);
  }, [inputName, displayName]);

  const handleDeleteWs = () => {
    if (!startConfirmation) {
      setStartConfirmation(true);
    } else if (isConfirmed && wsMng) {
      view.selectedWorkspaces.clear();
      wsMng.getVertexProxy().isDeleted = 1;
      setInputName('');
      setStartConfirmation(false);
      setIsConfirmed(false);
    } else {
      console.log("Name doesn't match, cannot delete.");
    }
  };

  return (
    <div className={cn(styles.deleteContainer)}>
      {startConfirmation && (
        <TextField
          value={inputName}
          onChange={(e) => setInputName(e.currentTarget.value)}
          className={cn(styles.deleteConfirmation)}
          placeholder="Type workspace name to confirm"
          ref={inputRef}
        />
      )}
      <DeleteWsButton
        key="DeleteWsButton"
        disabled={startConfirmation}
        isConfirmed={isConfirmed}
        onDeleteClick={handleDeleteWs}
        className={cn(styles.deleteWsButton)}
        ref={buttonRef}
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
        <AddSelectionButton ws={ws} existUsers={users} />
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

export function WsGeneralSettings() {
  const styles = tabsStyles();
  const graph = useGraphManager();
  const mgr = graph.getVertexManager<View>('ViewWsSettings');
  const partialView = usePartialVertex(mgr, ['selectedWorkspaces']);
  const ws = [...partialView.selectedWorkspaces][0];
  const wsV = useVertex(ws);
  const wsManager = ws?.manager;

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
          <DeleteConfirmWsButton wsMng={wsManager} />
        </div>
        <UsersList wsMng={wsManager} ws={ws} />
      </div>
    </div>
  );
}
