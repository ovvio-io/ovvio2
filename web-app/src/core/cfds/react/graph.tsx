import React, { useContext, useMemo, useState, useEffect } from "react";
import {
  encodeTagId,
  SchemeNamespace,
  NS_USERS,
} from "../../../../../cfds/base/scheme-types.ts";
import { GraphManager } from "../../../../../cfds/client/graph/graph-manager.ts";
import { VertexManager } from "../../../../../cfds/client/graph/vertex-manager.ts";
import { User } from "../../../../../cfds/client/graph/vertices/user.ts";
import {
  View,
  kViewPropsGlobal,
  kViewPropsTab,
  kViewPersistentProps,
  ViewPropGlobal,
  ViewProp,
} from "../../../../../cfds/client/graph/vertices/view.ts";
import { useCurrentDevice, Devices } from "../../../../../styles/responsive.ts";
import VersionMismatchView from "../../../app/version-mismatch/index.tsx";
import { usePartialVertex, useVertex } from "./vertex.ts";
import { useLogger } from "./logger.tsx";
import { UserSettings } from "../../../../../cfds/client/graph/vertices/user-settings.ts";
import {
  VertexId,
  VertexIdGetKey,
} from "../../../../../cfds/client/graph/vertex.ts";
import { Repository } from "../../../../../repo/repo.ts";
import { getClientData, setClientData } from "../../../../../server/config.ts";

type ContextProps = {
  graphManager?: GraphManager;
  sessionId?: string;
  loadingFinished: boolean;
};

export const CFDSContext = React.createContext<ContextProps>({
  loadingFinished: false,
});

export function useGraphManager(): GraphManager {
  return useContext(CFDSContext).graphManager!;
}

export function useIsGraphLoading(): boolean {
  return !useContext(CFDSContext).loadingFinished;
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

export function usePartialRootUser<K extends keyof User = keyof User>(
  ...keys: K[]
) {
  return usePartialVertex(useRootUser(), keys);
}

export function usePartialCurrentUser<K extends keyof User>(keys?: K[]) {
  //not in use anymore
  const graph = useGraphManager();
  return usePartialVertex(graph.getRootVertexManager<User>(), keys || []);
}

export function useCurrentUser(): User {
  const graph = useGraphManager();
  return useVertex(graph.getRootVertexManager<User>());
}

export function useUserSettings(): UserSettings {
  const u = usePartialCurrentUser(["settings"]);
  return useVertex(u.settings.manager as VertexManager<UserSettings>);
}

export function usePartialUserSettings<K extends keyof UserSettings>(
  keys?: K[]
) {
  const u = usePartialCurrentUser(["settings"]);

  return usePartialVertex(
    u.settings.manager as VertexManager<UserSettings>,
    keys || []
  );
}

export function useCfdsContext(): ContextProps {
  return useContext(CFDSContext);
}

interface CfdsClientProviderProps {
  user: VertexId<User>;
  sessionId: string;
  children: React.ReactNode;
}

// const kDemoDataPromise: Promise<ReadonlyJSONObject> = fetch('/demo.json').then(
//   response => response.json()
// );

function getLastUsedViewKey(graph: GraphManager): string {
  return graph.rootKey + "-ViewLastUsed";
}

export interface ClientData {
  graphManager?: GraphManager;
}

export async function loadEssentialRepositories(
  graph: GraphManager
): Promise<void> {
  await graph.loadRepository(Repository.id("sys", "dir"));
  await graph.syncRepository(Repository.id("sys", "dir"));
  await graph.loadRepository(Repository.id("user", graph.rootKey));
  await graph.syncRepository(Repository.id("user", graph.rootKey));
}

export function CfdsClientProvider({
  user,
  sessionId,
  children,
}: CfdsClientProviderProps) {
  const logger = useLogger();
  const [versionMismatchFound, setVersionMismatchFound] = useState(false);
  const [sendSessionAlive, setSendSessionAlive] = useState(true);
  const userKey = VertexIdGetKey(user);
  const sessionPtrKey = `${userKey}/${sessionId}`;
  const device = useCurrentDevice();
  const [loaded, setLoaded] = useState(false);

  const graphManager = useMemo(() => {
    const manager = new GraphManager(
      userKey,
      (key) => key !== sessionPtrKey,
      `${location.protocol}//${location.host}`
    );

    loadEssentialRepositories(manager).then(() => {
      if (!manager.hasVertex(manager.rootKey)) {
        manager.createVertex(
          NS_USERS,
          {
            email: "ofri@ovvio.io",
            name: "Ofri",
          },
          manager.rootKey
        );
      }
      const lastUsedKey = getLastUsedViewKey(manager);
      if (!manager.hasVertex(lastUsedKey)) {
        manager.createVertex(
          SchemeNamespace.VIEWS,
          {
            owner: manager.rootKey,
          },
          lastUsedKey
        );
      }
      // manager.getVertexManager(getLastUsedViewKey(manager)).scheduleSync();
      const globalView = manager.createVertex<View>(
        SchemeNamespace.VIEWS,
        { owner: manager.rootKey },
        "ViewGlobal",
        true
      );
      const tasksView = manager.createVertex<View>(
        SchemeNamespace.VIEWS,
        { owner: manager.rootKey, parentView: "ViewGlobal" },
        "ViewTasks",
        true
      ).manager;
      const notesView = manager.createVertex<View>(
        SchemeNamespace.VIEWS,
        { owner: manager.rootKey, parentView: "ViewGlobal" },
        "ViewNotes",
        true
      ).manager;
      const overviewView = manager.createVertex<View>(
        SchemeNamespace.VIEWS,
        { owner: manager.rootKey, parentView: "ViewGlobal" },
        "ViewOverview",
        true
      ).manager;
      const personalSettingsView = manager.createVertex<View>(
        SchemeNamespace.VIEWS,
        { owner: manager.rootKey, parentView: "ViewGlobal" },
        "ViewPersonalSettings",
        true
      ).manager;
      const lastUsed = manager.getVertex<View>(lastUsedKey);
      if (!lastUsed.record.has("workspaceBarCollapsed")) {
        lastUsed.workspaceBarCollapsed = device <= Devices.Tablet;
      }
      globalView.update(kViewPropsGlobal, lastUsed);
      if (globalView.selectedTabId === "overview") {
        overviewView.getVertexProxy().update(kViewPropsTab, lastUsed);
      } else if (globalView.selectedTabId === "notes") {
        notesView.getVertexProxy().update(kViewPropsTab, lastUsed);
      } else {
        tasksView.getVertexProxy().update(kViewPropsTab, lastUsed);
      }
      const callback = () => {
        const globalView = manager.getVertex<View>("ViewGlobal");
        const activeView =
          globalView.selectedTabId === "notes"
            ? notesView
            : globalView.selectedTabId === "overview"
            ? overviewView
            : tasksView;
        manager
          .getVertex<View>(lastUsedKey)
          .update(
            kViewPersistentProps,
            globalView,
            activeView.getVertexProxy()
          );
      };
      globalView.onVertexChanged(callback);
      notesView.onVertexChanged(callback);
      tasksView.onVertexChanged(callback);
      overviewView.onVertexChanged(callback);
      setLoaded(true);
    });
    // kDemoDataPromise.then(data => graphManager.importSubGraph(data, true));

    return manager;
  }, [userKey, sessionId, sessionPtrKey, device]);

  useEffect(() => {
    const sessionIntervalId = setInterval(() => {
      logger.log({
        severity: "INFO",
        event: "SessionAlive",
        foreground: document.visibilityState === "visible",
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
      sessionId,
      userKey,
      loadingFinished: loaded,
    }),
    [graphManager, sessionId, userKey, loaded]
  );

  if (versionMismatchFound) {
    return <VersionMismatchView />;
  }

  return <CFDSContext.Provider value={ctx}>{children}</CFDSContext.Provider>;
}

export function usePartialGlobalView<K extends ViewPropGlobal>(...fields: K[]) {
  return usePartialVertex<View>("ViewGlobal", fields);
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
  const { selectedTabId } = usePartialGlobalView("selectedTabId");
  return graph.getVertexManager<View>(
    selectedTabId === "notes"
      ? "ViewNotes"
      : selectedTabId === "overview"
      ? "ViewOverview"
      : "ViewTasks"
  );
}
