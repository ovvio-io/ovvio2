import React, { useState, useRef, useContext } from 'react';

import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { styleguide, layout } from '@ovvio/styles/lib';
import { TextField } from '@ovvio/styles/lib/components/inputs';
import {
  RaisedButton,
  useRaisedButtonStyles,
} from '@ovvio/styles/lib/components/buttons';
import { IconGoogle } from '@ovvio/styles/lib/components/icons';
import { Dialog } from '@ovvio/styles/lib/components/dialog';
import { isElectron } from 'electronUtils';
import { toastContext } from '@ovvio/styles/lib/components/toast';
import { OnLoginInfoFunc } from '.';
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  getAdditionalUserInfo,
  getAuth,
  GoogleAuthProvider,
  linkWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { H1, H2 } from '@ovvio/styles/lib/components/texts';

const useStyles = makeStyles(theme => ({
  form: {
    alignItems: 'stretch',
    width: '100%',
    maxWidth: styleguide.gridbase * 37,
    textAlign: 'center',
    basedOn: [layout.column],
  },
  h1: {
    marginBottom: styleguide.gridbase * 2,
  },
  h2: {
    marginBottom: styleguide.gridbase * 3,
  },
  text: {
    marginBottom: styleguide.gridbase * 3,
  },
  button: {
    height: styleguide.gridbase * 5,
    margin: 0,
    marginBottom: styleguide.gridbase * 3,
  },
  googleButton: {
    color: theme.background.text,
    border: `1px solid ${theme.primary[500]}`,
    backgroundColor: theme.background[0],
    padding: 0,
    ':hover': {
      ':not(disabled)': {
        backgroundColor: theme.background[0],
      },
    },
    googleIcon: {
      width: styleguide.gridbase * 5,
      height: styleguide.gridbase * 5,
    },
    basedOn: [useRaisedButtonStyles.raisedButton],
  },
  googleIcon: {},
  link: {
    color: theme.primary[500],
    cursor: 'pointer',
  },
  error: {
    color: 'red',
  },
}));

const EMAIL_REGEX =
  /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/; // eslint-disable-line

enum AUTH_STATE {
  SIGN_UP = 'sign-up',
  LOGIN = 'login',
  RESET_PASSWORD = 'reset-password',
}

type GoToState = (state: AUTH_STATE) => void;

interface SignUpFormProps {
  goToState: GoToState;
  signInWithGoogle: (e: any) => Promise<void>;
  onLogin: OnLoginInfoFunc;
}
function SignUpForm({ goToState, signInWithGoogle, onLogin }: SignUpFormProps) {
  const styles = useStyles();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  const onSubmit = async e => {
    e.stopPropagation();
    e.preventDefault();
    if (!email || !password || !name) {
      return setError('Please fill all the fields');
    }

    if (!EMAIL_REGEX.test(email)) {
      return setError('Please enter a valid email address');
    }

    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    if (confirmPassword !== password) {
      return setError('Passwords do not match');
    }

    const auth = getAuth();

    try {
      setProcessing(true);
      setError('');
      const { user } = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await updateProfile(user, {
        displayName: name,
      });
      onLogin({
        user,
        isNew: true,
      });
    } catch (error) {
      const { message } = error;
      setError(message);
    } finally {
      setProcessing(false);
    }
  };

  const googleSignIn = async (e: any) => {
    try {
      setProcessing(true);
      await signInWithGoogle(e);
    } catch (err) {
      setProcessing(false);
      setError(err.message);
    }
  };

  return (
    <form className={cn(styles.form)} onSubmit={onSubmit}>
      <H1 className={cn(styles.h1)}>Sign Up</H1>
      <H2 className={cn(styles.h2)}>Create your free account</H2>
      <TextField
        className={cn(styles.text)}
        value={email}
        type="email"
        //name="email"
        placeholder="Email"
        autoComplete="Username"
        onChange={(e: any) => setEmail(e.target.value)}
        required
      />
      <TextField
        className={cn(styles.text)}
        value={password}
        type="password"
        //name="password"
        placeholder="Password"
        autoComplete="new-password"
        onChange={(e: any) => setPassword(e.target.value)}
        required
      />
      <TextField
        className={cn(styles.text)}
        value={confirmPassword}
        type="password"
        name="validatePassword"
        placeholder="Confirm Password"
        autoComplete="new-password"
        onChange={(e: any) => setConfirmPassword(e.target.value)}
        required
      />
      <TextField
        className={cn(styles.text)}
        value={name}
        type="text"
        name="name"
        placeholder="Full name"
        onChange={(e: any) => setName(e.target.value)}
        required
      />
      {error && <p className={cn(styles.error)}>{error}</p>}
      <RaisedButton
        className={cn(styles.button)}
        disabled={!email || !password || processing}
      >
        Sign up
      </RaisedButton>
      {isElectron() ? null : (
        <RaisedButton
          className={cn(styles.button, styles.googleButton)}
          onClick={googleSignIn}
          type="button"
        >
          <IconGoogle className={cn(styles.googleIcon)} />
          <span className={cn(layout.flex)}>Sign in with Google</span>
          <div className={cn(styles.googleIcon)} />
        </RaisedButton>
      )}
      <p>
        Already have an account?{' '}
        <span
          className={cn(styles.link)}
          onClick={() => goToState(AUTH_STATE.LOGIN)}
        >
          Log in
        </span>
      </p>
    </form>
  );
}

interface LoginFormProps {
  goToState: GoToState;
  signInWithGoogle: (e: any) => Promise<void>;
  onLogin: OnLoginInfoFunc;
}
function LoginForm({ goToState, signInWithGoogle, onLogin }: LoginFormProps) {
  const styles = useStyles();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  const onSubmit = async (e: any) => {
    e.stopPropagation();
    e.preventDefault();

    if (!email || !password) {
      return setError('Please enter email address and password');
    }

    if (!EMAIL_REGEX.test(email)) {
      return setError('Please enter a valid email address');
    }

    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }
    setProcessing(true);
    setError('');

    const auth = getAuth();

    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      onLogin({ user });
    } catch (error) {
      const { message } = error;
      setProcessing(false);
      setError(message);
    }
  };
  const googleSignIn = async e => {
    try {
      setProcessing(true);
      await signInWithGoogle(e);
    } catch (err) {
      setProcessing(false);
      setError(err.message);
    }
  };
  return (
    <form className={cn(styles.form)} onSubmit={onSubmit}>
      <H1 className={cn(styles.h1)}>Sign In</H1>
      <H2 className={cn(styles.h2)}>Welcome back to Ovvio</H2>
      <TextField
        className={cn(styles.text)}
        value={email}
        type="email"
        name="email"
        placeholder="email"
        autoComplete="username"
        onChange={(e: any) => setEmail(e.target.value)}
        required
      />
      <TextField
        className={cn(styles.text)}
        value={password}
        type="password"
        name="password"
        placeholder="password"
        autoComplete="current-password"
        onChange={(e: any) => setPassword(e.target.value)}
        required
      />
      {error && <p className={cn(styles.error)}>{error}</p>}
      <RaisedButton
        className={cn(styles.button)}
        disabled={!email || !password || processing}
      >
        Log in
      </RaisedButton>
      {isElectron() ? null : (
        <RaisedButton
          className={cn(styles.button, styles.googleButton)}
          onClick={googleSignIn}
          type="button"
        >
          <IconGoogle className={cn(styles.googleIcon)} />
          <span className={cn(layout.flex)}>Sign in with Google</span>
          <div className={cn(styles.googleIcon)} />
        </RaisedButton>
      )}
      <p
        className={cn(styles.link)}
        onClick={() => goToState(AUTH_STATE.RESET_PASSWORD)}
      >
        Forgot password?
      </p>
      <p>
        Don't have an account yet?{' '}
        <span
          className={cn(styles.link)}
          onClick={() => goToState(AUTH_STATE.SIGN_UP)}
        >
          Sign up
        </span>
      </p>
    </form>
  );
}

interface ResetPasswordFormProps {
  goToState: GoToState;
}
function ResetPasswordForm({ goToState }: ResetPasswordFormProps) {
  const styles = useStyles();
  const toastProvider = useContext(toastContext);

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  const onSubmit = async e => {
    e.preventDefault();
    e.stopPropagation();

    if (!email || !EMAIL_REGEX.test(email)) {
      return setError('Please enter a valid email address');
    }

    setProcessing(true);

    const auth = getAuth();
    try {
      await sendPasswordResetEmail(auth, email);
      toastProvider.displayToast({
        duration: 2000,
        text: 'Email sent. check your inbox',
      });
      goToState(AUTH_STATE.LOGIN);
    } catch (err) {
      if (err.code === 'auth/invalid-email') {
        return setError('Please enter a valid email address');
      }
      if (err.code === 'auth/user-not-found') {
        return setError('The requested email does not exist');
      }
      setError('Something went wrong, please try again');
    } finally {
      setProcessing(false);
    }
  };
  return (
    <form className={cn(styles.form)} onSubmit={onSubmit}>
      <H1 className={cn(styles.h1)}>Forgot Password?</H1>
      <H2 className={cn(styles.h2)}>
        Enter your email to receive your password reset instructions
      </H2>
      <TextField
        className={cn(styles.text)}
        value={email}
        type="email"
        name="email"
        placeholder="email"
        onChange={e => setEmail(e.currentTarget.value)}
        required
      />
      {error && <p className={cn(styles.error)}>{error}</p>}
      <RaisedButton
        className={cn(styles.button)}
        disabled={!email || processing}
      >
        RESET PASSWORD
      </RaisedButton>
      <p
        className={cn(styles.link)}
        onClick={() => goToState(AUTH_STATE.LOGIN)}
      >
        Back to login
      </p>
    </form>
  );
}

interface AuthFormViewProps {
  onLogin: OnLoginInfoFunc;
}
export default function AuthFormView({ onLogin }: AuthFormViewProps) {
  const [loginState, setLoginState] = useState(AUTH_STATE.SIGN_UP);
  const [requestPassword, setRequestPassword] = useState(false);
  const [knownEmail, setKnownEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const credentials = useRef(null);

  const auth = getAuth();

  const signInWithGoogle = async e => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const userCred = await signInWithPopup(auth, new GoogleAuthProvider());

      const additionalUserInfo = await getAdditionalUserInfo(userCred);

      onLogin({
        user: userCred.user,
        isNew: additionalUserInfo ? additionalUserInfo.isNewUser : false,
      });
    } catch (error) {
      if (error.code === 'auth/account-exists-with-different-credential') {
        const { credential, email } = error;

        const methods = await fetchSignInMethodsForEmail(auth, email);

        if (methods[0] === 'password') {
          setKnownEmail(email);
          setCurrentPassword('');
          setRequestPassword(true);
          credentials.current = credential;
        }
      } else {
        throw error;
      }
    }
  };
  const linkAccount = async (event: any) => {
    event.preventDefault();
    event.stopPropagation();

    const userCred = await signInWithEmailAndPassword(
      auth,
      knownEmail,
      currentPassword
    );

    await linkWithCredential(userCred.user, this.state._credentials);
    onLogin({ user: userCred.user });
  };
  const dismissLink = () => {
    setKnownEmail(null);
    setCurrentPassword(null);
    setRequestPassword(false);
    credentials.current = null;
  };

  let content = null;
  if (loginState === AUTH_STATE.SIGN_UP) {
    content = (
      <SignUpForm
        goToState={setLoginState}
        signInWithGoogle={signInWithGoogle}
        onLogin={onLogin}
      />
    );
  } else if (loginState === AUTH_STATE.RESET_PASSWORD) {
    content = <ResetPasswordForm goToState={setLoginState} />;
  } else {
    content = (
      <LoginForm
        goToState={setLoginState}
        signInWithGoogle={signInWithGoogle}
        onLogin={onLogin}
      />
    );
  }
  return (
    <React.Fragment>
      {content}
      <Dialog
        className={cn(layout.column)}
        open={requestPassword}
        onClickOutside={dismissLink}
      >
        <form onSubmit={linkAccount}>
          <p>
            The email '{knownEmail}' is already registered, please enter the
            password to link your Google account
          </p>
          <TextField type="email" readOnly={true} value={knownEmail} />
          <TextField
            name="currentPassword"
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.currentTarget.value)}
          />
          <RaisedButton>Link accounts</RaisedButton>
        </form>
      </Dialog>
    </React.Fragment>
  );
}
