import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router';

import {
  encodeTagId,
  NS_USERS,
  SchemeNamespace,
} from '../../../../../cfds/base/scheme-types.ts';
import { GraphManager } from '../../../../../cfds/client/graph/graph-manager.ts';
import { VertexManager } from '../../../../../cfds/client/graph/vertex-manager.ts';
import { User } from '../../../../../cfds/client/graph/vertices/user.ts';
import {
  kViewPersistentProps,
  kViewPropsGlobal,
  kViewPropsTab,
  View,
  ViewProp,
  ViewPropGlobal,
} from '../../../../../cfds/client/graph/vertices/view.ts';
import { Devices, useCurrentDevice } from '../../../../../styles/responsive.ts';
import { usePartialVertex, useVertex } from './vertex.ts';
import { useLogger } from './logger.tsx';
import { UserSettings } from '../../../../../cfds/client/graph/vertices/user-settings.ts';
import { getClientData, setClientData } from '../../../../../server/config.ts';
import { useTrustPool } from '../../../../../auth/react.tsx';
import { kSecondMs } from '../../../../../base/date.ts';

type ContextProps = {
  graphManager?: GraphManager;
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
    [graph, key],
  );
  return user;
}

export function usePartialRootUser<K extends keyof User = keyof User>(
  ...keys: K[]
) {
  return usePartialVertex(useRootUser(), keys);
}

export function usePartialCurrentUser<K extends keyof User>(keys?: K[]) {
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
  keys?: K[],
) {
  const u = usePartialCurrentUser(['settings']);
  return usePartialVertex(
    u.settings.manager as VertexManager<UserSettings>,
    keys || [],
  );
}

export function useCfdsContext(): ContextProps {
  return useContext(CFDSContext);
}

export type CfdsClientProviderProps = React.PropsWithChildren<{
  graphManager: GraphManager;
}>;

function getLastUsedViewKey(graph: GraphManager): string {
  return graph.rootKey + '-ViewLastUsed';
}

export interface ClientData {
  graphManager?: GraphManager;
}

export function CfdsClientProvider({
  children,
  graphManager,
}: CfdsClientProviderProps) {
  const trustPool = useTrustPool();
  const device = useCurrentDevice();
  // Don't run any setup until a successful login
  if (!trustPool.currentSession.owner) {
    return;
  }
  if (!graphManager.hasVertex(graphManager.rootKey)) {
    graphManager.createVertex(NS_USERS, {}, graphManager.rootKey);
  }
  const lastUsedKey = getLastUsedViewKey(graphManager);
  if (!graphManager.hasVertex(lastUsedKey)) {
    graphManager.createVertex(
      SchemeNamespace.VIEWS,
      {
        owner: graphManager.rootKey,
      },
      lastUsedKey,
    );
  }
  graphManager.createVertex(
    SchemeNamespace.WORKSPACE,
    {
      name: 'My Workspace',
      users: new Set([graphManager.rootKey]),
    },
    `${graphManager.rootKey}-ws`,
  );

  const globalView = graphManager.createVertex<View>(
    SchemeNamespace.VIEWS,
    { owner: graphManager.rootKey },
    'ViewGlobal',
  );
  const tasksView = graphManager.createVertex<View>(
    SchemeNamespace.VIEWS,
    { owner: graphManager.rootKey, parentView: 'ViewGlobal' },
    'ViewTasks',
  ).manager;
  const notesView = graphManager.createVertex<View>(
    SchemeNamespace.VIEWS,
    { owner: graphManager.rootKey, parentView: 'ViewGlobal' },
    'ViewNotes',
  ).manager;
  const overviewView = graphManager.createVertex<View>(
    SchemeNamespace.VIEWS,
    { owner: graphManager.rootKey, parentView: 'ViewGlobal' },
    'ViewOverview',
  ).manager;

  const wsSettingsView = graphManager.createVertex<View>(
    SchemeNamespace.VIEWS,
    { owner: graphManager.rootKey },
    'ViewWsSettings',
    true,
  ).manager;

  useEffect(() => {
    const clientData: ClientData = getClientData() || {
      graphManager,
    };
    setClientData(clientData);

    return () => {
      setClientData(undefined);
    };
  }, [graphManager]);

  const ctx = useMemo<ContextProps>(
    () => ({
      graphManager: graphManager,
    }),
    [graphManager],
  );

  return <CFDSContext.Provider value={ctx}>{children}</CFDSContext.Provider>;
}

export function usePartialGlobalView<K extends ViewPropGlobal>(...fields: K[]) {
  return usePartialVertex<View>('ViewGlobal', fields);
}

export function usePartialView<K extends ViewProp>(
  ...fields: K[]
): Pick<View, K> & Exclude<View, ViewProp> {
  const activeViewMgr = useActiveViewManager();
  const activeView = usePartialVertex<View>(activeViewMgr, fields);
  return activeView as Pick<View, K> & Exclude<View, ViewProp>;
}

export function useActiveViewManager(): VertexManager<View> {
  const graph = useGraphManager();
  const { selectedTabId } = usePartialGlobalView('selectedTabId');
  const loc = useLocation();
  const pathParts = loc.pathname.split('/');
  if (pathParts[1] === 'settings') {
    return graph.getVertexManager<View>('ViewWsSettings');
  } else {
    return graph.getVertexManager<View>(
      selectedTabId === 'notes'
        ? 'ViewNotes'
        : selectedTabId === 'overview'
        ? 'ViewOverview'
        : 'ViewTasks',
    );
  }
}
