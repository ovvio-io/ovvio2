import React, {
  ChangeEvent,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'https://esm.sh/react@18.2.0';
import { encode as b32encode } from 'https://deno.land/std@0.170.0/encoding/base32.ts';
import { VertexManager } from '../../../../../cfds/client/graph/vertex-manager.ts';
import {
  User,
  Workspace,
} from '../../../../../cfds/client/graph/vertices/index.ts';
import { layout, styleguide } from '../../../../../styles/index.ts';
import { getColorForWorkspaceId } from '../../../../../styles/colors.ts';
import {
  Button,
  RaisedButton,
} from '../../../../../styles/components/buttons.tsx';
import {
  Dialog,
  DialogActions,
  DialogContent,
} from '../../../../../styles/components/dialog/index.tsx';
import {
  IconCamera,
  IconContactUs,
  IconDelete,
  IconOverflow,
} from '../../../../../styles/components/icons/index.ts';
import { TextField } from '../../../../../styles/components/inputs/index.ts';
import Menu, { MenuAction } from '../../../../../styles/components/menu.tsx';
import {
  Tab,
  TabButton,
  Tabs,
  TabsHeader,
} from '../../../../../styles/components/tabs/index.tsx';
import { H3, Text } from '../../../../../styles/components/texts.tsx';
import { toastContext } from '../../../../../styles/components/toast/index.tsx';
import { cn, makeStyles } from '../../../../../styles/css-objects/index.ts';
import { usePartialVertex } from '../../../core/cfds/react/vertex.ts';
import Avatar from '../../../shared/avatar/index.tsx';
import cropProfileImage from './crop-profile-image.ts';
import IconSettingsCog from './icon-settings-cog.tsx';
import TagsSettings from './tags-settings/index.tsx';
import { useLogger } from '../../../core/cfds/react/logger.tsx';
import {
  SettingsType,
  UISource,
} from '../../../../../logging/client-events.ts';
import { useCallback } from 'https://esm.sh/v96/@types/react@18.0.21/index.d.ts';

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

interface WorkspaceIconViewProps {
  icon: string;
}

function WorkspaceIconView({ icon }: WorkspaceIconViewProps) {
  const styles = useStyles();
  return (
    <div
      className={cn(styles.circle)}
      style={{ backgroundImage: `url("${icon}")` }}
    />
  );
}

interface UploadPhotoButtonProps {
  onImageSelected: (dataUrl: string) => void;
}

function UploadPhotoButton({ onImageSelected }: UploadPhotoButtonProps) {
  const styles = useStyles();
  const fileInput = useRef(null);
  const onFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) {
      return;
    }
    const f = files[0];
    if (!f) {
      return;
    }

    const { dataUrl } = await cropProfileImage(f);
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
  // const logger = useLogger();

  const onImageSelected = useCallback(
    (img: string) => {
      partial.icon = img;
    },
    [partial]
  );
  return (
    <div className={cn(styles.image, styles.bigImage, className)}>
      {partial.icon ? (
        <WorkspaceIconView icon={partial.icon} />
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
  const logger = useLogger();
  const name = partial.name;
  const onNameChanged = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      partial.name = e.target.value || '';
      logger.log({
        severity: 'INFO',
        event: 'MetadataChanged',
        type: 'name',
        vertex: partial.key,
        source: 'settings:workspace',
      });
    },
    [partial, logger]
  );
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
      {!userMng.isRoot && (
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
      )}
    </div>
  );
}

// interface InvitationItemProps {
//   invitationMng: VertexManager<Invite>;
//   removeInvitation: (rec: VertexManager<Invite>) => void;
// }
// function InvitationItem({
//   invitationMng,
//   removeInvitation,
// }: InvitationItemProps) {
//   const styles = useStyles();
//   const partialInv = usePartialVertex(invitationMng, ['invitee', 'email']);
//   const invText =
//     (partialInv.invitee && partialInv.invitee !== ''
//       ? `${partialInv.invitee} - `
//       : '') + 'Pending';

//   return (
//     <div className={cn(styles.user)}>
//       <div className={cn(styles.avatar, styles.invitationAvatar)}>
//         <IconContactUs fill="white" />
//       </div>
//       <div className={cn(styles.userInfo)}>
//         <Text className={cn(styles.uname)}>{invText}</Text>
//         <Text className={cn(styles.email)}>{partialInv.email}</Text>
//       </div>

//       <Menu
//         className={cn(styles.overflowIcon)}
//         renderButton={() => <IconOverflow />}
//         position="right"
//         align="start"
//         direction="in"
//       >
//         <MenuAction
//           IconComponent={IconDelete}
//           text="Delete Invitation"
//           onClick={() => removeInvitation(invitationMng)}
//         />
//       </Menu>
//     </div>
//   );
// }

interface UsersListProps {
  workspaceManager: VertexManager<Workspace>;
}
function UsersList({ workspaceManager }: UsersListProps) {
  const [toRemove, setToRemove] = useState<VertexManager<User> | undefined>(
    undefined
  );
  const [removeDisabled, setRemoveDisabled] = useState(false);
  const styles = useStyles();
  const { users } = usePartialVertex(workspaceManager, ['users']);
  const logger = useLogger();

  const onRemoveStarting = (v: VertexManager<User>) => {
    logger.log({
      severity: 'INFO',
      event: 'Start',
      flow: 'permissions',
      type: 'workspace',
      removed: v.key,
      source: 'settings:workspace',
      vertex: workspaceManager.key,
    });
    setToRemove(v);
  };

  const onRemoveClicked = () => {
    if (toRemove) {
      workspaceManager.getVertexProxy().users.delete(toRemove.getVertexProxy());
      logger.log({
        severity: 'INFO',
        event: 'End',
        flow: 'permissions',
        removed: toRemove.key,
        vertex: workspaceManager.key,
      });
      setToRemove(undefined);
    }
  };

  const userToRemove = usePartialVertex(toRemove, ['name', 'email']);

  return (
    <div className={cn(styles.usersList)}>
      <Dialog
        open={toRemove !== undefined}
        onClickOutside={() => setToRemove(undefined)}
      >
        <DialogContent>
          <H3>Remove from Workspace</H3>
          <Text>{`Are you sure you want to remove: ${
            userToRemove!.name
          }?`}</Text>
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
  const logger = useLogger();
  const [name, setName] = useState('');
  const inputRef = useRef();
  const [isDeleting, setIsDeleting] = useState(false);
  const displayName = partialWS.name;
  const canDelete = isDeleting && name === displayName;

  const onClick = () => {
    if (!isDeleting) {
      logger.log({
        severity: 'INFO',
        event: 'Start',
        flow: 'delete',
        type: 'workspace',
        source: 'settings:workspace',
        vertex: workspaceManager.key,
      });
      return setIsDeleting(true);
    }

    if (canDelete) {
      partialWS.isDeleted = 1;
      logger.log({
        severity: 'INFO',
        event: 'End',
        flow: 'delete',
        type: 'workspace',
        source: 'settings:workspace',
        vertex: workspaceManager.key,
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

  const logger = useLogger();

  const encodedKey = b32encode(new TextEncoder().encode(workspaceManager.key));

  const info = {
    enabled: true,
    // address: `ws-${encodedKey}@${config.emailDomain}`,
  };

  if (!info || !info.enabled) {
    return null;
  }
  // const copyToClipboard = () => {
  //   input.current.select();
  //   input.current.setSelectionRange(0, info.address.length);
  //   document.execCommand('copy');
  //   input.current.blur();
  //   toastProvider.displayToast({
  //     duration: 2000,
  //     text: 'Address copied!',
  //   });

  //   eventLogger.wsAction('WORKSPACE_EMAIL_COPIED', workspaceManager, {
  //     category: EventCategory.WS_SETTINGS,
  //   });
  // };
  return (
    <div className={cn(styles.emailIntegration)}>
      <Text className={cn(styles.label)}>Email Integration Address:</Text>
      {/*<Text onClick={copyToClipboard} ref={input}>
        {d.address}
      </Text>*/}
      {/* <TextField
        onClick={copyToClipboard}
        value={info.address}
        readOnly={true}
        ref={input}
      /> */}
    </div>
  );
}

interface WorkspaceSettingsViewProps {
  workspaceManager: VertexManager<Workspace>;
  closeDialog: () => void;
}
export function WorkspaceSettingsView({
  workspaceManager,
  closeDialog,
}: WorkspaceSettingsViewProps) {
  const styles = useStyles();
  const [inviteOpen, setInviteOpen] = useState(false);
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
        {showList && <UsersList workspaceManager={workspaceManager} />}
      </div>
      {/* <InvitationDialog
        open={inviteOpen}
        hide={() => setInviteOpen(false)}
        source="settings"
      /> */}
    </div>
  );
}

interface ButtonProps {
  close: () => void;
}

// function CancelButton({ close }: ButtonProps) {
//   const styles = useStyles();
//   const recordStore = useRecordStore();
//   const onCancel = () => {
//     recordStore.clear();
//     close();
//   };

//   return (
//     <Button
//       className={cn(styles.button, styles.cancelButton)}
//       onClick={onCancel}
//     >
//       Cancel
//     </Button>
//   );
// }

// function SaveButton({ close }: ButtonProps) {
//   const styles = useStyles();
//   const recordStore = useRecordStore();
//   const [isDirty, setIsDirty] = useState(
//     () => recordStore && recordStore.hasChanges()
//   );
//   useEffect(() => {
//     if (recordStore) {
//       return recordStore.listen((store) => {
//         setIsDirty(store.hasChanges());
//       });
//     }
//   }, [recordStore]);
//   const onSave = () => {
//     recordStore.commitChanges();
//     close();
//   };
//   return (
//     <Button
//       className={cn(styles.button, styles.saveButton)}
//       disabled={!isDirty}
//       onClick={onSave}
//     >
//       Save
//     </Button>
//   );
// }

export interface WorkspaceSettingsDialogProps {
  className?: string;
  workspaceManager: VertexManager<Workspace>;
  isOpen: boolean;
  hide: () => void;
  source?: UISource;
}
export default function WorkspaceSettingsDialog({
  className = '',
  workspaceManager,
  isOpen,
  hide,
  source,
}: WorkspaceSettingsDialogProps) {
  const styles = useStyles();
  const partial = usePartialVertex(workspaceManager, ['name']);
  //const workspace = useVertex(workspaceManager);

  const logger = useLogger();

  const [tab, setTab] = useState<SettingsType>('settings:workspace');
  useEffect(() => {
    setTab('settings:workspace');
  }, [isOpen]);

  const onTabSelected = (tabValue: SettingsType) => {
    logger.log({
      severity: 'INFO',
      event: 'Navigation',
      type: 'tab',
      source: tab,
      destination: tabValue,
      vertex: workspaceManager.key,
    });
  };

  return (
    <Dialog
      className={cn(styles.dialog, className)}
      open={isOpen}
      onClose={() => {
        logger.log({
          severity: 'INFO',
          event: 'Navigation',
          type: 'close',
          source: tab,
          vertex: workspaceManager.key,
        });
        hide();
      }}
      onOpen={() => {
        logger.log({
          severity: 'INFO',
          event: 'Navigation',
          type: 'open',
          destination: tab,
          source,
          vertex: workspaceManager.key,
        });
      }}
    >
      {/* <ChangeStoreProvider> */}
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
          <TabButton
            value={'settings:workspace' as SettingsType}
            onSelected={onTabSelected}
          >
            General Settings
          </TabButton>
          <TabButton
            value={'settings:tags' as SettingsType}
            onSelected={onTabSelected}
          >
            Tags Settings
          </TabButton>
        </TabsHeader>
        <Tabs selectedTab={tab}>
          <Tab
            value={'settings:workspace' as SettingsType}
            className={cn(styles.tab)}
          >
            <WorkspaceSettingsView
              workspaceManager={workspaceManager}
              closeDialog={hide}
            />
          </Tab>
          <Tab
            value={'settings:tags' as SettingsType}
            className={cn(styles.tab)}
          >
            <TagsSettings workspaceManager={workspaceManager} />
          </Tab>
        </Tabs>
      </DialogContent>
      {/* <DialogActions className={cn(styles.actions)}> */}
      {/* <Feature id={Features.ExportDemoData}>
            <Button
              className={cn(styles.button, styles.cancelButton)}
              onClick={() => {
                exportWorkspace(workspaceManager.graph, workspaceManager.key);
              }}
            >
              Export Demo Data
            </Button>
          </Feature> */}
      {/* <CancelButton
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
          /> */}
      {/* </DialogActions> */}
      {/* </ChangeStoreProvider> */}
    </Dialog>
  );
}

// function exportWorkspace(graph: GraphManager, wsId: string): void {
//   const jsonString = prettyJSON(graph.exportSubGraph(wsId, 1));
//   const url = window.URL.createObjectURL(
//     new Blob([jsonString], { type: 'text/json' })
//   );
//   const a = document.createElement('a');
//   a.style.display = 'none';
//   a.href = url;
//   // the filename you want
//   a.download = wsId + '.json';
//   document.body.appendChild(a);
//   a.click();
//   window.URL.revokeObjectURL(url);
//   a.remove();
// }
