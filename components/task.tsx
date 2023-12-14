import React, { useCallback } from 'react';
import { WritingDirection } from '../base/string.ts';
import { cn, keyframes, makeStyles } from '../styles/css-objects/index.ts';
import { brandLightTheme as theme } from '../styles/theme.tsx';
import { styleguide } from '../styles/styleguide.ts';

const useStyles = makeStyles(() => ({
  taskCheckbox: {
    cursor: 'pointer',
    marginTop: styleguide.gridbase * 2,
    marginBottom: styleguide.gridbase * 2,
    marginInlineEnd: styleguide.gridbase * 2,
  },
}));

export interface CheckBoxProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

export function CheckBox({ value, onChange }: CheckBoxProps) {
  const styles = useStyles();
  const src = `/icons/design-system/checkbox/${
    value ? '' : 'not-'
  }selected.svg`;
  const onClick = useCallback(() => {
    onChange(!value);
  }, [onChange, value]);

  return (
    <img
      className={cn(styles.taskCheckbox)}
      src={src}
      onClick={onClick}
    />
  );
}
