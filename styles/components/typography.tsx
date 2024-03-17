import { cn, makeStyles } from '../css-objects/index.ts';
import React, { ElementType } from 'react';
import { MediaQueries } from '../responsive.ts';
import { brandLightTheme as theme } from '../theme.tsx';

export const FontFamily: readonly string[] = [
  "'Poppins'",
  "'Heebo'",
  'sans-serif',
];

export const useStyles = makeStyles(
  () => ({
    h1: {
      margin: 0,
      padding: 0,
      fontFamily: 'PoppinsBold, HeeboBold',
      fontSize: 34,
      lineHeight: '40px',
      color: theme.colors.text,
      letterSpacing: 0.09,
      [MediaQueries.LaptopOnly]: {
        fontSize: 26,
        lineHeight: '32px',
        letterSpacing: 0.065,
      },
      [MediaQueries.TabletAndMobile]: {
        fontSize: 24,
        lineHeight: '30px',
        letterSpacing: 0.06,
      },
      [MediaQueries.Mobile]: {
        lineHeight: '22px',
      },
    },
    h2: {
      color: theme.colors.text,
      margin: 0,
      padding: 0,
      fontFamily: 'PoppinsBold, HeeboBold',
      fontSize: 24,
      lineHeight: '30px',
      letterSpacing: 0.15,
      [MediaQueries.Mobile]: {
        fontSize: 18,
        lineHeight: '24px',
        letterSpacing: 0.11,
      },
      [MediaQueries.Desktop]: {
        fontSize: 30,
        lineHeight: '32px',
        letterSpacing: 0.19,
      },
    },
    h3: {
      color: theme.colors.text,
      margin: 0,
      padding: 0,
    },
    h4: {
      // color: theme.colors.text,
      color: 'white',

      margin: 0,
      padding: 0,
      fontSize: 16,
      lineHeight: '22px',
      letterSpacing: 0.1,
      [MediaQueries.TabletAndMobile]: {
        fontSize: 14,
        lineHeight: '20px',
        letterSpacing: 0.09,
      },
    },
    h5: {
      fontSize: 16,
      lineHeight: '22px',
    },
    h6: {
      fontSize: 14,
      lineHeight: '21px',
      letterSpacing: 0.1,
    },

    label: {
      color: theme.colors.text,
      fontSize: 16,
      lineHeight: '24px',
      letterSpacing: 0.9,
      fontFamily: 'PoppinsBold, HeeboBold',
    },
    labelSmall: {
      fontSize: 14,
      lineHeight: '20px',
      fontFamily: 'PoppinsBold, HeeboBold',
    },
    button: {
      fontSize: 14,
      lineHeight: '20px',
      fontFamily: 'PoppinsSemiBold, HeeboSemiBold',
    },
    text: {
      color: theme.colors.text,
      fontSize: 13,
      lineHeight: '18px',
      letterSpacing: 0.06,
    },
    textSmall: {
      fontSize: 10,
      lineHeight: '14px',
    },
    bold: {
      color: theme.colors.text,
      fontFamily: 'PoppinsBold, HeeboBold',
      fontSize: 13,
      lineHeight: '18px',
      letterSpacing: 0.07,
    },
  }),
  'typography_a4e47a'
);
export { useStyles as useTypographyStyles };
type TypographyProps<T extends ElementType> =
  React.ComponentPropsWithoutRef<T> & { className?: string };

export const H1 = React.forwardRef(
  (
    { children, className, ...props }: TypographyProps<'h1'>,
    ref: React.ForwardedRef<HTMLHeadingElement>
  ) => {
    const styles = useStyles();

    return (
      <h1 ref={ref} {...props} className={cn(styles.h1, className)}>
        {children}
      </h1>
    );
  }
);

export const H2 = React.forwardRef(
  (
    { children, className, ...props }: TypographyProps<'h2'>,
    ref: React.ForwardedRef<HTMLHeadingElement>
  ) => {
    const styles = useStyles();

    return (
      <h2 ref={ref} {...props} className={cn(styles.h2, className)}>
        {children}
      </h2>
    );
  }
);

export const H3 = React.forwardRef(
  (
    { children, className, ...props }: TypographyProps<'h3'>,
    ref: React.ForwardedRef<HTMLHeadingElement>
  ) => {
    const styles = useStyles();

    return (
      <h3 ref={ref} {...props} className={cn(styles.h3, className)}>
        {children}
      </h3>
    );
  }
);

export const H4 = React.forwardRef(
  (
    { children, className, ...props }: TypographyProps<'h4'>,
    ref: React.ForwardedRef<HTMLHeadingElement>
  ) => {
    const styles = useStyles();

    return (
      <h4 ref={ref} {...props} className={cn(styles.h4, className)}>
        {children}
      </h4>
    );
  }
);
export const H6 = React.forwardRef(
  (
    { children, className, ...props }: TypographyProps<'h4'>,
    ref: React.ForwardedRef<HTMLHeadingElement>
  ) => {
    const styles = useStyles();

    return (
      <h4 ref={ref} {...props} className={cn(styles.h6, className)}>
        {children}
      </h4>
    );
  }
);
export const Text = React.forwardRef(
  (
    { children, className, ...props }: TypographyProps<'span'>,
    ref: React.ForwardedRef<HTMLSpanElement>
  ) => {
    const styles = useStyles();

    return (
      <span ref={ref} {...props} className={cn(styles.text, className)}>
        {children}
      </span>
    );
  }
);

export const TextSm = React.forwardRef(
  (
    { children, className, ...props }: TypographyProps<'span'>,
    ref: React.ForwardedRef<HTMLSpanElement>
  ) => {
    const styles = useStyles();

    return (
      <span ref={ref} {...props} className={cn(styles.textSmall, className)}>
        {children}
      </span>
    );
  }
);

export const Bold = React.forwardRef(
  (
    { children, className, ...props }: TypographyProps<'span'>,
    ref: React.ForwardedRef<HTMLSpanElement>
  ) => {
    const styles = useStyles();

    return (
      <span ref={ref} {...props} className={cn(styles.bold, className)}>
        {children}
      </span>
    );
  }
);

export const Label = React.forwardRef(
  (
    { children, className, ...props }: TypographyProps<'span'>,
    ref: React.ForwardedRef<HTMLSpanElement>
  ) => {
    const styles = useStyles();

    return (
      <span ref={ref} {...props} className={cn(styles.label, className)}>
        {children}
      </span>
    );
  }
);

export const LabelSm = React.forwardRef(
  (
    { children, className, ...props }: TypographyProps<'span'>,
    ref: React.ForwardedRef<HTMLSpanElement>
  ) => {
    const styles = useStyles();

    return (
      <span ref={ref} {...props} className={cn(styles.labelSmall, className)}>
        {children}
      </span>
    );
  }
);
