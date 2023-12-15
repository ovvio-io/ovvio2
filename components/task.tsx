import React, { useCallback } from 'react';
import { WritingDirection } from '../base/string.ts';
import { cn, keyframes, makeStyles } from '../styles/css-objects/index.ts';
import { brandLightTheme as theme } from '../styles/theme.tsx';
import { styleguide } from '../styles/styleguide.ts';

const useStyles = makeStyles(() => ({
  taskCheckbox: {
    cursor: 'pointer',
  },
}));

export interface CheckBoxProps {
  value: boolean;
  onChange: (value: boolean) => void;
  className?: string;
}

export function CheckBox({ value, onChange, className }: CheckBoxProps) {
  const styles = useStyles();
  const src = `/icons/design-system/checkbox/${
    value ? '' : 'not-'
  }selected.svg`;
  const onClick = useCallback(() => {
    onChange(!value);
  }, [onChange, value]);

  return (
    <img
      className={cn(styles.taskCheckbox, className)}
      src={src}
      onClick={onClick}
    />
  );
}
