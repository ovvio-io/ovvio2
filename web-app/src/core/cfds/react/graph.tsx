import { GraphManager } from '../../../../../cfds/client/graph/graph-manager.ts';
import { VertexManager } from '../../../../../cfds/client/graph/vertex-manager.ts';
import { User } from '../../../../../cfds/client/graph/vertices/user.ts';
import VersionMismatchView from '../../../app/version-mismatch/index.tsx';
import React, {
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'https://esm.sh/react@18.2.0';
import { CurrentUser } from '../../../stores/user.ts';
import { NoteSearchEngine } from '../../../../../cfds/client/graph/note-search.ts';
import { useLogger } from './logger.tsx';

type ContextProps = {
  graphManager?: GraphManager;
  sessionId?: string;
  user?: CurrentUser;
  searchEngine?: NoteSearchEngine;
};

export const CFDSContext = React.createContext<ContextProps>({});

export function useGraphManager(): GraphManager {
  return useContext(CFDSContext).graphManager!;
}
export function useRootUser(): VertexManager<User> {
  const graph = useGraphManager();
  const key = graph.rootKey;
  const user = useMemo<VertexManager<User>>(
    () => graph && graph.getVertexManager<User>(key),
    [graph, key]
  );
  return user;
}
export function useCfdsContext(): ContextProps {
  return useContext(CFDSContext);
}

interface CfdsClientProviderProps {
  user: any;
  sessionId: string;
  children: React.ReactNode;
}

// const kDemoDataPromise: Promise<ReadonlyJSONObject> = fetch('/demo.json').then(
//   response => response.json()
// );

export function CfdsClientProvider({
  user,
  sessionId,
  children,
}: CfdsClientProviderProps) {
  const logger = useLogger();
  const [versionMismatchFound, setVersionMismatchFound] = useState(false);
  const sessionPtrKey = `${user.id}/${sessionId}`;

  const graphManager = useMemo(() => {
    const manager = new GraphManager(
      user.id,
      (key: string) => key !== sessionPtrKey,
      'http://localhost'
    );

    manager.loadLocalContents();
    // kDemoDataPromise.then(data => graphManager.importSubGraph(data, true));

    return manager;
  }, [user, sessionId, sessionPtrKey]);

  useEffect(() => {
    const sessionIntervalId = setInterval(() => {
      logger.log({
        severity: 'INFO',
        event: 'SESSION_ALIVE',
        foreground: document.visibilityState === 'visible',
      });
    }, 10 * 1000);

    return () => {
      clearInterval(sessionIntervalId);
    };
  }, [logger, graphManager]);

  const ctx = useMemo<ContextProps>(
    () => ({
      graphManager: graphManager,
      sessionId,
      user,
      searchEngine: new NoteSearchEngine(graphManager),
    }),
    [graphManager, sessionId, user]
  );

  if (versionMismatchFound) {
    return <VersionMismatchView />;
  }

  return <CFDSContext.Provider value={ctx}>{children}</CFDSContext.Provider>;
}
