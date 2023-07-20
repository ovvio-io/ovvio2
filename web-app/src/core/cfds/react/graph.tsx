import { GraphManager } from '@ovvio/cfds/lib/client/graph/graph-manager';
import { Query } from '@ovvio/cfds/lib/client/graph/query';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { User } from '@ovvio/cfds/lib/client/graph/vertices';
import {
  View,
  ViewProp,
  ViewPropGlobal,
  kViewPersistentProps,
  kViewPropsGlobal,
  kViewPropsTab,
} from '@ovvio/cfds/lib/client/graph/vertices/view';
import { WSNetworkAdapter } from '@ovvio/cfds/lib/client/net/websocket-network-adapter';
import { INCOMPATIBLE_CFDS_VERSION_CODE } from '@ovvio/cfds/lib/server/types';
import VersionMismatchView from 'app/version-mismatch';
import { useEventLogger } from 'core/analytics';
import config from 'core/config';
import { isElectron } from 'electronUtils';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { CurrentUser } from 'stores/user';
import { createIDBCache } from '../indexeddb-cache';
import { registerIndexes } from '../indexes';
import { NoteSearchEngine } from '../note-search';
import {
  NS_ROLES,
  SchemeNamespace,
  encodeTagId,
} from '@ovvio/cfds/lib/base/scheme-types';
import { usePartialVertex, useVertex } from './vertex';
import { Devices, useCurrentDevice } from '@ovvio/styles/lib/responsive';
import { Note, NoteType } from '@ovvio/cfds/lib/client/graph/vertices/note';

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

export function usePartialRootUser<K extends keyof User = keyof User>(
  ...keys: K[]
) {
  return usePartialVertex(useRootUser(), keys);
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

function getLastUsedViewKey(graph: GraphManager): string {
  return graph.rootKey + '-ViewLastUsed';
}

export function CfdsClientProvider({
  user,
  sessionId,
  children,
}: CfdsClientProviderProps) {
  const eventLogger = useEventLogger();
  const [versionMismatchFound, setVersionMismatchFound] = useState(false);
  const [sendSessionAlive, setSendSessionAlive] = useState(true);
  const sessionPtrKey = `${user.id}/${sessionId}`;
  const device = useCurrentDevice();

  const graphManager = useMemo(() => {
    const manager = new GraphManager(
      user.id,
      key => key !== sessionPtrKey,
      createNetworkAdapter(user, sessionId, 2, 1500),
      createIDBCache(user.id)
    );

    registerIndexes(manager);
    manager.createVertex(
      NS_ROLES,
      {
        name: 'Team Leader',
        assignees: new Set([
          // Prod
          // 'szntwwKeKHMLKvcszFsSewyNvHI3', // dikla@ztlv.co.il
          'ZER8YgZ1roZRhE9W4vuhJQuBBFu2', // tom@ztlv.co.il
          'DrTGEpFgEGhvqKvDGk4Qd51Zakz2', // shira@ztlv.co.il
          'HINWXYuNgWMPDxzKeaAexO6T3i23', // mor@ztlv.co.il
          'oojM1XivVubO6DuTc5Z0GJpZ6jA3', // shai@ztlv.co.il
          'cobo6JBtX1hS6O04vKcIatxTC7N2', // barak@ztlv.co.il
          '6FaBoN5cEOg3v9oytjbtCJbRDlq2', // shauls+tl@precise.co.il

          // Stage
          // 'eUnggUUGoOcVvGpssnCxlkvMqg92', // ofri@ovvio.io
          // 'jQ4xzbJZ56MmRDR4Rv46fcQCfX83', // nadav@ovvio.io
        ]),
        tags: new Set([encodeTagId('שלב', 'לבדיקת ראש צוות')]),
      },
      'RoleTeamLeader',
      true
    );
    manager.createVertex(
      NS_ROLES,
      {
        name: 'Architect',
        assignees: new Set([
          // Prod
          'reehAKTtfMhdPqayWk9l8koi1yf1', // gal@ztlv.co.il
          'KsvZ8uMA6EPBXsLRoehev08tv1j1', // avital@ztlv.co.il
          'OUoTZLys3Ua1ZEdkeFJwCZmZbGL2', // ido@ztlv.co.il
          'JHMJ6eA5aKREgyJ2UjaiPxhdZF23', // zohar@ztlv.co.il
          '7NjCjkVumkZLnBmDP8HpbxXKpq12', // hadar@ztlv.co.il
          'IKpN1h68xkO4OeioRdiXvoz3Vnp1', // sharon@ztlv.co.il
          'r49J9IdQaAWEoHzuzuIdah5lTYm2', // rachel@ztlv.co.il
          'IZ676BFJNZc7DBsuXN8wzM24jxy1', // roy@ztlv.co.il
          'S3EAR4UvTUP36XM02HStN9sTzUi1', // mayab@ztlv.co.il
          'uNrtd8hsC6eEhqkppQIWuwuh9AC3', // shir@ztlv.co.il
          '7cdK88W5e1aqgkt7PjAm0wbr3Up1', // roni@ztlv.co.il
          'UhuJS5Wb5nRKNSfe5sNKcruvZaq2', // noam@ztlv.co.il
          'nmSkOvTkAOY1wf8bIzSlQVnf5JI3', // daniella@ztlv.co.il
          'dIJgt3liPnZVdOsOllhuJcxPcO43', // rada@ztlv.co.il
          '1xkGiRt5rmga8WxohfpDHRxsaSh1', // sapir@ztlv.co.il
          'SFgvL0ePTlO999h7HnOQYBY5HSM2', // nofit@ztlv.co.il
          's48wKvZzzBPdjYibl6t3n0YWF0V2', // mayas@ztlv.co.il
          'lr2pCwaCZvMDct4mRsZQNvPE7bq1', // tamar@ztlv.co.il
          'jbpb762YJTfkKT8k0svZrxDDOus2', // victor@ztlv.co.il
          'NbxxOvYUxqSEVtbjW78M2GrdE1Q2', // saar@ztlv.co.il
          'QlJKam9Af5QVWFqFuAeJjspqyQ03', // ohad@ztlv.co.il
          '7W5FnALv33XYOf40YKuqcdOmpuw1', // tamarg@ztlv.co.il
          'GXIXu7LVSBOGrswKyBHeAZaAs913', // yardenz@ztlv.co.il
          '1TuxIcm22QYsUNgszfQo3lFaBFN2', // shirad@ztlv.co.il
          'WSotgZtKR2Zlrd80qYtxBfr8GSo1', // inbal@ztlv.co.il
          'pMYJtZZKJlZrScOJkLvWMWjMKpA2', // tal@ztlv.co.il
          'PuIRnx2MlKMLcu0I2nSqs8g7FHj2', // chenba@ztlv.co.il
          'RNLShml5tJfcWUw71Ua1JzzJMDm2', // zoharsh@ztlv.co.il
          '3bohRuQU9IYJiFMXrMSbEty3BXM2', // marion@ztlv.co.il
          'aoq5DBHq3FcQJy6eCrJ8sARqpB92', // yuval@ztlv.co.il
          'jUJsFEWJ2xUgbTiiwYQfS7dCyXB2', // ariel@ztlv.co.il
          'sU2tmIns9KgfSuxGXDf9FWwta1T2', // yonatan@ztlv.co.il
          'bHzubEYM3IaNgkwQVB7vwVj524j1', // eitan@ztlv.co.il
          'Qa9I8Tjx1ST84iGWaTRlidLuKLl2', // aliza@ztlv.co.il
          'L6Wfj6samTetaYNKa7KV1sdGsfX2', // liorb@ztlv.co.il
          'OJWDgoCIk3SK5xPZlxaLYGVA9vo2', // valeria@ztlv.co.il
          'dT3gQq7Rikd2hXpDsKdlqYWWFDt2', // reut@ztlv.co.il
          'q0rdLytWlkPhYlzEbxmvdBMpaP72', // talia@ztlv.co.il
          'HGmWwLV7FrdmZXyzU79QDsHtX5k2', // shauls+mc@precise.co.il
          'fbvFFledaWREhWiqMaLOhVhCsFG3', // shauls+dz@precise.co.il
          'RR94LzyTtXfPhGs9VGAlxsQwJ402', // shauls+er@precise.co.il
        ]),
        tags: new Set([encodeTagId('שלב', 'בעבודה')]),
      },
      'RoleArchitect',
      true
    );
    manager.createVertex(
      NS_ROLES,
      {
        name: 'Partner',
        assignees: new Set([
          // Prod
          'wkzu0eK8XeRRBM7vPm26Zgc3PCn2', // shachaf@ztlv.co.il
          'sIam9vkA1xScuknPmZCIdyZ4Kdp2', // eldad@ztlv.co.il
          'Ajrvy3tXLWedYlUJLz6RRjMVoGO2', // liron@ztlv.co.il
        ]),
        tags: new Set([encodeTagId('שלב', 'לבדיקת שותף')]),
      },
      'RolePartner',
      true
    );
    manager.createVertex(
      NS_ROLES,
      {
        name: 'QA',
        assignees: new Set([
          'jQ4xzbJZ56MmRDR4Rv46fcQCfX83', // Nadav, Stage
          'BIrMRxucatWH1JJMltvF8Y6jChz1', // Ofri, Dev
        ]),
        tags: new Set([encodeTagId('Stage', 'QA')]),
      },
      'RoleQA',
      true
    );
    manager.createVertex(
      NS_ROLES,
      {
        name: 'Unassignable',
        users: new Set([
          // Prod
          'Umh22X421MQ9JJ3Fp4EPUSXtBJU2', // barakz@precise.co.il
          'r3ROh9E5wDd3Newus8iAZc0pkOC3', // shauls@precise.co.il
          'd4exz7xIl4dBp5BeZJ4iPlo4pZ63', // liranl@precise.co.il
          'jQ4xzbJZ56MmRDR4Rv46fcQCfX83', // nadav@ovvio.io
          'BvhLQX16DwQlfl8R0CCLn6HGfjH3', // support@ovvio.io
          // Stage
          'p2aDPopYUpcnlVHaVHlESKj6Enz1', // eyal@ovvio.io
          // 'eUnggUUGoOcVvGpssnCxlkvMqg92', // Ofri
          // Dev
          'BIrMRxucatWH1JJMltvF8Y6jChz1', // Ofri
        ]),
      },
      'Unassignable',
      true
    );

    manager.loadCache().then(() => {
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
        'ViewGlobal',
        true
      );
      const tasksView = manager.createVertex<View>(
        SchemeNamespace.VIEWS,
        { owner: manager.rootKey, parentView: 'ViewGlobal' },
        'ViewTasks',
        true
      ).manager;
      const notesView = manager.createVertex<View>(
        SchemeNamespace.VIEWS,
        { owner: manager.rootKey, parentView: 'ViewGlobal' },
        'ViewNotes',
        true
      ).manager;
      const overviewView = manager.createVertex<View>(
        SchemeNamespace.VIEWS,
        { owner: manager.rootKey, parentView: 'ViewGlobal' },
        'ViewOverview',
        true
      ).manager;
      const lastUsed = manager.getVertex<View>(lastUsedKey);
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
      const callback = () => {
        const globalView = manager.getVertex<View>('ViewGlobal');
        const activeView =
          globalView.selectedTabId === 'notes'
            ? notesView
            : globalView.selectedTabId === 'overview'
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
    });
    // kDemoDataPromise.then(data => graphManager.importSubGraph(data, true));

    return manager;
  }, [user, sessionId, sessionPtrKey, device]);

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
      : 'ViewTasks'
  );
}
