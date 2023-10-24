import React, { useState, useEffect, useContext } from 'react';
import { retry } from '../base/time.ts';
import { Logger } from '../logging/log.ts';
import { createNewSession } from '../net/rest-api.ts';
import { loadAllSessions, storeSession } from './idb.ts';
import { OwnedSession, generateKeyPair } from './session.ts';
import { useLogger } from '../web-app/src/core/cfds/react/logger.tsx';
import LoadingView from '../web-app/src/app/loading-view.tsx';
import { LoginView } from './login/login.tsx';
import { assert } from '../base/error.ts';
import { cn, makeStyles } from '../styles/css-objects/index.ts';
import { layout } from '../styles/layout.ts';
import { styleguide } from '../styles/styleguide.ts';

const kRootBannerHeight = styleguide.gridbase * 6;

const useStyles = makeStyles((theme) => ({
  rootUserBanner: {
    boxSizing: 'border-box',
    width: '100%',
    height: kRootBannerHeight,
    backgroundColor: 'red',
    color: 'white',
    fontWeight: 700,
    textAlign: 'center',
    fontSize: 24,
    margin: 'auto',
    paddingTop: 6,
  },
  contentsArea: {
    height: `calc(100vh - ${kRootBannerHeight}px)`,
    width: '100%',
  },
}));

export interface SessionContext {
  session?: OwnedSession;
}

const sessionContext = React.createContext({} as SessionContext);

interface CancelHandle {
  cancelled?: true;
}

async function setupSession(
  logger: Logger,
  callback: (session: OwnedSession) => void,
  cancelHandle: CancelHandle
): Promise<void> {
  while (cancelHandle.cancelled !== true) {
    try {
      const session = await retry(
        async () => {
          let s = (await loadAllSessions())[0];
          if (!s) {
            const keys = await generateKeyPair();
            const publicSession = await createNewSession(keys.publicKey);
            if (publicSession) {
              s = {
                ...publicSession,
                privateKey: keys.privateKey,
              };
              await storeSession(s);
            }
          }
          return s;
        },
        30000,
        5000
      );
      if (session) {
        callback(session);
        break;
      }
    } catch (err: any) {
      logger.log({
        severity: 'INFO',
        error: 'SessionError',
        type: 'AnonCreationFailed',
      });
    }
  }
}

export function useMaybeSession(): OwnedSession | undefined {
  const [session, setSession] = useState<OwnedSession | undefined>();
  const logger = useLogger();
  useEffect(() => {
    const handle: CancelHandle = {};
    setupSession(
      logger,
      (s) => {
        setSession(s);
      },
      handle
    );
    return () => {
      handle.cancelled = true;
    };
  }, [logger, setSession]);
  return session;
}

export function useSession(): OwnedSession {
  const ctx = useContext(sessionContext);
  assert(ctx.session !== undefined);
  return ctx.session;
}

export type SessionProviderProps = React.PropsWithChildren<{
  className?: string;
}>;

export function SessionProvider({ children, className }: SessionProviderProps) {
  const session = useMaybeSession();
  const styles = useStyles();
  if (!session) {
    return <LoadingView />;
  }
  if (!session.owner) {
    return <LoginView session={session} />;
  }
  let banner =
    session.owner !== 'root' ? null : (
      <div className={cn(styles.rootUserBanner)}>
        WARNING: Running as root user
      </div>
    );
  return (
    <sessionContext.Provider value={{ session }}>
      {/* <div className={className}> */}
      {banner}
      <div className={cn(styles.contentsArea)}>{children}</div>
      {/* </div> */}
    </sessionContext.Provider>
  );
}
