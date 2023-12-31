import React, { useContext, useEffect, useMemo, useState } from 'react';
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
  const logger = useLogger();
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
    },
    `${graphManager.rootKey}-ws`,
  );
  // manager.getVertexManager(getLastUsedViewKey(manager)).scheduleSync();
  const globalView = graphManager.createVertex<View>(
    SchemeNamespace.VIEWS,
    { owner: graphManager.rootKey },
    'ViewGlobal',
    true,
  );
  const tasksView = graphManager.createVertex<View>(
    SchemeNamespace.VIEWS,
    { owner: graphManager.rootKey, parentView: 'ViewGlobal' },
    'ViewTasks',
    true,
  ).manager;
  const notesView = graphManager.createVertex<View>(
    SchemeNamespace.VIEWS,
    { owner: graphManager.rootKey, parentView: 'ViewGlobal' },
    'ViewNotes',
    true,
  ).manager;
  const overviewView = graphManager.createVertex<View>(
    SchemeNamespace.VIEWS,
    { owner: graphManager.rootKey, parentView: 'ViewGlobal' },
    'ViewOverview',
    true,
  ).manager;

  const wsSettingsView = graphManager.createVertex<View>(
    SchemeNamespace.VIEWS,
    { owner: graphManager.rootKey },
    'ViewWsSettings',
    true,
  ).manager;

  const lastUsed = graphManager.getVertex<View>(lastUsedKey);
  if (!lastUsed.record.has('workspaceBarCollapsed')) {
    lastUsed.workspaceBarCollapsed = device <= Devices.Tablet;
  }
  globalView.update(kViewPropsGlobal, lastUsed);
  if (globalView.selectedTabId === 'overview') {
    overviewView.getVertexProxy().update(kViewPropsTab, lastUsed);
  } else if (globalView.selectedTabId === 'notes') {
    notesView.getVertexProxy().update(kViewPropsTab, lastUsed);
  } else {
    tasksView.getVertexProxy().update(kViewPropsTab, lastUsed);
  }
  let saveViewTimeout: number | undefined;
  const timeoutCallback = () => {
    saveViewTimeout = undefined;
    const globalView = graphManager.getVertex<View>('ViewGlobal');
    const activeView = globalView.selectedTabId === 'notes'
      ? notesView
      : globalView.selectedTabId === 'overview'
      ? overviewView
      : tasksView;
    graphManager
      .getVertex<View>(lastUsedKey)
      .update(kViewPersistentProps, globalView, activeView.getVertexProxy());
  };
  const changeCallback = () => {
    if (saveViewTimeout) {
      clearTimeout(saveViewTimeout);
    }
    saveViewTimeout = setTimeout(timeoutCallback, 10 * kSecondMs);
  };
  globalView.onVertexChanged(changeCallback);
  notesView.onVertexChanged(changeCallback);
  tasksView.onVertexChanged(changeCallback);
  overviewView.onVertexChanged(changeCallback);
  // wsSettingsView.onVertexChanged(changeCallback); // ----------------------- NEW 19/12

  // kDemoDataPromise.then(data => graphManager.importSubGraph(data, true));

  useEffect(() => {
    const sessionIntervalId = setInterval(() => {
      logger.log({
        severity: 'EVENT',
        event: 'SessionAlive',
        foreground: document.visibilityState === 'visible',
      });
    }, 10 * 1000);

    const clientData: ClientData = getClientData() || {
      graphManager,
    };
    setClientData(clientData);

    return () => {
      clearInterval(sessionIntervalId);
      setClientData(undefined);
    };
  }, [logger, graphManager]);

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
  return graph.getVertexManager<View>(
    selectedTabId === 'notes'
      ? 'ViewNotes'
      : selectedTabId === 'overview'
      ? 'ViewOverview'
      : 'ViewTasks',
  );
}
