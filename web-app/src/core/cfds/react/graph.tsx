import { GraphManager } from '@ovvio/cfds/lib/client/graph/graph-manager';
import { Query } from '@ovvio/cfds/lib/client/graph/query';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { User } from '@ovvio/cfds/lib/client/graph/vertices';
import { WSNetworkAdapter } from '@ovvio/cfds/lib/client/net/websocket-network-adapter';
import { INCOMPATIBLE_CFDS_VERSION_CODE } from '@ovvio/cfds/lib/server/types';
import VersionMismatchView from 'app/version-mismatch';
import { useEventLogger } from 'core/analytics';
import config from 'core/config';
import { isElectron } from 'electronUtils';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { CurrentUser } from 'stores/user';
import { createIDBCache } from '../indexeddb-cache';
import { registerIndexes } from '../indexes';
import { NoteSearchEngine } from '../note-search';

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

function createNetworkAdapter(
  user: CurrentUser,
  sessionId: string,
  socketCount: number,
  maxBatchSize: number
): WSNetworkAdapter {
  const adapter = new WSNetworkAdapter(
    config.diffServer,
    sessionId,
    socketCount,
    () => user.getToken(),
    maxBatchSize,
    true
  );

  return adapter;
}

const ON_CLOSE_MESSAGE =
  'It looks like you have been editing something. ' +
  'If you leave before saving, your changes will be lost.';

// const kDemoDataPromise: Promise<ReadonlyJSONObject> = fetch('/demo.json').then(
//   response => response.json()
// );

export function CfdsClientProvider({
  user,
  sessionId,
  children,
}: CfdsClientProviderProps) {
  const eventLogger = useEventLogger();
  const [versionMismatchFound, setVersionMismatchFound] = useState(false);
  const [sendSessionAlive, setSendSessionAlive] = useState(true);
  const sessionPtrKey = `${user.id}/${sessionId}`;

  const graphManager = useMemo(() => {
    const manager = new GraphManager(
      user.id,
      key => key !== sessionPtrKey,
      createNetworkAdapter(user, sessionId, 2, 1500),
      createIDBCache(user.id)
    );

    registerIndexes(manager);

    manager.loadCache();
    // kDemoDataPromise.then(data => graphManager.importSubGraph(data, true));

    return manager;
  }, [user, sessionId, sessionPtrKey]);

  useEffect(() => {
    if (sendSessionAlive) {
      const sessionIntervalId = window.setInterval(() => {
        const socket = graphManager.socket;
        let avgLatency: number | undefined;
        let latencies: number[] | undefined;
        if (socket) {
          latencies = socket.networkAdapter.getLatencies();

          avgLatency =
            latencies.length > 0
              ? parseFloat(
                  (
                    latencies.reduce((p, c) => p + c, 0) / latencies.length
                  ).toFixed(2)
                )
              : 0;

          socket.networkAdapter.clearLatencies();
        }

        eventLogger.action('SESSION_ALIVE', {
          data: {
            avgLatency,
            pingPongs: latencies && latencies.length,
            pendingEvents: eventLogger.bufferSize,
            visibilityState: document.visibilityState,
          },
        });
      }, 10 * 1000);

      return () => {
        window.clearInterval(sessionIntervalId);
      };
    }
  }, [sendSessionAlive, eventLogger, graphManager]);

  useEffect(() => {
    if (!graphManager) {
      return;
    }

    const networkAdapter = graphManager.socket.networkAdapter;
    if (networkAdapter) {
      networkAdapter.addErrorHandler(code => {
        if (code === INCOMPATIBLE_CFDS_VERSION_CODE) {
          graphManager.disconnect();

          setVersionMismatchFound(true);

          setSendSessionAlive(false);
          eventLogger.action('SESSION_FORCED_REFRESH', {});
        }
      });
    }

    const onBeforeUnload = e => {
      if (
        Query.blockingCount(
          graphManager,
          v =>
            !v.isLocal &&
            !v.isDemoData &&
            (v.hasPendingChanges || v.inCriticalError),
          1
        ) === 0
      ) {
        return;
      }

      if (isElectron()) {
        if (
          window
            .require('electron')
            .ipcRenderer.sendSync('closing-with-local-changes')
        ) {
          return;
        }
      }

      e.preventDefault();
      e.returnValue = ON_CLOSE_MESSAGE;
      return ON_CLOSE_MESSAGE;
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      graphManager.disconnect();
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [graphManager, eventLogger]);

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
