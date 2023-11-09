import React, {
  useCallback,
  useState,
  ChangeEvent,
  KeyboardEvent,
} from 'react';
import { LoginIllustration } from './illustrations.tsx';
import { brandLightTheme as theme } from '../../styles/theme.tsx';
import { Button } from '../../styles/components/buttons.tsx';
import TextField from '../../styles/components/inputs/TextField.tsx';
import { LogoFullBlack } from '../../styles/components/logo.tsx';
import { H2 } from '../../styles/components/texts.tsx';
import { makeStyles, cn } from '../../styles/css-objects/index.ts';
import { styleguide } from '../../styles/styleguide.ts';
import { OwnedSession } from '../session.ts';
import { sendLoginEmail } from '../../net/rest-api.ts';
import { IconAlert } from '../../styles/components/new-icons/icon-alert.tsx';

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
    maxWidth: styleguide.gridbase * 52,
  },
  loginTitle: {
    textAlign: 'center',
    padding: [0, styleguide.gridbase * 2.5],
    marginBottom: styleguide.gridbase * 5,
    marginTop: styleguide.gridbase * 5,
  },
  textField: {
    width: '100%',
  },
  loginButton: {
    height: styleguide.gridbase * 4,
    width: styleguide.gridbase * 40,
    boxSizing: 'border-box',
    borderRadius: 20,
    fontSize: 14,
    fontWeight: 500,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: theme.primary.p9,
    backgroundColor: theme.primary.p9,
    margin: [0, 'auto'],
    marginTop: styleguide.gridbase * 4,
    color: theme.mono.m0,
  },
  errorTextContainer: {
    marginTop: styleguide.gridbase,
    marginLeft: styleguide.gridbase,
    display: 'flex',
    justifyContent: 'space-between',
  },
  errorText: {
    color: theme.supporting.O4,
    fontSize: 13,
    width: styleguide.gridbase * 36.5,
  },
  errorIcon: {
    marginTop: 1,
  },
  textFieldContainer: {
    width: styleguide.gridbase * 40,
    margin: [0, 'auto'],
  },
  successContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: styleguide.gridbase * 4,
  },
  tryAgainButton: {
    marginTop: styleguide.gridbase * 2,
    marginBottom: styleguide.gridbase * 4,
    color: theme.primary.p10,
  },
}));

interface LoginContentsProps extends LoginViewProps {
  onClick: (email: string) => void;
  showError: boolean;
  initialValue: string;
}

function LoginContents({
  session,
  onClick,
  showError,
  initialValue,
}: LoginContentsProps) {
  const styles = useStyles();
  const [email, setEmail] = useState(initialValue);
  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value),
    [setEmail]
  );
  const onKeyUp = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        const value = (event.target as HTMLInputElement).value;
        setEmail(value);
        onClick(value);
      }
    },
    [setEmail]
  );
  return (
    <div className={cn(styles.contentsContainer)}>
      <LoginIllustration className={cn(styles.illustration)} />
      <div className={cn(styles.loginForm)}>
        <H2 className={cn(styles.loginTitle)}>
          Enter your email address to access Ovvio
        </H2>
        <div className={cn(styles.textFieldContainer)}>
          <TextField
            className={cn(styles.textField)}
            placeholder="Email"
            value={email}
            onChange={onChange}
            onKeyUp={onKeyUp}
          />
          {showError && (
            <div className={cn(styles.errorTextContainer)}>
              <IconAlert className={cn(styles.errorIcon)} />
              <span className={cn(styles.errorText)}>
                Something went wrong. Please try again.
              </span>
            </div>
          )}
        </div>
        <Button
          className={cn(styles.loginButton)}
          onClick={() => onClick(email)}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

interface LoginSuccessProps {
  onClick: () => void;
}

function LoginSuccess({ onClick }: LoginSuccessProps) {
  const styles = useStyles();
  return (
    <div className={cn(styles.successContainer)}>
      <div>Check your email inbox to continue login process</div>
      <Button className={cn(styles.tryAgainButton)} onClick={onClick}>
        Didn’t receive the mail? Try again
      </Button>
      <LoginIllustration />
    </div>
  );
}

export interface LoginViewProps {
  session: OwnedSession;
}

export function LoginView({ session }: LoginViewProps) {
  const styles = useStyles();
  const [showError, setShowError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const onClick = useCallback(
    async (value: string) => {
      if (!value) {
        return;
      }
      setEmail(value);
      if (await sendLoginEmail(session, value)) {
        setShowSuccess(true);
        setShowError(false);
      } else {
        setShowError(true);
        setShowSuccess(false);
      }
    },
    [setShowError, setShowSuccess]
  );
  return (
    <div>
      <div className={cn(styles.centeredHeader, styles.logo)}>
        <LogoFullBlack />
      </div>
      <div className={cn(styles.centeredHeader, styles.welcomeContainer)}>
        <H2>Welcome to Ovvio</H2>
      </div>
      {showSuccess ? (
        <LoginSuccess onClick={() => setShowSuccess(false)} />
      ) : (
        <LoginContents
          session={session}
          onClick={onClick}
          showError={showError}
          initialValue={email}
        />
      )}
    </div>
  );
}
