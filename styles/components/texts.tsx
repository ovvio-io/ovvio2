import React from 'react';
import { makeStyles, cn } from '../css-objects/index.ts';

export const useStyles = makeStyles(
  (theme) => ({
    h1: {
      margin: 0,
      padding: 0,
      fontSize: 40,
      // fontWeight: '600',
      fontFamily: 'PoppinsBold, HeeboBold',
      fontStyle: 'normal',
      fontStretch: 'normal',
      lineHeight: 'normal',
      letterSpacing: 'normal',
      color: theme.background.text,
    },
    h2: {
      margin: 0,
      padding: 0,
      fontSize: 30,
      fontFamily: 'PoppinsBold, HeeboBold',
      fontStyle: 'normal',
      fontStretch: 'normal',
      lineHeight: 'normal',
      letterSpacing: 'normal',
      color: theme.background.text,
    },
    h3: {
      margin: 0,
      padding: 0,
      fontSize: 20,
      fontFamily: 'PoppinsBold, HeeboBold',
      fontStyle: 'normal',
      fontStretch: 'normal',
      lineHeight: 'normal',
      letterSpacing: 'normal',
      color: theme.background.text,
    },
    h4: {
      margin: 0,
      padding: 0,
      fontSize: 16,
      fontFamily: 'PoppinsBold, HeeboBold',
      fontStyle: 'normal',
      fontStretch: 'normal',
      lineHeight: 'normal',
      letterSpacing: 'normal',
      color: theme.background.text,
      width: '100%',
    },
    text: {
      fontSize: 14,
    },
    bold: {
      fontSize: 16,
      lineHeight: 1.5,
    },
  }),
  'texts_8b5438'
);

interface TextProps {
  className?: string;
}
type H1Props = React.ComponentPropsWithoutRef<'h1'>;
const H1 = React.forwardRef<HTMLHeadingElement, TextProps & H1Props>(
  ({ className, children, ...rest }, ref) => {
    const styles = useStyles();
    return (
      <h1 ref={ref} className={cn(className, styles.h1)} {...rest}>
        {children}
      </h1>
    );
  }
);
type H2Props = React.ComponentPropsWithoutRef<'h2'>;
const H2 = React.forwardRef<HTMLHeadingElement, TextProps & H2Props>(
  ({ className, children, ...rest }, ref) => {
    const styles = useStyles();
    return (
      <h2 className={cn(className, styles.h2)} {...rest} ref={ref}>
        {children}
      </h2>
    );
  }
);
type H3Props = React.ComponentPropsWithoutRef<'h3'>;
const H3 = React.forwardRef<HTMLHeadingElement, TextProps & H3Props>(
  ({ className, children, ...rest }, ref) => {
    const styles = useStyles();
    return (
      <h3 className={cn(className, styles.h3)} {...rest} ref={ref}>
        {children}
      </h3>
    );
  }
);
type H4Props = React.ComponentPropsWithoutRef<'h4'>;
export const H4 = React.forwardRef<HTMLHeadingElement, TextProps & H4Props>(
  ({ className, children, ...rest }, ref) => {
    const styles = useStyles();
    return (
      <h4 className={cn(className, styles.h4)} {...rest} ref={ref}>
        {children}
      </h4>
    );
  }
);
type SpanProps = React.ComponentPropsWithoutRef<'span'>;
const Text = React.forwardRef<HTMLSpanElement, TextProps & SpanProps>(
  ({ className, ...rest }, ref) => {
    const styles = useStyles();
    return <span className={cn(className, styles.text)} {...rest} ref={ref} />;
  }
);

const Bold = React.forwardRef<HTMLSpanElement, TextProps & SpanProps>(
  ({ className, children, ...rest }, ref) => {
    const styles = useStyles();
    return (
      <span className={cn(className, styles.bold)} {...rest} ref={ref}>
        {children}
      </span>
    );
  }
);

export { H1, H2, H3, Text, Bold };
