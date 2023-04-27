import { GraphManager } from '../../../../../cfds/client/graph/graph-manager.ts';
import { VertexManager } from '../../../../../cfds/client/graph/vertex-manager.ts';
import { User } from '../../../../../cfds/client/graph/vertices/user.ts';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { NoteSearchEngine } from '../../../../../cfds/client/graph/note-search.ts';
import { useLogger } from './logger.tsx';
import { NS_FILTER, NS_USERS } from '../../../../../cfds/base/scheme-types.ts';
import { usePartialVertex, useVertex } from './vertex.ts';
import { UserSettings } from '../../../../../cfds/client/graph/vertices/user-settings.ts';
import { FilterKeyNotes, FilterKeyTasks } from '../../../app/index.tsx';
import { NoteType } from '../../../../../cfds/client/graph/vertices/note.ts';
import { SharedQueriesManager } from '../../../../../cfds/client/graph/shared-queries.ts';
import { Scheme } from '../../../../../cfds/base/scheme.ts';

type ContextProps = {
  graphManager?: GraphManager;
  sessionId?: string;
};

export const CFDSContext = React.createContext<ContextProps>({});

export function useGraphManager(): GraphManager {
  return useContext(CFDSContext).graphManager!;
}

export function useSharedQueriesManager(): SharedQueriesManager {
  return useGraphManager().sharedQueriesManager;
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

export function usePartialCurrentUser<K extends keyof User>(
  keys?: K[]
): Pick<User, K> & User {
  const graph = useGraphManager();
  return usePartialVertex(graph.getRootVertexManager<User>(), keys || []);
}

export function useCurrentUser(): User {
  const graph = useGraphManager();
  return useVertex(graph.getRootVertexManager<User>());
}

export function useUserSettings(): UserSettings {
  const u = usePartialCurrentUser(['settings']);
  return useVertex(u.settings.manager as VertexManager<UserSettings>);
}

export function usePartialUserSettings<K extends keyof UserSettings>(
  keys?: K[]
): Pick<UserSettings, K> & UserSettings {
  const u = usePartialCurrentUser(['settings']);
  return usePartialVertex(
    u.settings.manager as VertexManager<UserSettings>,
    keys || []
  );
}

export function useCfdsContext(): ContextProps {
  return useContext(CFDSContext);
}

interface CfdsClientProviderProps {
  userId: string;
  sessionId: string;
  children: React.ReactNode;
}

// const kDemoDataPromise: Promise<ReadonlyJSONObject> = fetch('/demo.json').then(
//   response => response.json()
// );

export function CfdsClientProvider({
  userId,
  sessionId,
  children,
}: CfdsClientProviderProps) {
  const logger = useLogger();
  const sessionPtrKey = `${userId}/${sessionId}`;

  const graphManager = useMemo(() => {
    const manager = new GraphManager(
      userId,
      (key: string) => key !== sessionPtrKey,
      'http://localhost:8080'
    );

    const rootVertMgr = manager.getRootVertexManager();
    if (rootVertMgr.record.isNull) {
      rootVertMgr.scheme = Scheme.user();
    }

    // Create local filters for our main UI tabs
    manager.createVertex(
      NS_FILTER,
      { owner: userId, noteType: NoteType.Note },
      FilterKeyNotes,
      true
    );
    manager.createVertex(
      NS_FILTER,
      { owner: userId, noteType: NoteType.Task },
      FilterKeyTasks,
      true
    );
    // Load cached contents, then select pinned workspaces which is the default
    // mode after reload.
    manager.loadLocalContents().finally(() => {
      const user = manager.getRootVertex<User>();
      if (user.isNull) {
        return;
      }
      const settings = user.settings;
      if (settings.isNull) {
        return;
      }
      const pinnedWorkspaces = settings.pinnedWorkspaces;
      manager.sharedQueriesManager.workspaces.forEach((ws) => {
        if (pinnedWorkspaces.has(ws.key)) {
          ws.selected = true;
        }
      });
    });
    // kDemoDataPromise.then(data => graphManager.importSubGraph(data, true));

    return manager;
  }, [userId, sessionId, sessionPtrKey]);

  useEffect(() => {
    const sessionIntervalId = setInterval(() => {
      logger.log({
        severity: 'INFO',
        event: 'SessionAlive',
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
      searchEngine: new NoteSearchEngine(graphManager),
    }),
    [graphManager, sessionId]
  );

  return <CFDSContext.Provider value={ctx}>{children}</CFDSContext.Provider>;
}
