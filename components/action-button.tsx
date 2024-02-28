import React, { useCallback } from 'react';
import { Button } from '../styles/components/buttons.tsx';
import { brandLightTheme as theme } from '../styles/theme.tsx';
import { cn, makeStyles } from '../styles/css-objects/index.ts';
import { styleguide } from '../styles/styleguide.ts';

const useStyles = makeStyles(() => ({
  base: {
    boxSizing: 'border-box',
    borderRadius: 20,
    fontSize: 14,
    // fontWeight: 500,
    fontFamily: 'PoppinsSemiBold, HeeboSemiBold',
    borderStyle: 'solid',
    borderWidth: 1,
    color: theme.mono.m0,
    padding: `${styleguide.gridbase / 2}px ${styleguide.gridbase * 2}px`,
  },
  disabled: {
    borderColor: theme.primary.p5,
    backgroundColor: theme.primary.p5,
  },
  enabled: {
    borderColor: theme.primary.p9,
    backgroundColor: theme.primary.p9,
  },
  default: {
    borderColor: theme.primary.p10,
    backgroundColor: theme.primary.p10,
  },
  icon: {
    marginInlineEnd: styleguide.gridbase / 2,
  },
}));

export type ActionButtonMode = 'enabled' | 'disabled' | 'default';

export interface ActionButtonProps extends React.ComponentProps<'button'> {
  onClick?: () => void;
  mode?: ActionButtonMode;
  enabled?: boolean;
  className?: string;
  icon?: string;
}

export const ActionButton = React.forwardRef(function ActionButton(
  props: ActionButtonProps,
  ref: React.Ref<HTMLButtonElement>,
) {
  const styles = useStyles();
  const { onClick, enabled, mode, className, children, icon } = props;
  let styleClass = styles.enabled;

  if (enabled === false || mode === 'disabled') {
    styleClass = styles.disabled;
  } else if (mode === 'default') {
    styleClass = styles.default;
  }
  const onClickCallback = useCallback(() => {
    if (enabled === false || mode === 'disabled') {
      return;
    }
    if (onClick) {
      onClick();
    }
  }, [enabled, mode, onClick]);
  return (
    <Button
      {...props}
      className={cn(styles.base, styleClass, className)}
      ref={ref}
      onClick={onClickCallback}
    >
      {icon && <img className={cn(styles.icon)} src={icon} />}
      {children}
    </Button>
  );
});
