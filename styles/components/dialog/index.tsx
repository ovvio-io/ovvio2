import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { makeStyles, cn, keyframes } from '../../css-objects/index.ts';
import { H2 } from '../texts.tsx';
import { styleguide } from '../../styleguide.ts';
import { layout } from '../../layout.ts';
import { IconClose } from '../icons/index.ts';
import { Button, IconButton } from '../buttons.tsx';
import Layer from '../layer.tsx';
import {
  MouseEvent,
  MouseEventHandler,
} from 'https://esm.sh/v96/@types/react@18.0.21/index.d.ts';

const show = keyframes(
  {
    from: {
      opacity: 0,
      transform: 'translateY(-50%)',
    },
    to: {
      opacity: 1,
      transform: 'translateY(0)',
    },
  },
  'index_90a70e',
);

const hideAnim = keyframes(
  {
    from: {
      opacity: 1,
      transform: 'translateY(0)',
    },
    to: {
      opacity: 0,
      transform: 'translateY(-50%)',
    },
  },
  'dialog_a096ea',
);

const backdropShow = keyframes(
  {
    from: {
      opacity: 0,
    },
    to: {
      opacity: 1,
    },
  },
  'dialog_dca075',
);

const backdropHide = keyframes(
  {
    from: {
      opacity: 1,
    },
    to: {
      opacity: 0,
    },
  },
  'dialog_0aa5dd',
);

const useStyles = makeStyles(
  (theme) => ({
    backdrop: {
      // backgroundColor: '#FFFBF5',
      backgroundColor: 'rgba(255, 251, 245, 0.9)', // Adjust the RGB values as needed
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      basedOn: [layout.column, layout.centerCenter],
      animation: `${backdropShow} 0.15s linear backwards`,
      fill: '#FFFBF5',
      // opacity: 0.9,
    },
    backdropHide: {
      animation: `${backdropHide} 0.15s linear both`,
    },
    dialog: {
      backgroundColor: theme.background[0],
      position: 'relative',
      borderRadius: 4,
      boxSizing: 'border-box',
      width: `calc(100vw - ${styleguide.gridbase * 2}px)`,
      maxWidth: styleguide.gridbase * 70,
      padding: styleguide.gridbase * 4,
      animation: `${show} 0.15s ${styleguide.transition.timing.standard}`,
      boxShadow: theme.shadows.z2,
      opacity: 1,
    },
    closeBtn: {
      position: 'absolute',
      top: styleguide.gridbase * 1.5,
      right: styleguide.gridbase * 1.5,
      width: styleguide.gridbase * 3,
      height: styleguide.gridbase * 3,
    },
    hide: {
      animation: `${hideAnim} 0.15s ${styleguide.transition.timing.standard} both`,
    },
    content: {
      width: '100%',
    },
    actions: {
      marginTop: styleguide.gridbase * 2,
      alignItems: 'center',
      justifyContent: 'center',
      basedOn: [layout.row],
      '& > button': {
        marginLeft: styleguide.gridbase * 2,
      },
    },
    header: {
      textAlign: 'center',
    },
    button: {
      padding: [0, styleguide.gridbase * 4],
      height: styleguide.gridbase * 5,
      fontSize: styleguide.gridbase * 2,
      fontFamily: 'PoppinsBold, HeeboBold',
      borderRadius: styleguide.gridbase * 2.5,
      backgroundColor: theme.primary[500],
      color: theme.background[0],
      transition: `background-color linear ${styleguide.transition.duration.short}ms`,
      ':disabled': {
        backgroundColor: '#d7e3f1',
      },
    },
  }),
  'dialog_90852c',
);

interface DialogButtonProps {
  className?: string;
  children: any;
  disabled: boolean;
}
export function DialogButton({ className, ...props }: DialogButtonProps) {
  const styles = useStyles();
  return <Button className={cn(styles.button, className)} {...props} />;
}

export function DialogHeader({ children }) {
  const styles = useStyles();
  return <H2 className={cn(styles.header)}>{children}</H2>;
}

export interface DialogProps {
  open: boolean;
  children: any;
  onClickOutside?: any;
  className?: string;
  onClose?: (e: any) => void;
  onOpen?: () => void;
  renderIndicator?: () => any;
}
export function Dialog({
  open,
  children,
  onClickOutside,
  className,
  onClose,
  onOpen,
  renderIndicator = () => null,
}: DialogProps) {
  const styles = useStyles();
  // const domState = useScopedObservable(DomState);
  const timeout = useRef<number>();
  const [visible, setVisible] = useState(open);
  const [css, setCss] = useState<string | null>(null);
  const onOpenRef = useRef(onOpen);
  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);
  // useEffect(() => {
  //   if (open) {
  //     domState.dialogCount++;
  //     return () => {
  //       domState.dialogCount--;
  //     };
  //   }
  // }, [open, domState]);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (timeout.current) {
      clearTimeout(timeout.current);
      timeout.current = undefined;
    }
    if (!open) {
      timeout.current = window.setTimeout(() => {
        if (!mounted.current) {
          return;
        }
        setVisible(false);
      }, 200);
      setCss(styles.hide);
    } else {
      setCss('');
      setVisible(true);
      onOpenRef.current?.();
    }
  }, [open, styles]);

  if (!visible) {
    return null;
  }

  const root = document.getElementById('root')!;
  const ignoreClick = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };
  const backgroundClick = (e: MouseEvent) => {
    ignoreClick(e);
    onClickOutside && onClickOutside();
  };
  return ReactDOM.createPortal(
    <Layer priority={3}>
      {({ zIndex }) => (
        <div
          className={cn(styles.backdrop, css && styles.backdropHide)}
          style={{ zIndex }}
          onClick={backgroundClick}
        >
          <div
            className={cn(styles.dialog, css, className)}
            onClick={ignoreClick}
          >
            {onClose && (
              <IconButton className={cn(styles.closeBtn)} onClick={onClose}>
                <img
                  key="closeCircleDialog"
                  src="/icons/Editor/Close-circle.svg"
                />
              </IconButton>
            )}
            {children}
          </div>
          {renderIndicator()}
        </div>
      )}
    </Layer>,
    root,
  );
}

export interface DialogContentProps {
  children: any;
  className?: string;
}
export const DialogContent = ({ children, className }: DialogContentProps) => {
  const styles = useStyles();
  return <div className={cn(styles.content, className)}>{children}</div>;
};

export interface DialogActionsProps {
  children: any;
  className?: string;
}
export const DialogActions = ({ children, className }: DialogActionsProps) => {
  const styles = useStyles();
  return <div className={cn(styles.actions, className)}>{children}</div>;
};

export default Dialog;
