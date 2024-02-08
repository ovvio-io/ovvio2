import React from 'react';
import { cn, makeStyles } from '../css-objects/index.ts';
import { styleguide } from '../styleguide.ts';
import { layout } from '../layout.ts';
import SpinnerView from './spinner-view.tsx';
import { FontFamily, useTypographyStyles } from './typography.tsx';
import { brandLightTheme as theme } from '../theme.tsx';
export enum RaisedButtonColor {
  Primary = 'primary',
  Secondary = 'secondary',
}
const colorTransition = {
  transitionDuration: styleguide.transition.duration.short + 'ms',
  transitionProperty: 'background-color',
  transitionTimingFunction: 'linear',
};

export const useButtonStyles = makeStyles(
  () => ({
    button: {
      fontFamily: FontFamily,
      border: 'none',
      outline: 'none',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      padding: 0,
      basedOn: [layout.row, layout.centerCenter],
    },
  }),
  'buttons_b9ffab',
);

export const useFabStyles = makeStyles(
  () => ({
    fab: {
      position: 'absolute',
      right: styleguide.gridbase * 6,
      bottom: styleguide.gridbase * 6,
      width: styleguide.gridbase * 7,
      height: styleguide.gridbase * 7,
      zIndex: 100,
      borderRadius: '50%',
      backgroundColor: theme.primary.p5,
      ...colorTransition,
      ':hover': {
        backgroundColor: theme.primary.p4,
      },
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: theme.shadows.z2,
    },
  }),
  'buttons_f97674',
);

const useIconButtonStyles = makeStyles(
  () => ({
    iconButton: {
      width: styleguide.gridbase * 5,
      height: styleguide.gridbase * 5,
      borderRadius: '50%',
      backgroundColor: 'transparent',
      ...colorTransition,
      ':hover': {
        ':not(disabled)': {
          backgroundColor: theme.colors.background,
        },
      },
      ':focus': {
        ':not(disabled)': {
          backgroundColor: theme.colors.background,
        },
      },
      basedOn: [useButtonStyles.button],
    },
  }),
  'buttons_555432',
);

const useSecondaryButtonStyles = makeStyles(
  () => ({
    secondaryButton: {
      padding: styleguide.gridbase,
      boxSizing: 'border-box',
      height: styleguide.gridbase * 5,
      borderRadius: 4,
      color: theme.colors.text,
      border: `1px solid ${theme.colors.background}`,
      backgroundColor: theme.colors.background[0],
      fontSize: 14,
      // fontWeight: 500,
      fontStyle: 'normal',
      fontStretch: 'normal',
      lineHeight: 1.14,
      letterSpacing: 'normal',
      ...colorTransition,
      ':hover': {
        ':not(disabled)': {
          backgroundColor: theme.mono.m2,
        },
      },
      ':disabled': {
        backgroundColor: theme.mono.m2,
        color: theme.colors.placeholderText,
        cursor: 'not-allowed',
      },
      basedOn: [useButtonStyles.button],
    },
  }),
  'buttons_793301',
);

export const useRaisedButtonStyles = makeStyles(
  () => ({
    raisedButton: {
      padding: styleguide.gridbase,
      boxSizing: 'border-box',
      height: styleguide.gridbase * 4,
      borderRadius: styleguide.gridbase * 2,
      ...colorTransition,

      basedOn: [useButtonStyles.button, useTypographyStyles.button],
    },
    [RaisedButtonColor.Primary]: {
      color: theme.colors.background,
      backgroundColor: theme.colors.primaryButton,
      ':hover': {
        ':not(disabled)': {
          backgroundColor: theme.primary.p6,
        },
      },
      ':disabled': {
        backgroundColor: theme.primary.p6,
        cursor: 'not-allowed',
      },
    },
    [RaisedButtonColor.Secondary]: {
      color: theme.colors.text,
      backgroundColor: theme.colors.secondaryButtonActive,
      ':hover': {
        ':not(disabled)': {
          backgroundColor: theme.secondary.s6,
        },
      },
      ':disabled': {
        backgroundColor: theme.secondary.s6,
        cursor: 'not-allowed',
      },
    },
  }),
  'buttons_05a5fe',
);

const useLinkButtonStyles = makeStyles(
  (theme) => ({
    linkButton: {
      color: theme.primary[500],
      textDecoration: 'underline',
      fontSize: 16,
      height: styleguide.gridbase * 3,
      basedOn: [useButtonStyles.button],
    },
  }),
  'buttons_8deff1',
);
type ButtonProps = React.ComponentProps<'button'>;

function makeButton<TProps>(useStyles: () => any, className: string) {
  return React.forwardRef(function (
    props: ButtonProps,
    ref: React.Ref<HTMLButtonElement>,
  ) {
    const styles = useStyles();
    return (
      <button
        ref={ref || props.ref}
        {...props}
        className={cn(props.className, styles[className])}
      />
    );
  });
}

export const Button = makeButton<ButtonProps>(useButtonStyles, 'button');

export const FabButton = makeButton<ButtonProps>(useFabStyles, 'fab');

export const IconButton = makeButton<ButtonProps>(
  useIconButtonStyles,
  'iconButton',
);

export const LinkButton = makeButton<ButtonProps>(
  useLinkButtonStyles,
  'linkButton',
);

interface RaisedButtonProps extends ButtonProps {
  processing?: boolean;
  color?: RaisedButtonColor;
}

export const RaisedButton = React.forwardRef<
  HTMLButtonElement,
  RaisedButtonProps
>(function (
  {
    className,
    children,
    disabled,
    color = RaisedButtonColor.Primary,
    processing,
    ...rest
  },
  ref,
) {
  const styles = useRaisedButtonStyles();
  const disAttr = { disabled: disabled || processing };
  return (
    <button
      ref={ref}
      {...disAttr}
      className={cn(className, styles.raisedButton, styles[color])}
      {...rest}
    >
      {processing ? (
        <SpinnerView size={styleguide.gridbase * 3} color="white" />
      ) : (
        children
      )}
    </button>
  );
});

export const SecondaryButton = React.forwardRef<
  HTMLButtonElement,
  RaisedButtonProps
>(function ({ className, children, disabled, processing, ...rest }, ref) {
  const styles = useSecondaryButtonStyles();
  const disAttr = { disabled: disabled || processing };
  return (
    <button
      ref={ref}
      {...disAttr}
      className={cn(className, styles.secondaryButton)}
      {...rest}
    >
      {processing ? (
        <SpinnerView size={styleguide.gridbase * 3} color="white" />
      ) : (
        children
      )}
    </button>
  );
});
