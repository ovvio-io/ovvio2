import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useContext,
} from 'https://esm.sh/react@18.2.0';
import ReactDOM from 'https://esm.sh/react-dom@18.2.0';
import { makeStyles, cn, keyframes } from '../../css-objects/index.ts';
import { uniqueId } from '../../../base/common.ts';
import { styleguide } from '../../styleguide.ts';
import { layout } from '../../layout.ts';
import { Button } from '../buttons.tsx';
import TransitionGroup, { TRANSITION_STATES } from '../transition.tsx';

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
  (theme) => ({
    toastList: {
      position: 'absolute',
      bottom: styleguide.gridbase * 8,
      left: styleguide.gridbase * 8,
      zIndex: 10,
    },
    toast: {
      color: theme.background[0],
      paddingLeft: styleguide.gridbase * 3,
      borderRadius: 6,
      alignItems: 'center',
      backgroundColor: theme.background[800],
      boxSizing: 'border-box',
      height: styleguide.gridbase * 7,
      width: styleguide.gridbase * 57,
      animation: `${enterAnimation} ${styleguide.transition.duration.standard}ms ${styleguide.transition.timing.standard} forwards`,
      boxShadow: theme.shadows.z2,
      basedOn: [layout.row],
    },
    toastButton: {
      color: theme.primary[500],
      padding: styleguide.gridbase * 3,
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

type DismissFn = () => void;

interface ToastController {
  displayToast: (info: ToastInfo) => DismissFn;
}

export const toastContext = React.createContext<ToastController>({
  displayToast: (x: ToastInfo) => {
    return () => {};
  },
});

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
    setProcessing(true);
    Promise.resolve(message.action.fn(dismiss)).finally(() =>
      setProcessing(false)
    );
  };
  return (
    <div className={cn(styles.toast, styles[transitionState.toLowerCase()])}>
      <span>{message.text}</span>
      <div className={cn(layout.flexSpacer)} />
      {message.action && (
        <Button
          className={cn(styles.toastButton)}
          onClick={onClick}
          disabled={processing}
        >
          {message.action.text}
        </Button>
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
