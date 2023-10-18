import React from 'react';
import { FontFamily } from '../typography.tsx';
import { makeStyles, cn } from '../../css-objects/index.ts';
import { styleguide } from '../../styleguide.ts';
import { brandLightTheme as theme } from '../../theme.tsx';

const useStyles = makeStyles(() => ({
  textField: {
    height: styleguide.gridbase * 4,
    boxSizing: 'border-box',
    borderRadius: 20,
    fontSize: 13,
    // lineHeight: 16,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: theme.primary.p9,
    outline: 'none',
    fontFamily: FontFamily,
    padding: [styleguide.gridbase, styleguide.gridbase * 2],
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    '::placeholder': {
      color: theme.colors.placeholderText,
      opacity: 1,
    },
  },
}));

export { useStyles as useTextfieldStyles };

export default React.forwardRef(function TextField(
  props: React.HTMLProps<HTMLInputElement>,
  ref: any
) {
  const styles = useStyles();
  const { className, ...rest } = props;
  return (
    <input ref={ref} className={cn(styles.textField, className)} {...rest} />
  );
});
