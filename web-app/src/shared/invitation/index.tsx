import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { User, Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import React, {
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import InvitationDialog from 'shared/invitation-dialog';

export interface InvitationOptions {
  workspace: VertexManager<Workspace>;
}

export interface UserInvited {
  userInvited: true;
  users: VertexManager<User>[];
}

export interface InvitationCancelled {
  userInvited: false;
}

type InvitationResult = UserInvited | InvitationCancelled;

interface InvitationContext {
  openInvite(opts: InvitationOptions): Promise<InvitationResult>;
}

const invitationContext = React.createContext<InvitationContext>(null);

export function useInvitations(): InvitationContext {
  const ctx = useContext(invitationContext);
  if (!ctx) {
    throw new Error('useInvitations must be called inside InvitationsProvider');
  }

  return ctx;
}

export interface InvitationsProviderProps {}

export function InvitationsProvider({
  children,
}: PropsWithChildren<InvitationsProviderProps>) {
  const [open, setOpen] = useState(false);
  const [workspaceManager, setWorkspaceManager] =
    useState<VertexManager<Workspace>[]>(null);
  const onDialogClosed = useRef((users?: VertexManager<User>[]) => {});
  const hide = useCallback(() => {
    onDialogClosed.current();
    setOpen(false);
  }, [setOpen]);
  const onUsersInvited = useCallback(
    users => onDialogClosed.current(users),
    []
  );

  const ctx = useMemo<InvitationContext>(() => {
    return {
      openInvite({ workspace }) {
        return new Promise((resolve, reject) => {
          setWorkspaceManager([workspace]);
          setOpen(true);
          onDialogClosed.current = (users: VertexManager<User>[]) => {
            const result: InvitationResult =
              users && users.length
                ? {
                    userInvited: true,
                    users,
                  }
                : {
                    userInvited: false,
                  };
            onDialogClosed.current = () => {};
            resolve(result);
          };
        });
      },
    };
  }, []);

  return (
    <invitationContext.Provider value={ctx}>
      {children}
      {workspaceManager && (
        <InvitationDialog
          open={open}
          workspaces={workspaceManager}
          hide={hide}
          onUsersInvited={onUsersInvited}
        />
      )}
    </invitationContext.Provider>
  );
}
