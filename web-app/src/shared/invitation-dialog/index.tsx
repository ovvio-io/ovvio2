import React, { useCallback } from 'https://esm.sh/react@18.2.0';
import { makeStyles, cn } from '../../../../styles/css-objects/index.ts';
import { layout, styleguide } from '../../../../styles/index.ts';
import { Dialog } from '../../../../styles/components/dialog/index.tsx';
import { User } from '../../../../cfds/client/graph/vertices/user.ts';
import { VertexManager } from '../../../../cfds/client/graph/vertex-manager.ts';
import { InviteForm } from '../invite-form/index.tsx';
import { useLogger } from '../../core/cfds/react/logger.tsx';
import { UISource } from '../../../../logging/client-events.ts';

const useStyles = makeStyles((theme) => ({
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
  open: any;
  hide: () => void;
  source?: UISource;
  onUsersInvited?: (users: VertexManager<User>[]) => void;
}
// export default function InvitationDialog({
//   open,
//   hide,
//   source,
//   onUsersInvited,
// }: InvitationDialogViewProps) {
//   const styles = useStyles();
//   const logger = useLogger();

//   const onClose = useCallback(
//     (closeSource: UISource) => {
//       logger.log({
//         severity: 'INFO',
//         event: 'End',
//         flow: 'invite',
//         source: source,
//         type: 'workspace',
//       }); // if (onUserInvited && inviteUser !== undefined) {
//       //   onUserInvited(inviteUser);
//       // }
//       hide();
//     },
//     [logger]
//   );

//   return (
//     <Dialog
//       open={open}
//       onClickOutside={() => onClose('click-outside')}
//       className={cn(styles.dialog)}
//       onOpen={() => {
//         logger.log({
//           severity: 'INFO',
//           event: 'Start',
//           flow: 'invite',
//           source: source,
//           type: 'workspace',
//         });
//       }}
//       onClose={() => onClose('close-button')}
//     >
//       <InviteForm
//         close={hide}
//         source={source}
//         onUsersInvited={onUsersInvited}
//       />
//     </Dialog>
//   );
// }
// export default InvitationDialogView;
