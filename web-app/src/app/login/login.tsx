import React from 'react';
import { LoginIllustration } from './illustrations.tsx';
import { OwnedSession } from '../../../../auth/session.ts';
import {
  LogoIcon,
  LogoFullBlack,
} from '../../../../styles/components/logo.tsx';
import { cn, makeStyles } from '../../../../styles/css-objects/index.ts';
import { styleguide } from '../../../../styles/styleguide.ts';
import { H2 } from '../../../../styles/components/typography.tsx';
import TextField from '../../../../styles/components/inputs/TextField.tsx';
import { Button } from '../../../../styles/components/buttons.tsx';
import { brandLightTheme as theme } from '../../../../styles/theme.tsx';

const useStyles = makeStyles(() => ({
  centeredHeader: {
    display: 'flex',
    justifyContent: 'center',
  },
  logo: {
    marginTop: styleguide.gridbase * 6,
  },
  welcomeContainer: {
    marginTop: styleguide.gridbase * 4,
  },
  contentsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: styleguide.gridbase * 10,
  },
  illustration: {
    marginLeft: styleguide.gridbase * 5,
  },
  loginForm: {
    display: 'flex',
    flexDirection: 'column',
    marginRight: styleguide.gridbase * 25,
  },
  loginTitle: {
    textAlign: 'center',
    width: '100%',
    marginBottom: styleguide.gridbase * 5,
    marginTop: styleguide.gridbase * 5,
  },
  textField: {
    width: styleguide.gridbase * 40,
  },
  passwordField: {
    marginTop: styleguide.gridbase * 2,
  },
  loginButton: {
    height: styleguide.gridbase * 4,
    boxSizing: 'border-box',
    borderRadius: 20,
    fontSize: 14,
    fontWeight: 500,
    // lineHeight: 16,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: theme.primary.p9,
    backgroundColor: theme.primary.p9,
    marginTop: styleguide.gridbase * 6,
    color: theme.mono.m0,
  },
}));

export interface LoginViewProps {
  session: OwnedSession;
}

export function LoginView({ session }: LoginViewProps) {
  const styles = useStyles();
  return (
    <div>
      <div className={cn(styles.centeredHeader, styles.logo)}>
        <LogoFullBlack />
      </div>
      <div className={cn(styles.centeredHeader, styles.welcomeContainer)}>
        <H2>Welcome to Ovvio</H2>
      </div>
      <div className={cn(styles.contentsContainer)}>
        <LoginIllustration className={cn(styles.illustration)} />
        <div className={cn(styles.loginForm)}>
          <H2 className={cn(styles.loginTitle)}>Login</H2>
          <TextField className={cn(styles.textField)} placeholder="Email" />
          <TextField
            className={cn(styles.passwordField, styles.textField)}
            placeholder="Password"
          />
          <Button className={cn(styles.loginButton)}>Log In</Button>
        </div>
      </div>
    </div>
  );
}
