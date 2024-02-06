import React, {
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAnimateWidth } from '../../core/react-utils/animate.ts';
import { styleguide } from '../../../../styles/styleguide.ts';
import {
  makeStyles,
  cn,
  keyframes,
} from '../../../../styles/css-objects/index.ts';

const showAnim = keyframes({
  '0%': {
    opacity: 0,
  },
  '99%': {
    opacity: 0,
  },
  '100%': {
    opacity: 1,
  },
});

export enum PillStyle {
  Full = 'full',
  Border = 'border',
  None = 'none',
}

const useStyles = makeStyles((theme) => ({
  pill: {
    direction: 'ltr',
    // height: styleguide.gridbase * 3,
    // minWidth: styleguide.gridbase * 6,
    // padding: [0, styleguide.gridbase],
    flexShrink: 0,
    fontSize: 10,
    borderRadius: styleguide.gridbase * 2.5,
    ...styleguide.transition.short,
    transitionProperty: 'all',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'row',
    userSelect: 'none',
  },

  [PillStyle.Full]: {
    backgroundColor: 'var(--pill-color)',
    color: theme.background.text,
  },
  [PillStyle.Border]: {
    border: '1px solid var(--pill-color)',
    color: 'var(--pill-color)',
  },
  [PillStyle.None]: {
    color: 'var(--pill-color)',
    border: '1px solid transparent',
    pillContent: {
      margin: 0,
    },
  },
  pillContent: {
    marginLeft: styleguide.gridbase * 0.75,
    marginRight: styleguide.gridbase / 2,
    animation: `${showAnim} ${styleguide.transition.duration.short}ms linear backwards`,
    userSelect: 'none',
  },
  pillAction: {
    position: 'relative',
    // top: 1,
    animation: `${showAnim} ${styleguide.transition.duration.short}ms backwards linear`,
    cursor: 'pointer',
    display: 'none',
  },
  visible: {
    display: 'flex',
  },
}));

const PillContext = React.createContext(false);

export interface PillActionProps extends React.PropsWithChildren {
  className?: string;
}

export const PillAction: React.FC<PillActionProps> = ({
  children,
  className,
}) => {
  const styles = useStyles();
  const visible = useContext(PillContext);

  return (
    <div
      className={cn(styles.pillAction, className, visible && styles.visible)}
    >
      {children}
    </div>
  );
};

export interface PillContentProps extends React.PropsWithChildren {
  className?: string;
}

export const PillContent: React.FC<PillContentProps> = ({
  children,
  className,
}) => {
  const styles = useStyles();
  return <div className={cn(styles.pillContent, className)}>{children}</div>;
};

export interface PillProps extends React.PropsWithChildren {
  className?: string;
  extended?: boolean;
  color?: string;
  pillStyle?: PillStyle;
}

export const Pill: React.FC<PillProps> = ({
  children,
  className,
  extended,
  color,
  pillStyle = PillStyle.Full,
}) => {
  const styles = useStyles();
  const [isHover, setIsHover] = useState(false);
  const ref = useRef(null);
  const showAction = typeof extended === 'undefined' ? isHover : extended;
  const { width } = useAnimateWidth(ref, showAction);
  const style = useMemo(
    () => ({
      width,
      '--pill-color': color,
    }),
    [width, color]
  );

  const onMouseEnter = useCallback(() => {
    setIsHover(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    setIsHover(false);
  }, []);

  return (
    <PillContext.Provider value={showAction}>
      <div
        ref={ref}
        className={cn(styles.pill, className, styles[pillStyle])}
        style={style}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {children}
      </div>
    </PillContext.Provider>
  );
};
