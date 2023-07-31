import React, { useContext, useMemo, useState, useEffect } from 'react';
import {
  NS_ROLES,
  encodeTagId,
  SchemeNamespace,
  NS_USERS,
} from '../../../../../cfds/base/scheme-types.ts';
import { GraphManager } from '../../../../../cfds/client/graph/graph-manager.ts';
import { VertexManager } from '../../../../../cfds/client/graph/vertex-manager.ts';
import { User } from '../../../../../cfds/client/graph/vertices/user.ts';
import {
  View,
  kViewPropsGlobal,
  kViewPropsTab,
  kViewPersistentProps,
  ViewPropGlobal,
  ViewProp,
} from '../../../../../cfds/client/graph/vertices/view.ts';
import { useCurrentDevice, Devices } from '../../../../../styles/responsive.ts';
import VersionMismatchView from '../../../app/version-mismatch/index.tsx';
import { usePartialVertex, useVertex } from './vertex.ts';
import { useLogger } from './logger.tsx';
import { UserSettings } from '../../../../../cfds/client/graph/vertices/user-settings.ts';
import {
  VertexId,
  VertexIdGetKey,
} from '../../../../../cfds/client/graph/vertex.ts';

type ContextProps = {
  graphManager?: GraphManager;
  sessionId?: string;
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
  keys?: K[]
) {
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
  user: VertexId<User>;
  sessionId: string;
  children: React.ReactNode;
}

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
  const logger = useLogger();
  const [versionMismatchFound, setVersionMismatchFound] = useState(false);
  const [sendSessionAlive, setSendSessionAlive] = useState(true);
  const userKey = VertexIdGetKey(user);
  const sessionPtrKey = `${userKey}/${sessionId}`;
  const device = useCurrentDevice();

  const graphManager = useMemo(() => {
    const manager = new GraphManager(
      userKey,
      (key) => key !== sessionPtrKey,
      'http://localhost:8080'
    );

    manager.createVertex(
      NS_USERS,
      {
        email: 'ofri@ovvio.io',
        name: 'Ofri',
      },
      manager.rootKey
    );

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

    manager.loadLocalContents().then(() => {
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
  }, [userKey, sessionId, sessionPtrKey, device]);

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
      userKey,
    }),
    [graphManager, sessionId, userKey]
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
