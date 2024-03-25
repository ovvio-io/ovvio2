import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useContext,
} from 'react';
import ReactDOM from 'react-dom';
import { makeStyles, cn, keyframes } from '../../css-objects/index.ts';
import { uniqueId } from '../../../base/common.ts';
import { styleguide } from '../../styleguide.ts';
import { layout } from '../../layout.ts';
import { Button } from '../buttons.tsx';
import TransitionGroup, { TRANSITION_STATES } from '../transition.tsx';
import { brandLightTheme as theme } from '../../../styles/theme.tsx';
import { UndoButton } from '../../../web-app/src/app/settings/components/settings-buttons.tsx';
import { WhiteActionButton } from '../../../web-app/src/app/settings/components/settings-buttons.tsx';

const enterAnimation = keyframes(
  {
    from: {
      transform: 'translateY(100%)',
    },
    to: {
      transform: 'translateY(0)',
    },
  },
  'toast_a27e92'
);

const exitAnimation = keyframes(
  {
    from: {
      transform: 'translateX(0)',
      opacity: 1,
    },
    to: {
      transform: 'translateX(-100%)',
      opacity: 0,
    },
  },
  'toast_a00e2d'
);

const exitAnimationLast = keyframes(
  {
    from: {
      transform: 'translateX(0)',
      opacity: 1,
    },
    to: {
      transform: 'translateY(100%)',
      opacity: 0,
    },
  },
  'toast_62f7a9'
);

const useStyles = makeStyles(
  () => ({
    toastList: {
      position: 'absolute',
      bottom: styleguide.gridbase * 4,
      left: styleguide.gridbase * 4,
      zIndex: 10,
    },
    toast: {
      borderColor: theme.primary.p4,
      paddingLeft: styleguide.gridbase * 3,
      borderRadius: 1,
      alignItems: 'center',
      backgroundColor: theme.primary.p1,
      boxSizing: 'border-box',
      borderStyle: 'solid',
      height: styleguide.gridbase * 7,
      width: styleguide.gridbase * 48,
      animation: `${enterAnimation} ${styleguide.transition.duration.standard}ms ${styleguide.transition.timing.standard} forwards`,
      boxShadow: theme.shadows.z2,
      basedOn: [layout.row],
    },
    toastButton: {
      color: theme.primary.p10,
      padding: styleguide.gridbase * 3,
    },
    messageStyle: {
      textAlign: 'center',
      fontSize: '14px',
      fontWeight: '500',
      lineHeight: '19.5px',
      fontFamily: 'Poppins',
    },
    closeIcon: {
      position: 'relative',
      right: styleguide.gridbase * 2,
      bottom: styleguide.gridbase,
    },
    actionButton: {
      padding: styleguide.gridbase,
    },
    [TRANSITION_STATES.EXITING.toLowerCase()]: {
      animation: `${exitAnimation} ${styleguide.transition.duration.standard}ms ${styleguide.transition.timing.standard} forwards`,
      ':last-child': {
        animation: `${exitAnimationLast} ${styleguide.transition.duration.standard}ms ${styleguide.transition.timing.standard} forwards`,
      },
    },
  }),
  'toast_f4e0ae'
);

interface ToastInfo {
  id?: string;
  duration?: number;
  text: string;
  action?: { text: string; fn: (dismiss: DismissFn) => void };
}

export type DismissFn = () => void;

interface ToastController {
  displayToast: (info: ToastInfo) => DismissFn;
}

export const toastContext = React.createContext<ToastController>({
  displayToast: (x: ToastInfo) => {
    return () => {};
  },
});
export type DisplayToastFunction = (info: ToastInfo) => DismissFn;
export type UndoFunction = () => void;

export const useToastController = () => useContext(toastContext);

function Toast({
  message,
  dismiss,
  transitionState = '',
}: {
  message: ToastInfo;
  dismiss: DismissFn;
  transitionState?: string;
}) {
  const styles = useStyles();
  const [processing, setProcessing] = useState(false);
  const onClick = () => {
    if (message.action) {
      setProcessing(true);
      Promise.resolve(message.action.fn(dismiss)).finally(() =>
        setProcessing(false)
      );
    }
  };

  const isUndoAction = message.action && message.action.text === 'Undo';

  return (
    <div className={cn(styles.toast, styles[transitionState.toLowerCase()])}>
      <div className={styles.closeIcon} onClick={dismiss}>
        <img src="/icons/design-system/Close-big.svg" />
      </div>
      <span className={cn(styles.messageStyle)}>{message.text}</span>
      <div className={cn(layout.flexSpacer)} />
      {message.action && (
        <div className={cn(styles.actionButton)}>
          {isUndoAction ? (
            <WhiteActionButton
              onClick={onClick}
              disable={processing}
              buttonText={'Undo'}
              imgSrc={'/icons/design-system/Undo.svg'}
            />
          ) : (
            <Button
              className={cn(styles.toastButton)}
              onClick={onClick}
              disabled={processing}
            >
              {message.action.text}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function ToastsView({ messages, dismiss }) {
  const styles = useStyles();
  return ReactDOM.createPortal(
    <div className={cn(styles.toastList)}>
      <TransitionGroup>
        {messages.map((msg) => (
          <Toast message={msg} dismiss={() => dismiss(msg)} key={msg.id} />
        ))}
      </TransitionGroup>
    </div>,
    window.document.getElementById('root')
  );
}

export function ToastProvider({ children }) {
  const [messages, setMessages] = useState([]);
  let mounted = useRef(true);
  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);
  const presentToast = useCallback((toastInfo) => {
    if (!mounted.current) {
      return () => {};
    }
    if (!toastInfo.id) {
      toastInfo.id = uniqueId();
    }
    setMessages((msgs) => [...msgs, toastInfo]);
    if (toastInfo.duration) {
      window.setTimeout(() => {
        dismiss(toastInfo);
      }, toastInfo.duration);
    }

    return () => dismiss(toastInfo);
  }, []);

  const dismiss = (toastInfo) => {
    if (!mounted) {
      return;
    }
    setMessages((msgs) => msgs.filter((x) => x !== toastInfo));
  };

  return (
    <toastContext.Provider
      value={{
        displayToast: presentToast,
      }}
    >
      {children}
      <ToastsView messages={messages} dismiss={dismiss} />
    </toastContext.Provider>
  );
}
