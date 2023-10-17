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

const useStyles = makeStyles((theme) => ({
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
  illustration: {
    marginLeft: styleguide.gridbase * 5,
    marginTop: styleguide.gridbase * 10,
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
      <LoginIllustration className={cn(styles.illustration)} />
    </div>
  );
}
