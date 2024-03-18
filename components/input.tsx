import React from 'react';
import { FontFamily } from '../styles/components/typography.tsx';
import { makeStyles, cn } from '../styles/css-objects/index.ts';
import { styleguide } from '../styles/styleguide.ts';
import { brandLightTheme as theme } from '../styles/theme.tsx';

const useStyles = makeStyles(() => ({
  textField: {
    fontSize: 13,
    // lineHeight: 16,
    fontFamily: FontFamily,
    color: theme.colors.text,
    '::placeholder': {
      color: theme.colors.placeholderText,
      opacity: 1,
    },
    width: '140px',
  },
}));

export { useStyles as useTextfieldStyles };

export default React.forwardRef<
  HTMLInputElement,
  React.HTMLProps<HTMLInputElement>
>(function Input(props, ref) {
  const styles = useStyles();
  const { className, ...rest } = props;
  return (
    <input ref={ref} className={cn(styles.textField, className)} {...rest} />
  );
});
