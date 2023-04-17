import React, { useEffect, useMemo, useRef, useState } from 'react';
import { uniqueId } from '../../../../base/common.ts';
import { layout, styleguide } from '../../../../styles/index.ts';
import { RaisedButton } from '../../../../styles/components/buttons.tsx';
import { cn, makeStyles } from '../../../../styles/css-objects/index.ts';
import { MediaQueries } from '../../../../styles/responsive.ts';
import { CfdsClientProvider } from '../../core/cfds/react/graph.tsx';
import { LoginIllustration } from './illustrations.tsx';
import AuthForm from './AuthForm.tsx';
import { GlobalLogger, newLogger } from '../../../../logging/log.ts';
import { LoggerProvider } from '../../core/cfds/react/logger.tsx';
import { VertexManager } from '../../../../cfds/client/graph/vertex-manager.ts';
import { User } from '../../../../cfds/client/graph/vertices/user.ts';

const useStyles = makeStyles((theme) => ({
  root: {
    alignItems: 'stretch',
    basedOn: [layout.row, layout.flex],
  },
  ladyContainer: {
    backgroundColor: theme.background[100],
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
  userId: string;
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
  userId: string;
  sessionId: string;
  // searchParams?: MarketingParams;
}

interface LoginViewProps {
  children: React.ReactNode;
}
export default function LoginView({ children }: LoginViewProps) {
  // const isLoading = useRef(true);
  // const history = useHistory();

  const [sessionInfo, setSessionInfo] = useState<SessionInfo>({
    userId: 'ofri',
    sessionId: uniqueId(),
  });

  const [processing, setProcessing] = useState(false);

  // const auth = getAuth();

  // const dataRef = useRef({
  //   history,
  // });

  // useEffect(() => {
  //   dataRef.current = {
  //     history,
  //   };
  // });

  // useEffect(() => {
  //   return auth.onAuthStateChanged(async (user) => {
  //     if (isLoading.current) {
  //       isLoading.current = false;
  //       if (user) {
  //         const sessionId = uniqueId();
  //         const u = new UserStore(
  //           new CurrentUser(user, SessionOrigin.ALREADY_SIGNED_IN, sessionId)
  //         );
  //         setProcessing(true);
  //         const marketingParams =
  //           dataRef.current.history.extractMarketingParams(true);
  //         try {
  //           await u.save();
  //         } catch {
  //           await auth.signOut();
  //           setProcessing(false);
  //           return;
  //         }

  //         setSessionInfo({
  //           user: u,
  //           sessionId,
  //           searchParams: marketingParams,
  //           anonymous: user.isAnonymous,
  //         });
  //       }
  //       setProcessing(false);
  //     } else if (!user) {
  //       setSessionInfo(undefined);
  //     }
  //   });
  // }, [auth]);
  const onLogin: OnLoginInfoFunc = async (info) => {
    setProcessing(true);

    // try {
    //   const sessionId = uniqueId();
    //   const origin =
    //     info.isNew !== undefined && info.isNew
    //       ? SessionOrigin.SIGN_UP
    //       : SessionOrigin.SIGN_IN;
    //   const u = new UserStore(new CurrentUser(info.user, origin, sessionId));
    //   await u.save();
    //   const marketingParams = history.extractMarketingParams(true);
    //   setSessionInfo({
    //     user: u,
    //     sessionId,
    //     searchParams: marketingParams,
    //     anonymous: info.user.isAnonymous,
    //   });
    // } catch {
    //   auth.signOut();
    // } finally {
    //   setProcessing(false);
    // }
  };

  // electronSSOSignInOnLoad(onLogin).then(() => {});

  if (processing) {
    return null;
  }

  if (sessionInfo) {
    return (
      <LoggerProvider sessionInfo={sessionInfo}>
        <CfdsClientProvider
          userId={sessionInfo.userId}
          sessionId={sessionInfo.sessionId}
        >
          {children}
        </CfdsClientProvider>
      </LoggerProvider>
    );
  }

  return <LoginPage onLogin={onLogin} />;
}

export const LogoutButton = () => (
  <RaisedButton onClick={() => {} /*getAuth().signOut()*/}>Logout</RaisedButton>
);
