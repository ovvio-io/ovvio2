import React, { useState, useEffect, useContext, useMemo } from 'react';
import { retry } from '../base/time.ts';
import { Logger } from '../logging/log.ts';
import { createNewSession, getBaseURL } from '../net/rest-api.ts';
import { loadAllSessions, storeSessionData } from './idb.ts';
import { OwnedSession, TrustPool, generateKeyPair } from './session.ts';
import { useLogger } from '../web-app/src/core/cfds/react/logger.tsx';
import LoadingView from '../web-app/src/app/loading-view.tsx';
import { LoginView } from './login/login.tsx';
import { assert } from '../base/error.ts';
import { cn, makeStyles } from '../styles/css-objects/index.ts';
import { styleguide } from '../styles/styleguide.ts';
import { App, SkeletonApp } from '../styles/components/app.tsx';
import { CfdsClientProvider } from '../web-app/src/core/cfds/react/graph.tsx';
import { GraphManager } from '../cfds/client/graph/graph-manager.ts';
import { Repository } from '../repo/repo.ts';

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
  trustPool?: TrustPool;
}

const sessionContext = React.createContext({} as SessionContext);

interface CancelHandle {
  cancelled?: true;
}

async function setupSession(
  logger: Logger,
  callback: (trustPool: TrustPool) => void,
  cancelHandle: CancelHandle
): Promise<void> {
  while (cancelHandle.cancelled !== true) {
    try {
      const session = await retry(
        async () => {
          let { currentSession, roots, trustedSessions } =
            (await loadAllSessions())[0] || {};
          if (!currentSession) {
            const keys = await generateKeyPair();
            const [publicSession, serverRoots] = await createNewSession(
              keys.publicKey
            );
            if (publicSession) {
              currentSession = {
                ...publicSession,
                privateKey: keys.privateKey,
              };
            }
            roots = serverRoots!;
            await storeSessionData(currentSession, roots, trustedSessions);
          }
          const pool = new TrustPool(
            currentSession,
            roots,
            trustedSessions,
            () => {
              storeSessionData(
                pool.currentSession,
                pool.roots,
                pool.trustedSessions
              );
            }
          );
          return pool;
        },
        30000,
        5000
      );
      if (session) {
        callback(session);
        break;
      }
    } catch (err: any) {
      debugger;
      logger.log({
        severity: 'INFO',
        error: 'SessionError',
        type: 'AnonCreationFailed',
      });
    }
  }
}

export function useMaybeTrustPool(): TrustPool | undefined {
  const [trustPool, setTrustPool] = useState<TrustPool | undefined>();
  const logger = useLogger();
  useEffect(() => {
    const handle: CancelHandle = {};
    setupSession(
      logger,
      (p) => {
        setTrustPool(p);
      },
      handle
    );
    return () => {
      handle.cancelled = true;
    };
  }, [logger, setTrustPool]);
  return trustPool;
}

export function useTrustPool(): TrustPool {
  const ctx = useContext(sessionContext);
  assert(ctx.trustPool !== undefined);
  return ctx.trustPool;
}

export function useSession(): OwnedSession {
  return useTrustPool().currentSession;
}

export type SessionProviderProps = React.PropsWithChildren<{
  className?: string;
}>;

export async function loadEssentialRepositories(
  graph: GraphManager
): Promise<void> {
  await graph.loadRepository(Repository.id('sys', 'dir'));
  // await graph.syncRepository(Repository.id('sys', 'dir'));
  if (graph.trustPool.currentSession.owner) {
    await graph.loadRepository(Repository.id('user', graph.rootKey));
  }
  // await graph.syncRepository(Repository.id('user', graph.rootKey));
}
export function SessionProvider({ children, className }: SessionProviderProps) {
  const trustPool = useMaybeTrustPool();
  const styles = useStyles();
  const baseUrl = getBaseURL();
  const graph = useMemo(
    () => (trustPool ? new GraphManager(trustPool, baseUrl) : undefined),
    [trustPool, baseUrl]
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (graph) {
      loadEssentialRepositories(graph).then(() => setLoading(false));
    }
  }, [graph, setLoading]);

  if (!trustPool || loading) {
    return (
      <SkeletonApp>
        <div className={cn(styles.contentsArea)}>
          <LoadingView />
        </div>
      </SkeletonApp>
    );
  }

  if (!trustPool.currentSession.owner) {
    return <LoginView session={trustPool.currentSession} />;
  }
  let banner =
    trustPool.currentSession.owner !== 'root' ? null : (
      <div className={cn(styles.rootUserBanner)}>
        WARNING: Running as root user
      </div>
    );
  return (
    <sessionContext.Provider value={{ trustPool }}>
      <CfdsClientProvider graphManager={graph!}>
        {banner}
        <div className={cn(styles.contentsArea)}>{children}</div>
      </CfdsClientProvider>
    </sessionContext.Provider>
  );
}
