import React, { useState, useEffect } from 'react';
import { styleguide } from '../../../styleguide.ts';
import { makeStyles, cn } from '../../../css-objects/index.ts';
import { CHECKBOX_STATES } from './states.tsx';

const useStyles = makeStyles(
  (theme) => ({
    checkbox: {
      width: styleguide.gridbase * 1.5,
      height: styleguide.gridbase * 0.75,
      borderWidth: 2,
      borderBottomStyle: 'solid',
      borderLeftStyle: 'solid',
      boxSizing: 'border-box',
      ...styleguide.transition.standard,
      transitionProperty: 'height, transform',
      transformOrigin: '35% 50%',
      transform: 'rotate(-45deg)',
    },
    partial: {
      height: styleguide.gridbase * 0.25,
      transform: 'rotate(0deg)',
    },
  }),
  'checkbox-icon_22259d'
);

interface CheckboxIconProps {
  fill: string;
  selectionState: CHECKBOX_STATES;
  className?: string;
  style?: any;
}

export default function CheckboxIcon({
  fill,
  selectionState,
  className,
  style = {},
}: CheckboxIconProps) {
  const styles = useStyles();
  const [state, setState] = useState(selectionState);
  useEffect(() => {
    if (selectionState === CHECKBOX_STATES.NONE) {
      return;
    }
    setState(selectionState);
  }, [selectionState]);
  const styleObj = {
    ...style,
    borderColor: fill,
  };
  return (
    <div
      style={styleObj}
      className={cn(
        className,
        styles.checkbox,
        state === CHECKBOX_STATES.SOME && styles.partial
      )}
    />
  );
}
