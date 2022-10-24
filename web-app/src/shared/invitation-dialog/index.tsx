import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { layout, styleguide } from '@ovvio/styles/lib';
import { Dialog } from '@ovvio/styles/lib/components/dialog';
import { useEventLogger } from 'core/analytics';
import { User, Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { InviteForm } from 'shared/invite-form';

const useStyles = makeStyles(theme => ({
  text: {
    fontWeight: 'normal',
    lineHeight: '1.42',
    marginBottom: styleguide.gridbase,
    padding: [0, styleguide.gridbase],
  },
  form: {
    basedOn: [layout.column],
  },
  textField: {
    marginBottom: styleguide.gridbase,
  },
  error: {
    color: 'red',
  },
  header: {
    marginTop: styleguide.gridbase * 2,
    textAlign: 'center',
  },
  dialog: {
    width: styleguide.gridbase * 70,
    maxWidth: `~calc(100vw - ${styleguide.gridbase * 2})`,
  },
  content: {
    maxWidth: styleguide.gridbase * 40,
    margin: [0, 'auto'],
  },
  sendButton: {
    height: styleguide.gridbase * 5,
    borderRadius: styleguide.gridbase * 2.5,
    padding: [styleguide.gridbase, styleguide.gridbase * 4],
    processing: {
      padding: styleguide.gridbase,
    },
  },
  processing: {},
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colleaguesIllustration: {
    margin: [styleguide.gridbase * 3, 0],
  },
  illustration: {
    alignSelf: 'center',
  },
  sent: {
    marginTop: styleguide.gridbase * 7,
  },
}));

interface InvitationDialogViewProps {
  workspaces: VertexManager<Workspace>[];
  open: any;
  hide: () => void;
  source?: string;
  onUsersInvited?: (users: VertexManager<User>[]) => void;
}
export default function InvitationDialog({
  workspaces,
  open,
  hide,
  source,
  onUsersInvited,
}: InvitationDialogViewProps) {
  const styles = useStyles();
  const eventLogger = useEventLogger();

  const onClose = (closeSource: string) => {
    eventLogger.action('WORKSPACE_INVITE_SCREEN_CLOSED', {
      source: closeSource,
    });
    // if (onUserInvited && inviteUser !== undefined) {
    //   onUserInvited(inviteUser);
    // }
    hide();
  };

  return (
    <Dialog
      open={open}
      onClickOutside={() => onClose('click-outside')}
      className={cn(styles.dialog)}
      onOpen={() => {
        eventLogger.action('WORKSPACE_INVITE_SCREEN_ENTERED', {
          source,
        });
      }}
      onClose={() => onClose('click-close')}
    >
      <InviteForm
        close={hide}
        source={source}
        workspaces={workspaces}
        onUsersInvited={onUsersInvited}
      />
    </Dialog>
  );
}
// export default InvitationDialogView;
