import { prettyJSON } from '@ovvio/base/lib/utils';
import { NS_USERS } from '@ovvio/cfds';
import { InviteStatus } from '@ovvio/cfds/lib/base/scheme-types';
import { GraphManager } from '@ovvio/cfds/lib/client/graph/graph-manager';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Invite, User, Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { layout, styleguide } from '@ovvio/styles/lib';
import { getColorForWorkspaceId } from '@ovvio/styles/lib/colors';
import { Button, RaisedButton } from '@ovvio/styles/lib/components/buttons';
import {
  Dialog,
  DialogActions,
  DialogContent,
} from '@ovvio/styles/lib/components/dialog';
import {
  IconCamera,
  IconContactUs,
  IconDelete,
  IconOverflow,
} from '@ovvio/styles/lib/components/icons';
import { TextField } from '@ovvio/styles/lib/components/inputs';
import Menu, { MenuAction } from '@ovvio/styles/lib/components/menu';
import {
  Tab,
  TabButton,
  Tabs,
  TabsHeader,
} from '@ovvio/styles/lib/components/tabs';
import { H3, Text } from '@ovvio/styles/lib/components/texts';
import { toastContext } from '@ovvio/styles/lib/components/toast';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import RestClient from 'api';
import base32 from 'base32';
import { EventCategory, useEventLogger } from 'core/analytics';
import { useCfdsContext } from 'core/cfds/react/graph';
import { useQuery } from 'core/cfds/react/query';
import { usePartialVertex } from 'core/cfds/react/vertex';
import config from 'core/config';
import { Feature, Features } from 'core/feature-toggle';
import {
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Avatar from 'shared/avatar';
import InvitationDialog from 'shared/invitation-dialog';
import {
  ChangeStoreProvider,
  useChangeRecord,
  useRecordStore,
} from './change-store';
import cropProfileImage from './crop-profile-image';
import IconSettingsCog from './icon-settings-cog';
import TagsSettings from './tags-settings';

export { IconSettingsCog };

const useStyles = makeStyles((theme) => ({
  tab: {
    height: styleguide.gridbase * 49,
    overflowY: 'auto',
    basedOn: [layout.column],
  },
  settings: {
    backgroundColor: theme.background[0],
    width: '100%',
    boxSizing: 'border-box',
    padding: [styleguide.gridbase * 4, styleguide.gridbase * 4],
    // height: styleguide.gridbase * 78.5,

    // alignItems: 'center',
    alignItems: 'stretch',
    justifyContent: 'center',
    basedOn: [layout.row],
    position: 'relative',
  },
  column: {
    width: styleguide.gridbase * 43,
    padding: [0, styleguide.gridbase * 2],
    boxSizing: 'border-box',
    flexShrink: 1,
  },
  row: {
    basedOn: [layout.row],
  },
  image: {
    width: styleguide.gridbase * 10,
    height: styleguide.gridbase * 10,
    position: 'relative',
    basedOn: [layout.column, layout.centerCenter],
    marginBottom: styleguide.gridbase,
  },
  bigImage: {
    marginTop: styleguide.gridbase,
  },
  circle: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
    basedOn: [layout.column, layout.centerCenter],
  },
  placeholderLetter: {
    fontSize: 50,
    color: 'white',
  },
  fields: {
    basedOn: [layout.column],
  },
  uploadPhoto: {
    position: 'absolute',
    bottom: -styleguide.gridbase / 2,
    right: 0,
    width: styleguide.gridbase * 4,
    height: styleguide.gridbase * 4,
    borderRadius: '50%',
    backgroundColor: theme.background[0],
    transform: 'translateX(50%)',
    basedOn: [layout.column, layout.centerCenter],
  },
  uploadBtn: {
    width: styleguide.gridbase * 3,
    height: styleguide.gridbase * 3,
    borderRadius: '50%',
    boxShadow: '0 1px 3px 0 rgba(156, 178, 205, 0.7)',
  },
  label: {
    fontSize: 14,
    color: '#9cb2cd',
  },
  members: {
    flexShrink: 0,
    flexGrow: 1,
    placeSelf: 'flex-end',
  },
  nameField: {
    marginTop: styleguide.gridbase,
    alignSelf: 'stretch',
  },
  usersList: {
    height: styleguide.gridbase * 37,
    marginTop: styleguide.gridbase,
    alignSelf: 'stretch',
    overflowY: 'auto',
    borderRadius: 4,
    border: 'solid 1px #a8bbd3',
  },
  user: {
    height: styleguide.gridbase * 6,
    padding: styleguide.gridbase,
    backgroundColor: theme.background[0],
    transition: `background-color ${styleguide.transition.duration.short}ms linear`,
    boxSizing: 'border-box',
    ':hover': {
      backgroundColor: theme.background[300],
      overflowIcon: {
        opacity: 1,
      },
    },
    alignItems: 'center',
    basedOn: [layout.row],
  },
  avatar: {
    marginRight: styleguide.gridbase,
  },
  invitationAvatar: {
    width: styleguide.gridbase * 4,
    height: styleguide.gridbase * 4,
    borderRadius: '50%',
    backgroundColor: '#9cb2cd',
    basedOn: [layout.column, layout.centerCenter],
  },
  userInfo: {
    padding: [2, 0],
    basedOn: [layout.column, layout.flexSpacer],
  },
  uname: {
    fontSize: 13,
    lineHeight: '15px',
  },
  email: {
    fontSize: 12,
    lineHeight: '14px',
    color: '#779ac5',
  },
  overflowIcon: {
    opacity: 0,
  },
  deleteContainer: {
    alignItems: 'stretch',
    alignSelf: 'stretch',
    basedOn: [layout.column],
  },
  deleteBtn: {
    backgroundColor: 'rgba(197, 212, 230, 0.18)',
    color: '#9cb2cd',
    ':hover': {
      ':not(disabled)': {
        backgroundColor: 'rgba(197, 212, 230, 0.18)',
      },
    },
    ':disabled': {
      backgroundColor: 'rgba(197, 212, 230, 0.18)',
    },
  },
  canDelete: {
    backgroundColor: '#fe4a62dd',
    ':hover': {
      ':not(disabled)': {
        backgroundColor: '#fe4a62',
      },
    },
    color: 'white',
  },
  deleteConfirmation: {
    marginBottom: styleguide.gridbase,
  },
  emailIntegration: {
    alignSelf: 'stretch',
    alignItems: 'stretch',
    boxSizing: 'border-box',
    margin: [styleguide.gridbase * 2, 0],

    basedOn: [layout.column],
  },
  dialog: {
    maxWidth: styleguide.gridbase * 98,
    padding: 0,
  },
  dialogHeader: {
    width: '100%',
    height: styleguide.gridbase * 14,
    boxSizing: 'border-box',
    backgroundColor: 'rgba(17, 8, 43, 0.8)',
    alignItems: 'center',
    padding: styleguide.gridbase * 4,
    basedOn: [layout.row],
    fontFamily: 'Poppins',
  },
  headerImage: {
    width: styleguide.gridbase * 6,
    height: styleguide.gridbase * 6,
    padding: styleguide.gridbase,
    boxSizing: 'border-box',
    marginTop: 0,
    marginBottom: 0,
    marginRight: styleguide.gridbase,
    placeholderLetter: {
      fontSize: 18,
    },
  },
  headerText: {
    fontSize: 20,
    color: 'white',
  },
  actions: {
    height: styleguide.gridbase * 10.5,
    flexShrink: 0,
    boxSizing: 'border-box',
    backgroundColor: 'rgba(229, 238, 254, 0.3)',
    alignItems: 'center',
    padding: [styleguide.gridbase * 4, styleguide.gridbase * 3],
  },
  button: {
    height: styleguide.gridbase * 4.5,
    minWidth: styleguide.gridbase * 12,
    borderRadius: 6,
    basedOn: [layout.row, layout.centerCenter],
  },
  saveButton: {
    color: 'white',
    backgroundColor: theme.primary[500],
    transitionDuration: `${styleguide.transition.duration.short}ms`,
    transitionProperty: 'background-color',
    transitionTimingFunction: 'linear',
    ':hover': {
      backgroundColor: theme.primary[400],
    },
    ':active': {
      backgroundColor: '#f94c00',
    },
    ':disabled': {
      backgroundColor: '#c8c9d4',
    },
  },
  cancelButton: {
    color: 'rgba(17, 8, 43, 0.7)',
    border: 'solid 2px rgba(17, 8, 43, 0.2)',
  },
}));

interface WorkspacePlaceholderProps {
  workspaceManager: VertexManager<Workspace>;
}

function WorkspacePlaceholder({ workspaceManager }: WorkspacePlaceholderProps) {
  const styles = useStyles();
  const partial = usePartialVertex(workspaceManager, ['name']);

  return (
    <div
      className={cn(styles.circle)}
      style={{
        backgroundColor: getColorForWorkspaceId(workspaceManager.key),
      }}
    >
      <span className={cn(styles.placeholderLetter)}>
        {partial.name[0].toUpperCase()}
      </span>
    </div>
  );
}

function WorkspaceIconView({ icon }) {
  const styles = useStyles();
  return (
    <div
      className={cn(styles.circle)}
      style={{ backgroundImage: `url("${icon}")` }}
    />
  );
}

function UploadPhotoButton({ onImageSelected }) {
  const styles = useStyles();
  const fileInput = useRef();
  const onFileSelected = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }

    const { dataUrl } = await cropProfileImage(file);
    onImageSelected(dataUrl);
  };
  return (
    <div className={cn(styles.uploadPhoto)}>
      <Button
        className={cn(styles.uploadBtn)}
        onClick={() => (fileInput.current as any).click()}
      >
        <IconCamera />
      </Button>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onFileSelected}
      />
    </div>
  );
}

interface WorkspaceImageViewProps {
  workspaceManager: VertexManager<Workspace>;
  className?: string;
  isEditable?: boolean;
}
function WorkspaceImageView({
  workspaceManager,
  className,
  isEditable = true,
}: WorkspaceImageViewProps) {
  const styles = useStyles();
  const partial = usePartialVertex(workspaceManager, ['icon']);
  const eventLogger = useEventLogger();

  const record = useChangeRecord(`${workspaceManager.key}-icon`, (r) => {
    const newIcon = r.get('icon');
    if (newIcon) {
      partial.icon = newIcon;
      eventLogger.wsAction('WORKSPACE_ICON_CHANGED', workspaceManager, {
        category: EventCategory.WS_SETTINGS,
      });
    }
  });
  const icon = record.get('icon') || partial.icon;
  const onImageSelected = (img) => {
    record.set('icon', img);
  };
  return (
    <div className={cn(styles.image, styles.bigImage, className)}>
      {icon ? (
        <WorkspaceIconView icon={icon} />
      ) : (
        <WorkspacePlaceholder workspaceManager={workspaceManager} />
      )}
      {isEditable && <UploadPhotoButton onImageSelected={onImageSelected} />}
    </div>
  );
}

interface NameFieldProps {
  workspaceManager: VertexManager<Workspace>;
}
function NameField({ workspaceManager }: NameFieldProps) {
  const styles = useStyles();
  const partial = usePartialVertex(workspaceManager, ['name']);
  const eventLogger = useEventLogger();
  const record = useChangeRecord(`${workspaceManager.key}-name`, (rec) => {
    const name = rec.get('name');
    if (name) {
      partial.name = name;
      eventLogger.wsAction('WORKSPACE_NAME_CHANGED', workspaceManager, {
        category: EventCategory.WS_SETTINGS,
      });
    }
  });
  const name = record.get('name') || partial.name;
  const onNameChanged = (e) => {
    record.set('name', e.target.value);
  };
  return (
    <TextField
      value={name}
      onChange={onNameChanged}
      className={cn(styles.nameField)}
    />
  );
}

interface UserItemProps {
  userMng: VertexManager<User>;
  removeUser: (rec: VertexManager<User>) => void;
}
function UserItem({ userMng, removeUser }: UserItemProps) {
  const styles = useStyles();
  const partialUser = usePartialVertex(userMng, ['name', 'email']);

  return (
    <div className={cn(styles.user)}>
      <Avatar user={userMng} size="big" className={cn(styles.avatar)} />
      <div className={cn(styles.userInfo)}>
        <Text className={cn(styles.uname)}>{partialUser.name}</Text>
        <Text className={cn(styles.email)}>{partialUser.email}</Text>
      </div>
      {/* {!userMng.isRoot && ( */}
      <Menu
        className={cn(styles.overflowIcon)}
        renderButton={() => <IconOverflow />}
        position="right"
        align="start"
        direction="in"
      >
        <MenuAction
          IconComponent={IconDelete}
          text="Remove From Workspace"
          onClick={() => removeUser(userMng)}
        />
      </Menu>
      {/* )} */}
    </div>
  );
}

interface InvitationItemProps {
  invitationMng: VertexManager<Invite>;
  removeInvitation: (rec: VertexManager<Invite>) => void;
}
function InvitationItem({
  invitationMng,
  removeInvitation,
}: InvitationItemProps) {
  const styles = useStyles();
  const partialInv = usePartialVertex(invitationMng, ['invitee', 'email']);
  const invText =
    (partialInv.invitee && partialInv.invitee !== ''
      ? `${partialInv.invitee} - `
      : '') + 'Pending';

  return (
    <div className={cn(styles.user)}>
      <div className={cn(styles.avatar, styles.invitationAvatar)}>
        <IconContactUs fill="white" />
      </div>
      <div className={cn(styles.userInfo)}>
        <Text className={cn(styles.uname)}>{invText}</Text>
        <Text className={cn(styles.email)}>{partialInv.email}</Text>
      </div>

      <Menu
        className={cn(styles.overflowIcon)}
        renderButton={() => <IconOverflow />}
        position="right"
        align="start"
        direction="in"
      >
        <MenuAction
          IconComponent={IconDelete}
          text="Delete Invitation"
          onClick={() => removeInvitation(invitationMng)}
        />
      </Menu>
    </div>
  );
}

interface UsersListProps {
  workspaceManager: VertexManager<Workspace>;
  removeUser: (user: VertexManager<User>) => Promise<void>;
  removeInvitation: (invite: VertexManager<Invite>) => void;
}
function UsersList({
  workspaceManager,
  removeUser,
  removeInvitation,
}: UsersListProps) {
  const [vToRemove, setVToRemove] = useState<
    VertexManager<User | Invite> | undefined
  >(undefined);
  const [removeDisabled, setRemoveDisabled] = useState(false);
  const styles = useStyles();
  const { users } = usePartialVertex(workspaceManager, ['users']);
  // const { results: invitations } = useQuery<Invite>(
  //   x =>
  //     x instanceof Invite &&
  //     x.status === InviteStatus.PENDING &&
  //     x.workspaceKey === workspaceManager.key,
  //   [workspaceManager?.key]
  // );
  const eventLogger = useEventLogger();

  const onRemoveStarting = (v: VertexManager<User | Invite>) => {
    eventLogger.wsAction(
      'WORKSPACE_REMOVE_USER_DIALOG_OPENED',
      workspaceManager,
      {
        category: EventCategory.WS_SETTINGS,
      }
    );
    setVToRemove(v);
  };

  const onRemoveClicked = async () => {
    if (vToRemove) {
      setRemoveDisabled(true);
      try {
        if (vToRemove.namespace === NS_USERS) {
          await removeUser(vToRemove as VertexManager<User>);
        } else {
          removeInvitation(vToRemove as VertexManager<Invite>);
        }
      } finally {
        setRemoveDisabled(false);
        setVToRemove(undefined);
      }
    }
  };

  let identifier: string | undefined;
  if (vToRemove) {
    if (vToRemove.namespace === NS_USERS) {
      identifier = (vToRemove.getVertexProxy() as User).name;
    } else {
      identifier = (vToRemove.getVertexProxy() as Invite).email;
    }
  }

  return (
    <div className={cn(styles.usersList)}>
      <Dialog
        open={vToRemove !== undefined}
        onClickOutside={() => setVToRemove(undefined)}
      >
        <DialogContent>
          <H3>Remove from Workspace</H3>
          <Text>{`Are you sure you want to remove: ${identifier}?`}</Text>
        </DialogContent>
        <DialogActions>
          <RaisedButton disabled={removeDisabled} onClick={onRemoveClicked}>
            Remove
          </RaisedButton>
        </DialogActions>
      </Dialog>
      {Array.from(users).map((u) => (
        <UserItem
          userMng={u.manager as VertexManager<User>}
          key={u.key}
          removeUser={onRemoveStarting}
        />
      ))}
      {invitations.map((i) => (
        <InvitationItem
          invitationMng={i as VertexManager<Invite>}
          key={i.key}
          removeInvitation={onRemoveStarting}
        />
      ))}
    </div>
  );
}

interface DeleteWorkspaceButtonProps {
  workspaceManager: VertexManager<Workspace>;
  onDeleted: () => void;
}
function DeleteWorkspaceButton({
  workspaceManager,
  onDeleted,
}: DeleteWorkspaceButtonProps) {
  const styles = useStyles();
  const partialWS = usePartialVertex(workspaceManager, ['name', 'isDeleted']);
  const eventLogger = useEventLogger();
  const [name, setName] = useState('');
  const inputRef = useRef();
  const [isDeleting, setIsDeleting] = useState(false);
  const displayName = partialWS.name;
  const canDelete = isDeleting && name === displayName;

  const onClick = () => {
    if (!isDeleting) {
      eventLogger.wsAction('WORKSPACE_DELETE_STARTED', workspaceManager, {
        category: EventCategory.WS_SETTINGS,
      });
      return setIsDeleting(true);
    }

    if (canDelete) {
      partialWS.isDeleted = 1;
      eventLogger.wsAction('WORKSPACE_DELETE_COMPLETED', workspaceManager, {
        category: EventCategory.WS_SETTINGS,
      });
      onDeleted();
    }
  };

  useEffect(() => {
    if (isDeleting && inputRef.current) {
      (inputRef.current as any).focus();
    }
  }, [isDeleting]);

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
      <RaisedButton
        disabled={isDeleting && name !== displayName}
        onClick={onClick}
        className={cn(styles.deleteBtn, canDelete && styles.canDelete)}
      >
        Delete Workspace
      </RaisedButton>
    </div>
  );
}

interface EmailIntegrationViewProps {
  workspaceManager: VertexManager<Workspace>;
}
function EmailIntegrationView({ workspaceManager }: EmailIntegrationViewProps) {
  const styles = useStyles();
  const toastProvider = useContext(toastContext);
  const input = useRef<any>();

  const eventLogger = useEventLogger();

  const info = {
    enabled: true,
    address: `ws-${base32.encode(workspaceManager.key)}@${config.emailDomain}`,
  };

  if (!info || !info.enabled) {
    return null;
  }
  const copyToClipboard = () => {
    input.current.select();
    input.current.setSelectionRange(0, info.address.length);
    document.execCommand('copy');
    input.current.blur();
    toastProvider.displayToast({
      duration: 2000,
      text: 'Address copied!',
    });

    eventLogger.wsAction('WORKSPACE_EMAIL_COPIED', workspaceManager, {
      category: EventCategory.WS_SETTINGS,
    });
  };
  return (
    <div className={cn(styles.emailIntegration)}>
      <Text className={cn(styles.label)}>Email Integration Address:</Text>
      {/*<Text onClick={copyToClipboard} ref={input}>
        {info.address}
      </Text>*/}
      <TextField
        onClick={copyToClipboard}
        value={info.address}
        readOnly={true}
        ref={input}
      />
    </div>
  );
}

interface WorkspaceSettingsViewProps {
  workspaceManager: VertexManager<Workspace>;
  closeDialog: () => void;
}
export function WorkspaceSettingsView({
  // ----------------------------------------------------------------------------------------------------------------------------------------------------------------
  workspaceManager,
  closeDialog,
}: WorkspaceSettingsViewProps) {
  const styles = useStyles();
  const cfdsContext = useCfdsContext();
  const workspaces = useMemo(() => [workspaceManager], [workspaceManager]);
  const eventLogger = useEventLogger();

  const [inviteOpen, setInviteOpen] = useState(false);

  const removeUser = async (userMng: VertexManager<User>) => {
    if (cfdsContext.user) {
      eventLogger.wsAction('WORKSPACE_REMOVE_USER_STARTED', workspaceManager, {
        category: EventCategory.WS_SETTINGS,
        selectedUserId: userMng.key,
      });

      const rest = new RestClient(cfdsContext.user);
      try {
        await rest.delete(
          `/workspaces/${workspaceManager.key}/users/${userMng.key}`
        );

        eventLogger.wsAction(
          'WORKSPACE_REMOVE_USER_COMPLETED',
          workspaceManager,
          {
            category: EventCategory.WS_SETTINGS,
            selectedUserId: userMng.key,
          }
        );

        await workspaceManager.scheduleSync();
        await userMng.scheduleSync();
      } catch (err) {
        eventLogger.wsError(err, workspaceManager, {
          origin: 'WORKSPACE_REMOVE_USER',
          category: EventCategory.WS_SETTINGS,
        });
      }
    }
  };

  const removeInvitation = (inviteMng: VertexManager<Invite>) => {
    const invite = inviteMng.getVertexProxy();
    invite.isDeleted = 1;
    eventLogger.wsAction(
      'WORKSPACE_REMOVE_INVITE_COMPLETED',
      workspaceManager,
      {
        category: EventCategory.WS_SETTINGS,
        data: {
          inviteId: inviteMng.key,
        },
      }
    );
  };

  const [showList, setShowList] = useState(false);
  useLayoutEffect(() => {
    setShowList(true);
  }, []);

  const onWorkspaceDeleted = () => {
    closeDialog();
  };

  return (
    <div className={cn(styles.settings)} onClick={(e) => e.stopPropagation()}>
      <div className={cn(styles.column, styles.fields)}>
        <Text className={cn(styles.label)}>Workspace Icon:</Text>
        <WorkspaceImageView workspaceManager={workspaceManager} />
        <Text className={cn(styles.label)}>Name your workspace</Text>
        <NameField workspaceManager={workspaceManager} />
        <EmailIntegrationView workspaceManager={workspaceManager} />
        <DeleteWorkspaceButton
          workspaceManager={workspaceManager}
          onDeleted={onWorkspaceDeleted}
        />
      </div>
      <div className={cn(styles.column)}>
        <div className={cn(styles.row)}>
          <Text className={cn(styles.label, styles.members)}>Members:</Text>
          <RaisedButton onClick={() => setInviteOpen(true)}>
            Invite
          </RaisedButton>
        </div>
        {showList && (
          <UsersList
            workspaceManager={workspaceManager}
            removeUser={removeUser}
            removeInvitation={removeInvitation}
          />
        )}
      </div>
      <InvitationDialog
        workspaces={workspaces}
        open={inviteOpen}
        hide={() => setInviteOpen(false)}
        source="ws-settings"
      />
    </div>
  );
}

function CancelButton({ close }) {
  const styles = useStyles();
  const recordStore = useRecordStore();
  const onCancel = () => {
    recordStore.clear();
    close();
  };

  return (
    <Button
      className={cn(styles.button, styles.cancelButton)}
      onClick={onCancel}
    >
      Cancel
    </Button>
  );
}

function SaveButton({ close }) {
  const styles = useStyles();
  const recordStore = useRecordStore();
  const [isDirty, setIsDirty] = useState(
    () => recordStore && recordStore.hasChanges()
  );
  useEffect(() => {
    if (recordStore) {
      return recordStore.listen((store) => {
        setIsDirty(store.hasChanges());
      });
    }
  }, [recordStore]);
  const onSave = () => {
    recordStore.commitChanges();
    close();
  };
  return (
    <Button
      className={cn(styles.button, styles.saveButton)}
      disabled={!isDirty}
      onClick={onSave}
    >
      Save
    </Button>
  );
}

const TABS = {
  WS_SETTINGS: 'WS_SETTINGS',
  TAGS_SETTINGS: 'TAGS_SETTINGS',
};

export interface WorkspaceSettingsDialogProps {
  className?: string;
  workspaceManager: VertexManager<Workspace>;
  isOpen: boolean;
  hide: () => void;
}
export default function WorkspaceSettingsDialog({
  className = '',
  workspaceManager,
  isOpen,
  hide,
}: WorkspaceSettingsDialogProps) {
  const styles = useStyles();
  const partial = usePartialVertex(workspaceManager, ['name']);
  //const workspace = useVertex(workspaceManager);

  const eventLogger = useEventLogger();

  const [tab, setTab] = useState(TABS.WS_SETTINGS);

  useEffect(() => {
    setTab(TABS.WS_SETTINGS);
  }, [isOpen]);

  const onTabSelected = (tabValue: string) => {
    if (tabValue === TABS.TAGS_SETTINGS) {
      eventLogger.wsAction(
        'WORKSPACE_SETTINGS_TAGS_TAB_CLICKED',
        workspaceManager,
        {
          category: EventCategory.WS_SETTINGS,
        }
      );
    } else if (tabValue === TABS.WS_SETTINGS) {
      eventLogger.wsAction(
        'WORKSPACE_SETTINGS_WS_TAB_CLICKED',
        workspaceManager,
        {
          category: EventCategory.WS_SETTINGS,
        }
      );
    }
  };

  return (
    <Dialog
      className={cn(styles.dialog, className)}
      open={isOpen}
      onClose={() => {
        eventLogger.wsAction('WORKSPACE_SETTINGS_CLOSED', workspaceManager, {
          category: EventCategory.WS_SETTINGS,
        });
        hide();
      }}
      onOpen={() => {
        eventLogger.wsAction('WORKSPACE_SETTINGS_ENTERED', workspaceManager, {
          category: EventCategory.WS_SETTINGS,
        });
      }}
    >
      <ChangeStoreProvider>
        <DialogContent>
          <div className={cn(styles.dialogHeader)}>
            <WorkspaceImageView
              workspaceManager={workspaceManager}
              className={cn(styles.headerImage)}
              isEditable={false}
            />
            <Text className={cn(styles.headerText)}>
              {partial && partial.name}
            </Text>
          </div>
          <TabsHeader selected={tab} setSelected={setTab}>
            <TabButton value={TABS.WS_SETTINGS} onSelected={onTabSelected}>
              General Settings
            </TabButton>
            <TabButton value={TABS.TAGS_SETTINGS} onSelected={onTabSelected}>
              Tags Settings
            </TabButton>
          </TabsHeader>
          <Tabs selectedTab={tab}>
            <Tab value={TABS.WS_SETTINGS} className={cn(styles.tab)}>
              <WorkspaceSettingsView
                workspaceManager={workspaceManager}
                closeDialog={hide}
              />
            </Tab>
            <Tab value={TABS.TAGS_SETTINGS} className={cn(styles.tab)}>
              <TagsSettings workspaceManager={workspaceManager} />
            </Tab>
          </Tabs>
        </DialogContent>
        <DialogActions className={cn(styles.actions)}>
          <Feature id={Features.ExportDemoData}>
            <Button
              className={cn(styles.button, styles.cancelButton)}
              onClick={() => {
                exportWorkspace(workspaceManager.graph, workspaceManager.key);
              }}
            >
              Export Demo Data
            </Button>
          </Feature>
          <CancelButton
            close={() => {
              eventLogger.wsAction(
                'WORKSPACE_SETTINGS_CANCELED',
                workspaceManager,
                {
                  category: EventCategory.WS_SETTINGS,
                }
              );
              hide();
            }}
          />
          <SaveButton
            close={() => {
              eventLogger.wsAction(
                'WORKSPACE_SETTINGS_SAVED',
                workspaceManager,
                {
                  category: EventCategory.WS_SETTINGS,
                }
              );
              hide();
            }}
          />
        </DialogActions>
      </ChangeStoreProvider>
    </Dialog>
  );
}

function exportWorkspace(graph: GraphManager, wsId: string): void {
  const jsonString = prettyJSON(graph.exportSubGraph(wsId, 1));
  const url = window.URL.createObjectURL(
    new Blob([jsonString], { type: 'text/json' })
  );
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  // the filename you want
  a.download = wsId + '.json';
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}
