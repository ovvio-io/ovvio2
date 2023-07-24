import React from 'react';
import { makeStyles, cn } from '../../css-objects/index.ts';
import { styleguide } from '../../styleguide.ts';
import { IconPinOff } from './icon-pin-off.tsx';
import { IconPinOn } from './icon-pin-on.tsx';
import { IconProps } from './types.ts';

const useStyles = makeStyles((_, resolveClass) => ({
  pinOff: {
    opacity: 0,
    ...styleguide.transition.short,
    transitionProperty: 'opacity',
  },
  pinOffOver: {
    opacity: 1,
  },
}));

export interface IconPinProps extends IconProps {
  on: boolean;
  visible?: boolean;
}

export function IconPin({ on, visible }: IconPinProps) {
  const styles = useStyles();
  return on ? (
    <IconPinOn />
  ) : (
    <IconPinOff
      className={cn(
        visible === false && styles.pinOff,
        visible !== false && styles.pinOffOver
      )}
    />
  );
}
