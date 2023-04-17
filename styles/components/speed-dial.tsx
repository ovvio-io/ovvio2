import React, { useRef } from 'react';
import { makeStyles, cn } from '../css-objects/index.ts';
import { styleguide } from '../styleguide.ts';
import { useFabStyles, Button } from './buttons.tsx';
import Tooltip from './tooltip/index.tsx';

export const OPTION_SIZE = styleguide.gridbase * 5;

const useStyles = makeStyles((theme) => ({
  speedDial: {
    overflow: 'visible',
    ':hover': {
      backgroundColor: theme.primary[500],
    },
    basedOn: [useFabStyles.fab],
  },
  expander: {
    pointerEvents: 'none',
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    display: 'flex',
    flexDirection: 'column-reverse',
    alignItems: 'center',
    flexShrink: 0,
    overflow: 'visible',
  },
  open: {
    boxShadow: '0 0 14px 0 rgba(255, 128, 0, 0.5)',
    expander: {
      pointerEvents: 'all',
    },
  },
  option: {
    backgroundColor: theme.primary[500],
    marginBottom: styleguide.gridbase * 2,
    ...styleguide.transition.standard,
    transitionProperty: 'transform',
    width: OPTION_SIZE,
    height: OPTION_SIZE,
    borderRadius: styleguide.gridbase * 2.5,
    transform: 'scale(0)',
    boxShadow: '0 0 8px 0 rgba(255, 128, 0, 0.5)',
  },
  actionOpen: {
    transform: 'scale(1)',
  },
  tooltip: {
    marginRight: styleguide.gridbase,
  },
}));

export default function SpeedDial({
  className = '',
  children,
  open,
  onOpen,
  onClose,
  renderButton,
}) {
  const styles = useStyles();
  const ref = useRef();
  const onBtnEnter = (e) => {
    if (ref.current && e.target === ref.current) {
      return;
    }
    onOpen();
  };

  return (
    <div
      className={cn(className, styles.speedDial, open && styles.open)}
      onClick={() => (open ? onClose() : onOpen())}
      onMouseEnter={onBtnEnter}
      onMouseLeave={onClose}
    >
      {renderButton({ open })}
      <div className={cn(styles.expander)} ref={ref}>
        {React.Children.map(children, (child, i) => {
          if (!React.isValidElement(child)) {
            return child;
          }

          return React.cloneElement(child, {
            open: open,
            index: i,
            total: React.Children.count(children),
            close: onClose,
          } as any);
        })}
      </div>
    </div>
  );
}

function SpeedDialAction({
  children,
  onClick,
  className = '',
  open = false,
  index = 0,
  total = 0,
  tooltip,
  close = () => {},
}) {
  const styles = useStyles();
  const style = {
    transitionDelay: open
      ? index * styleguide.transition.duration.short + 'ms'
      : (total - 1 - index) * styleguide.transition.duration.short + 'ms',
  };

  const action = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onClick();
    close();
  };

  return (
    <Tooltip text={tooltip} position="left" className={cn(styles.tooltip)}>
      <Button
        className={cn(className, styles.option, open && styles.actionOpen)}
        style={style}
        onClick={action}
      >
        {children}
      </Button>
    </Tooltip>
  );
}

export { SpeedDial, SpeedDialAction };
