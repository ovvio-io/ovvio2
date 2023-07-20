import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { User, Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import RestClient from 'api';
import { useEventLogger } from 'core/analytics';
import { useGraphManager } from 'core/cfds/react/graph';
import { createUseStrings } from 'core/localization';
import { useFocusOnMount } from 'core/react-utils';
import { isKeyPressed } from 'core/slate/utils/hotkeys';
import { useScopedObservable } from 'core/state';
import React, { KeyboardEvent, MouseEvent, useRef, useState } from 'react';
import { UserOnboard, useTutorialStep } from 'shared/tutorial';
import { validateEmail } from 'shared/utils/email';
import UserStore from 'stores/user';
import { layout, styleguide } from '@ovvio/styles/lib';
import {
  LinkButton,
  RaisedButton,
  SecondaryButton,
} from '@ovvio/styles/lib/components/buttons';
import { IconClose } from '@ovvio/styles/lib/components/icons';
import { TextField } from '@ovvio/styles/lib/components/inputs';
import SentIllustration from 'shared/invitation-dialog/sent-illustration';

import { H2, H3, Text } from '@ovvio/styles/lib/components/texts';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { useTheme } from '@ovvio/styles/lib/theme';
import ColleaguesIllustration from './colleagues-illustration';
import { InvitationSteps, useInviteTutorialSteps } from './invite-tutorial';
import localizations from './invite.strings.json';
import { WorkspacesDropdown } from './workspaces-dropdown';

const useStyles = makeStyles(theme => ({
  form: {
    padding: styleguide.gridbase,
    basedOn: [layout.column],
  },
  header: {
    marginTop: styleguide.gridbase * 2,
    textAlign: 'center',
  },
  colleaguesIllustration: {
    margin: [styleguide.gridbase * 3, 0],
  },
  text: {
    fontWeight: 'normal',
    lineHeight: '1.42',
    marginBottom: styleguide.gridbase,
    padding: [0, styleguide.gridbase],
  },
  illustration: {
    alignSelf: 'center',
  },
  inviteHeader: {
    marginBottom: styleguide.gridbase,
    padding: [0, styleguide.gridbase],
  },
  addEmail: {
    margin: [styleguide.gridbase, 0],
    basedOn: [layout.row],
  },
  emailInput: {
    marginRight: styleguide.gridbase,
    basedOn: [layout.flexSpacer],
  },
  emailButton: {
    width: styleguide.gridbase * 10,
  },
  emails: {
    minHeight: styleguide.gridbase * 4,
    marginTop: styleguide.gridbase,
    flexWrap: 'wrap',
    basedOn: [layout.row],
  },
  emailPill: {
    backgroundColor: theme.background[500],
    direction: 'ltr',
    height: styleguide.gridbase * 3,
    minWidth: styleguide.gridbase * 6,
    marginRight: styleguide.gridbase,
    padding: [0, styleguide.gridbase],
    flexShrink: 0,
    fontSize: 12,
    borderRadius: styleguide.gridbase * 2.5,
    ...styleguide.transition.short,
    transitionProperty: 'all',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'row',
  },
  emailText: {
    marginLeft: styleguide.gridbase * 0.75,
    marginRight: styleguide.gridbase * 0.75,
    color: theme.background.text,
    userSelect: 'none',
  },
  emailDelete: {
    position: 'relative',
    top: 1,
    cursor: 'pointer',
  },
  chooseWorkspace: {
    marginBottom: styleguide.gridbase,
  },
  actions: {
    alignItems: 'center',
    marginTop: styleguide.gridbase * 3,
    justifyContent: 'flex-end',
    basedOn: [layout.row],
    '& > button': {
      marginLeft: styleguide.gridbase * 2,
    },
  },
  workspaces: {
    alignSelf: 'stretch',
    margin: [styleguide.gridbase, 0],
  },
  inviteBtn: {
    minWidth: styleguide.gridbase * 15,
  },
  cancel: {
    color: theme.background.placeholderText,
  },
}));

const useStrings = createUseStrings(localizations);

function AddEmailInput({
  addEmail,
  disabled,
}: {
  disabled?: boolean;
  addEmail: (email: string) => void;
}) {
  const styles = useStyles();
  const strings = useStrings();
  const ref = useRef();
  const inputRef = useRef();
  useFocusOnMount(inputRef);
  const [email, setEmail] = useState('');
  const isEmailValid = validateEmail(email);

  const { className: addEmailClassName, next: nextStep } = useTutorialStep(
    InvitationSteps.AddEmail,
    ref.current,
    { context: isEmailValid }
  );
  const onAddEmail = () => {
    if (!isEmailValid || disabled) {
      return;
    }
    if (nextStep) {
      nextStep();
    }
    addEmail(email);
    setEmail('');
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (isKeyPressed(e, 'Enter')) {
      e.stopPropagation();
      e.preventDefault();
      onAddEmail();
    }
  };
  return (
    <div className={cn(styles.addEmail, addEmailClassName)} ref={ref}>
      <TextField
        value={email}
        onChange={e => setEmail(e.currentTarget.value)}
        type="email"
        ref={inputRef}
        onKeyDown={onKeyDown}
        placeholder={strings.email}
        className={cn(styles.emailInput)}
      />
      <SecondaryButton
        className={cn(styles.emailButton)}
        disabled={disabled || !isEmailValid}
        onClick={onAddEmail}
      >
        {strings.add}
      </SecondaryButton>
    </div>
  );
}

function EmailPill({
  email,
  onRemove,
}: {
  email: string;
  onRemove: (email: string) => void;
}) {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <div className={cn(styles.emailPill)}>
      <Text>{email}</Text>
      <div className={cn(styles.emailDelete)} onClick={() => onRemove(email)}>
        <IconClose fill={theme.background.text} size="small" />
      </div>
    </div>
  );
}

enum InvitationStates {
  None,
  Sending,
  Sent,
}
interface InviteResult {
  type: 'user' | 'invitation';
  inviteKey: string;
  userId?: string;
}

export interface InviteFormProps {
  workspaces: VertexManager<Workspace>[];
  close: () => void;
  source?: string;
  onUsersInvited?: (users: VertexManager<User>[]) => void;
  className?: string;
  showOnboard?: boolean;
}

interface InviteStepProps {
  workspaces: VertexManager<Workspace>[];
  onInviteDone: (
    workspace: VertexManager<Workspace>,
    users: VertexManager<User>[]
  ) => void;
  close: () => void;
  source?: string;
}

function InviteStepForm({
  workspaces,
  onInviteDone,
  close,
  source,
}: InviteStepProps) {
  const styles = useStyles();
  const strings = useStrings();
  const [emails, setEmails] = useState<string[]>([]);
  const invitedUsers = useRef<VertexManager<User>[]>([]);
  const user = useScopedObservable(UserStore);
  const [selectedWorkspace, setSelectedWorkspace] = useState(() =>
    workspaces.length < 2 ? workspaces[0] : null
  );
  // eslint-disable-next-line
  const [error, setError] = useState('');
  const eventLogger = useEventLogger();
  const graph = useGraphManager();
  const [isProcessing, setIsProcessing] = useState(false);
  const onInvited = (users: VertexManager<User>[]) => {
    setIsProcessing(false);
    setEmails([]);
    onInviteDone(selectedWorkspace, users);
  };
  const onSubmit = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isProcessing) {
      return;
    }
    invitedUsers.current = [];
    setError('');
    setIsProcessing(true);
    const ws = selectedWorkspace.getVertexProxy();
    const users = Array.from(ws.users);
    const newEmails = [];
    for (const email of emails) {
      const u = users.find(x => x.email === email);
      if (u) {
        invitedUsers.current.push(u.manager as VertexManager<User>);
      } else {
        newEmails.push(email);
      }
    }

    if (!newEmails.length) {
      onInvited([]);
      return;
    }
    try {
      const client = new RestClient(user);
      const results = await client.post<InviteResult[]>(
        `/workspaces/${selectedWorkspace.key}/users`,
        {
          emails: newEmails,
        }
      );
      selectedWorkspace.scheduleSync();
      eventLogger.wsAction('WORKSPACE_INVITE_SENT', selectedWorkspace, {
        data: { emailCount: emails.length },
        source,
      });

      const keysToLoad = results.reduce((accum, res) => {
        accum.push(res.inviteKey);
        if (res.userId) {
          accum.push(res.userId);
        }
        return accum;
      }, []);

      const keyGroup = graph.createGroup(keysToLoad);
      keyGroup.waitForReady(
        () => {
          onInvited(
            results
              .filter(x => x.userId)
              .map(x => graph.getVertexManager<User>(x.userId))
          );
        },
        () => {
          console.warn('wait for key group after invite failed');
          onInvited([]);
        }
      );
    } catch (e) {
      setError('Whoops, something went wrong, please try again');
      eventLogger.wsError(e, selectedWorkspace, {
        origin: 'WORKSPACE_INVITE',
        source,
      });
      setIsProcessing(false);
    }
  };

  const addEmail = (email: string) => {
    eventLogger.action('WORKSPACE_INVITE_EMAIL_ADDED', {
      workspaceId: selectedWorkspace?.key,
      source,
    });
    setEmails(current => {
      if (current.includes(email)) {
        return current;
      }
      return current.concat(email);
    });
  };

  return (
    <React.Fragment>
      <H2 className={cn(styles.header)}>
        {strings.shareHeader}
        <span role="img" aria-label="heart">
          ❤️
        </span>
      </H2>
      <ColleaguesIllustration
        className={cn(styles.illustration, styles.colleaguesIllustration)}
      />
      <H3 className={cn(styles.header, styles.inviteHeader)}>
        {strings.inviteHeader}
      </H3>
      {workspaces.length > 1 ? (
        <div className={cn(layout.column, layout.centerCenter)}>
          <WorkspacesDropdown
            className={cn(styles.workspaces)}
            workspaces={workspaces}
            selectedWorkspace={selectedWorkspace}
            setSelectedWorkspace={setSelectedWorkspace}
          />
        </div>
      ) : null}
      <AddEmailInput addEmail={addEmail} disabled={isProcessing} />
      <div className={cn(styles.emails)}>
        {emails.map(x => (
          <EmailPill
            key={x}
            email={x}
            onRemove={email => setEmails(curr => curr.filter(e => e !== email))}
          />
        ))}
      </div>
      <div className={cn(styles.actions)}>
        <LinkButton
          onClick={close}
          className={cn(styles.cancel)}
          disabled={isProcessing}
        >
          <Text>{strings.cancelInvite}</Text>
        </LinkButton>
        <RaisedButton
          className={cn(styles.inviteBtn)}
          processing={isProcessing}
          type="submit"
          disabled={!emails.length || !selectedWorkspace}
          onClick={onSubmit}
        >
          {strings.invite}
        </RaisedButton>
      </div>
    </React.Fragment>
  );
}

function InvitationSent({ close }: { close: () => void }) {
  const styles = useStyles();
  const strings = useStrings();

  const onClose = () => {
    close();
  };
  return (
    <React.Fragment>
      <H2 className={cn(styles.header)}>{strings.inviteSent}</H2>
      <H3 className={cn(styles.header, styles.text)}>{strings.sentText}</H3>
      <SentIllustration className={cn(styles.illustration)} />
      <LinkButton onClick={() => onClose()}>{strings.sentButton}</LinkButton>
    </React.Fragment>
  );
}

export function InviteForm({
  className,
  workspaces,
  close,
  onUsersInvited,
  source,
  showOnboard,
}: InviteFormProps) {
  const styles = useStyles();
  const [inviteState, setInviteState] = useState(InvitationStates.None);
  const [selectedWorkspace, setSelectedWorkspace] =
    useState<VertexManager<Workspace>>(null);
  const eventLogger = useEventLogger();
  const tutorialSteps = useInviteTutorialSteps();
  const onClose = () => {
    eventLogger.action('WORKSPACE_INVITE_SCREEN_CLOSED', {
      workspaceId: selectedWorkspace?.key,
      source,
    });
    setInviteState(InvitationStates.None);
    setSelectedWorkspace(null);
    close();
  };

  const onInviteDone = (
    workspace: VertexManager<Workspace>,
    users: VertexManager<User>[]
  ) => {
    if (onUsersInvited) {
      onUsersInvited(users);
    }
    setSelectedWorkspace(workspace);
    setInviteState(InvitationStates.Sent);
  };

  return (
    <UserOnboard steps={tutorialSteps} tutorialId="INVITE" disabled={true}>
      <div className={cn(styles.form, className)}>
        {inviteState === InvitationStates.Sent ? (
          <InvitationSent close={onClose} />
        ) : (
          <InviteStepForm
            workspaces={workspaces}
            close={onClose}
            onInviteDone={onInviteDone}
            source={source}
          />
        )}
      </div>
    </UserOnboard>
  );
}
