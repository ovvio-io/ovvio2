import React, { useCallback, useEffect } from 'react';
import { SettingsTabId } from '../../../../../cfds/base/scheme-types.ts';
import { createUseStrings } from '../../../core/localization/index.tsx';
import localization from '../settings.strings.json' assert { type: 'json' };
import { useGraphManager } from '../../../core/cfds/react/graph.tsx';
import {
  TabButton,
  TabsHeader,
} from '../../../../../styles/components/tabs/index.tsx';
import { styleguide } from '../../../../../styles/styleguide.ts';
import { makeStyles } from '../../../../../styles/css-objects/index.ts';
import { useNavigate, useParams } from 'react-router';
import { SettingsTabPlugin } from './plugins-list.tsx';
import { EmptyState } from '../../workspace-content/workspace-view/empty-state/index.tsx';
import { usePartialVertex } from '../../../core/cfds/react/vertex.ts';
import { View } from '../../../../../cfds/client/graph/vertices/view.ts';
import { useTabPlugins } from './plugins-list.tsx';

const useStyles = makeStyles(() => ({
  root: {
    height: '100vh',
    background: 'var(--secondary-secondary-s-0, #FFFBF5)',
    overflow: 'auto',
  },
  noteTypeToggleSmall: {
    width: styleguide.gridbase * 60,
  },
  emptyStateContainer: {
    overflow: 'hidden',
  },
  emptyStateBackgroundColor: {
    background: 'none',
  },
}));

const useStrings = createUseStrings(localization);

function TabView({ category }: any) {
  const styles = useStyles();
  const strings = useStrings();
  const navigate = useNavigate();
  const graph = useGraphManager();
  const mgr = graph.getVertexManager<View>('ViewWsSettings');
  const view = usePartialVertex(mgr, [
    'selectedWorkspaces',
    'selectedSettingsTabId',
  ]);
  const { routeCategory, routeTab } = useParams<{
    routeCategory: string;
    routeTab: SettingsTabId;
  }>();
  if (!category && routeCategory) {
    category = routeCategory;
  }

  useEffect(() => {
    if (routeTab) {
      view.selectedSettingsTabId = routeTab;
    }
  }, [routeTab, view]);

  const setSelected = useCallback(
    (tabId: SettingsTabId) => {
      try {
        view.selectedSettingsTabId = tabId;
        navigate(`/settings/${category}/${strings[tabId]}`);
      } catch (error) {
        console.error('Error setting selectedTabId:', error);
      }
    },
    [view, category, navigate],
  );

  const tabsForCategory = useTabPlugins().filter(
    (plugin) => plugin.category === category,
  );

  const renderSelectedTabContent = () => {
    const selectedTabPlugin = tabsForCategory.find(
      (plugin) => plugin.title === view.selectedSettingsTabId,
    );
    return selectedTabPlugin ? selectedTabPlugin.render() : null;
  };

  const tabElements: React.ReactElement[] = tabsForCategory.map((plugin) => {
    return (
      <TabButton key={plugin.title} value={plugin.title}>
        {strings[plugin.title]}
      </TabButton>
    );
  });

  useEffect(() => {
    if (
      tabsForCategory.length > 0 &&
      (!view.selectedSettingsTabId || routeCategory !== category)
    ) {
      const defaultTabId = tabsForCategory[0].title;
      view.selectedSettingsTabId = defaultTabId;
    }
  }, [category]);

  return (
    <div>
      <TabsHeader
        selected={view.selectedSettingsTabId}
        setSelected={setSelected}
        className={styles.noteTypeToggleSmall}
      >
        {tabElements}
      </TabsHeader>
      {category === 'workspaces-info' && view.selectedWorkspaces.size < 1 ? (
        <div className={styles.emptyStateContainer}>
          <EmptyState className={styles.emptyStateBackgroundColor} />
        </div>
      ) : (
        renderSelectedTabContent()
      )}
    </div>
  );
}

export default TabView;
