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
    fontWeight: 500,
    borderStyle: 'solid',
    borderWidth: 1,
    color: theme.mono.m0,
    margin: [0, 'auto'],
    marginTop: styleguide.gridbase * 4,
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
}));

export type ActionButtonMode = 'enabled' | 'disabled' | 'default';

export type ActionButtonProps = React.PropsWithChildren<{
  onClick?: () => void;
  mode?: ActionButtonMode;
  enabled?: boolean;
  className?: string;
}>;

export const ActionButton = React.forwardRef<HTMLButtonElement>(
  function ActionButton(
    { onClick, enabled, mode, className, children }: ActionButtonProps,
    ref,
  ) {
    const styles = useStyles();
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
        className={cn(styles.base, styleClass, className)}
        ref={ref}
        onClick={onClickCallback}
      >
        {children}
      </Button>
    );
  },
);
