import { uniqueId } from '@ovvio/base/lib/utils';
import { layout, styleguide } from '@ovvio/styles/lib';
import { RaisedButton } from '@ovvio/styles/lib/components/buttons';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { MediaQueries } from '@ovvio/styles/lib/responsive';
import { EventLogger, EventLoggerProvider } from 'core/analytics';
import { CfdsClientProvider } from 'core/cfds/react/graph';
import { MarketingParams, useHistory } from 'core/react-utils/history';
import { electronSSOSignInOnLoad } from 'electronUtils';
import { getAuth, User } from 'firebase/auth';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CurrentUser,
  SessionOrigin,
  UserProvider,
  UserStore,
} from 'stores/user';
import { LoginIllustration } from './illustrations';
import AuthForm from './AuthForm';

const useStyles = makeStyles(theme => ({
  root: {
    alignItems: 'stretch',
    basedOn: [layout.row, layout.flex],
  },
  ladyContainer: {
    backgroundColor: theme.background[150],
    flexBasis: '50%',
    basedOn: [layout.column, layout.centerCenter, layout.flexSpacer],
    [MediaQueries.Mobile]: {
      display: 'none',
    },
  },
  illustration: {
    boxSizing: 'border-box',
    padding: styleguide.gridbase * 2,
    width: '100%',
    maxWidth: styleguide.gridbase * 80,
  },
  formContainer: {
    backgroundColor: theme.background[0],
    flexBasis: '50%',
    flexShrink: 1,
    basedOn: [layout.column, layout.centerCenter, layout.flex],
    [MediaQueries.Mobile]: {
      flexBasis: '100%',
    },
  },
  plant: {
    alignSelf: 'flex-end',
    marginRight: styleguide.gridbase * 8,
  },
}));

interface OnLoginInfo {
  user: User;
  isNew?: boolean;
}

export type OnLoginInfoFunc = (info: OnLoginInfo) => Promise<void>;

interface LoginPageProps {
  onLogin: OnLoginInfoFunc;
}
const LoginPage = ({ onLogin }: LoginPageProps) => {
  const styles = useStyles();
  return (
    <div className={cn(styles.root)}>
      <div className={cn(styles.ladyContainer)}>
        <LoginIllustration className={cn(styles.illustration)} />
      </div>
      <div className={cn(styles.formContainer)}>
        <AuthForm onLogin={onLogin} />
      </div>
    </div>
  );
};

export interface SessionInfo {
  user: UserStore;
  sessionId: string;
  searchParams: MarketingParams;
  anonymous: boolean;
}

interface LoginViewProps {
  children: any;
}
export default function LoginView({ children }: LoginViewProps) {
  const isLoading = useRef(true);
  const history = useHistory();

  const [sessionInfo, setSessionInfo] = useState<SessionInfo>();

  const [processing, setProcessing] = useState(true);

  const auth = getAuth();

  const dataRef = useRef({
    history,
  });

  useEffect(() => {
    dataRef.current = {
      history,
    };
  });

  useEffect(() => {
    return auth.onAuthStateChanged(async user => {
      if (isLoading.current) {
        isLoading.current = false;
        if (user) {
          const sessionId = uniqueId();
          const u = new UserStore(
            new CurrentUser(user, SessionOrigin.ALREADY_SIGNED_IN, sessionId)
          );
          setProcessing(true);
          const marketingParams =
            dataRef.current.history.extractMarketingParams(true);
          try {
            await u.save();
          } catch {
            await auth.signOut();
            setProcessing(false);
            return;
          }

          setSessionInfo({
            user: u,
            sessionId,
            searchParams: marketingParams,
            anonymous: user.isAnonymous,
          });
        }
        setProcessing(false);
      } else if (!user) {
        setSessionInfo(undefined);
      }
    });
  }, [auth]);
  const eventLogger = useMemo(
    () => new EventLogger(sessionInfo),
    [sessionInfo]
  );

  const onLogin: OnLoginInfoFunc = async info => {
    setProcessing(true);

    try {
      const sessionId = uniqueId();
      const origin =
        info.isNew !== undefined && info.isNew
          ? SessionOrigin.SIGN_UP
          : SessionOrigin.SIGN_IN;
      const u = new UserStore(new CurrentUser(info.user, origin, sessionId));
      await u.save();
      const marketingParams = history.extractMarketingParams(true);
      setSessionInfo({
        user: u,
        sessionId,
        searchParams: marketingParams,
        anonymous: info.user.isAnonymous,
      });
    } catch {
      auth.signOut();
    } finally {
      setProcessing(false);
    }
  };

  electronSSOSignInOnLoad(onLogin).then(() => {});

  if (processing) {
    return null;
  }

  if (sessionInfo) {
    return (
      <UserProvider value={sessionInfo.user}>
        <EventLoggerProvider eventLogger={eventLogger}>
          <CfdsClientProvider
            user={sessionInfo.user}
            sessionId={sessionInfo.sessionId}
          >
            {children}
          </CfdsClientProvider>
        </EventLoggerProvider>
      </UserProvider>
    );
  }

  return <LoginPage onLogin={onLogin} />;
}

export const LogoutButton = () => (
  <RaisedButton onClick={() => getAuth().signOut()}>Logout</RaisedButton>
);
