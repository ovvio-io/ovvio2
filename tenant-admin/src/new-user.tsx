import React from 'react';
import { cn, makeStyles } from '../../styles/css-objects/index.ts';
import { layout } from '../../styles/layout.ts';
import { styleguide } from '../../styles/styleguide.ts';
import { brandLightTheme as theme } from '../../styles/theme.tsx';

const useStyles = makeStyles(() => ({
  formLabel: {
    display: 'block',
  },
  formTextInput: {
    display: 'block',
  },
}));

export function NewUserForm() {
  const styles = useStyles();
  return (
    <form>
      <label htmlFor={'email'} className={cn(styles.formLabel)}>
        Email
      </label>
      <input
        id={'email'}
        type="email"
        className={cn(styles.formTextInput)}
      ></input>
    </form>
  );
}
