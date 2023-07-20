import React, { useLayoutEffect, useRef, useState } from 'react';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { useScopedObservable } from 'core/state';
import User from 'stores/user';
import { RestClient } from 'api';
import { styleguide, layout } from '@ovvio/styles/lib';
import { Button, RaisedButton } from '@ovvio/styles/lib/components/buttons';
import { Text, H3 } from '@ovvio/styles/lib/components/texts';
import { IconContactUs, IconClose } from '@ovvio/styles/lib/components/icons';
import Menu from '@ovvio/styles/lib/components/menu';
import BeerIllustration from './beer-illustration';
import { isElectron } from 'electronUtils';
import { useEventLogger } from 'core/analytics';
import { Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';

const useStyles = makeStyles(theme => ({
  link: {
    textDecoration: 'none',
  },
  button: {
    height: styleguide.gridbase * 4,
    borderRadius: styleguide.gridbase * 2,
    backgroundColor: theme.background[0],
    boxSizing: 'border-box',
    padding: [0, styleguide.gridbase],
    border: `0.9px solid #9cb2cd`,
    color: '#9cb2cd',
    boxShadow: '0 3px 5px 0 rgba(42, 62, 82, 0.12)',
    transition: `${styleguide.transition.duration.short}ms linear background-color`,
    basedOn: [layout.row, layout.centerCenter],
    ':hover': {
      backgroundColor: 'rgba(234, 234, 234, 0.6)',
    },
    ':active': {
      backgroundColor: '#9cb2cd',
      color: theme.background[0],
    },
  },
  icon: {},
  text: {
    fontSize: 12,
  },
  dialog: {
    width: styleguide.gridbase * 32,
    borderRadius: 3,
    boxShadow: '0 3px 5px 0 rgba(42, 62, 82, 0.12)',
    height: styleguide.gridbase * 31,
  },
  relative: {
    position: 'relative',
    basedOn: [layout.column, layout.flex],
  },
  content: {
    padding: styleguide.gridbase * 3,
    boxSizing: 'border-box',
    basedOn: [layout.column, layout.flex],
  },
  textarea: {
    width: '100%',
    height: styleguide.gridbase * 19,
    resize: 'none',
    borderRadius: 4,
    border: '1px solid rgba(156, 178, 205, 0.6)',
    padding: [styleguide.gridbase * 1.5, styleguide.gridbase * 2.5],
    fontFamily: 'Roboto',
    fontSize: '14px',
    color: '#11082b',
    boxSizing: 'border-box',
    ':focus': {
      outline: 'none',
    },
    '::placeholder': {
      color: '#c4d1e1',
    },
  },
  closeBtn: {
    position: 'absolute',
    top: styleguide.gridbase,
    right: styleguide.gridbase,
    height: styleguide.gridbase * 2,
    width: styleguide.gridbase * 2,
  },
  sendButton: {
    alignSelf: 'flex-end',
    marginRight: styleguide.gridbase * 0.5,
    marginTop: styleguide.gridbase * 2,
  },
}));

interface FeedbackFormProps {
  onSend: (value: string) => void;
}
function FeedbackForm({ onSend }: FeedbackFormProps) {
  const styles = useStyles();
  const textArea = useRef<any>();
  const [value, setValue] = useState('');
  const send = e => {
    e.stopPropagation();
    e.preventDefault();
    onSend(value);
  };
  const onChange = e => {
    setValue(e.target.value);
  };

  useLayoutEffect(() => {
    if (textArea.current) {
      textArea.current.focus();
    }
  }, []);

  return (
    <form
      className={cn(styles.content)}
      onClick={e => e.stopPropagation()}
      onSubmit={send}
    >
      <textarea
        placeholder="enter your message here..."
        ref={textArea}
        className={cn(styles.textarea)}
        value={value}
        onChange={onChange}
      />
      <RaisedButton
        disabled={!value}
        onClick={send}
        className={cn(styles.sendButton)}
      >
        SEND
      </RaisedButton>
    </form>
  );
}

function FeedbackThanks() {
  const styles = useStyles();
  return (
    <div className={cn(styles.content, layout.centerCenter)}>
      <BeerIllustration />
      <H3>Thanks mate!</H3>
    </div>
  );
}

interface FeedbackContentProps {
  wsManagers: VertexManager<Workspace>[];
  close?: (e: any) => void;
}
function FeedbackContent({ wsManagers, close }: FeedbackContentProps) {
  const styles = useStyles();
  const currentUser = useScopedObservable(User);
  const [didSend, setDidSend] = useState(false);
  const eventLogger = useEventLogger();

  const onSend = (text: string) => {
    let electronLog = null;
    if (isElectron()) {
      electronLog = window
        .require('electron')
        .ipcRenderer.sendSync('latest-log-file');
    }

    const client = new RestClient(currentUser);
    client
      .post('/feedback', {
        text,
        workspaces: wsManagers.map(x => x.key),
        currentLocation: window.location.pathname,
        electronLog,
      })
      .then(() => {
        eventLogger.action('FEEDBACK_COMPLETED', {});
        setDidSend(true);
      })
      .catch(err => {
        eventLogger.error(err, {
          origin: 'SEND_FEEDBACK',
        });
      });
  };

  let content: JSX.Element;
  if (didSend) {
    content = <FeedbackThanks />;
  } else {
    content = <FeedbackForm onSend={onSend} />;
  }
  return (
    <div className={cn(styles.relative)}>
      <Button className={cn(styles.closeBtn)} onClick={close}>
        <IconClose size="small" />
      </Button>
      {content}
    </div>
  );
}

interface FeedbackButtonProps {
  wsManagers: VertexManager<Workspace>[];
  className?: string;
}
export default function FeedbackButton({
  wsManagers,
  className = '',
}: FeedbackButtonProps) {
  const styles = useStyles();
  const eventLogger = useEventLogger();

  return (
    <Menu
      position="bottom"
      direction="in"
      align="center"
      className={cn(styles.button, className)}
      popupClassName={cn(styles.dialog)}
      renderButton={() => (
        <React.Fragment>
          <IconContactUs className={cn(styles.icon)} />
          <Text className={cn(styles.text)}>Tell us what you think!</Text>
        </React.Fragment>
      )}
      onClick={() => {
        eventLogger.action('FEEDBACK_STARTED', {});
      }}
    >
      <FeedbackContent wsManagers={wsManagers} />
    </Menu>
  );
}
