import React, { useCallback, useEffect } from 'react';
import {
  SettingsTabId,
  TabId,
  isSettingsTabId,
} from '../../../../../cfds/base/scheme-types.ts';
import { createUseStrings } from '../../../core/localization/index.tsx';
import localization from '../settings.strings.json' assert { type: 'json' };
import { usePartialView } from '../../../core/cfds/react/graph.tsx';
import {
  TabButton,
  TabsHeader,
} from '../../../../../styles/components/tabs/index.tsx';
import { styleguide } from '../../../../../styles/styleguide.ts';
import { makeStyles } from '../../../../../styles/css-objects/index.ts';
import { useNavigate, useParams } from 'react-router';
import { SettingsTabPlugin } from './plugins-list.tsx';

const useStyles = makeStyles(() => ({
  root: {
    height: '100vh',
    background: 'var(--secondary-secondary-s-0, #FFFBF5)',
    overflow: 'auto',
  },
  noteTypeToggleSmall: {
    width: styleguide.gridbase * 60,
  },
}));

export class PluginManager {
  private static tabPlugins: SettingsTabPlugin[];

  static initialize(plugins: SettingsTabPlugin[]) {
    PluginManager.tabPlugins = plugins;
  }

  static getTabPlugins() {
    return PluginManager.tabPlugins;
  }

  static registerPlugin(plugin: SettingsTabPlugin) {
    const isExisting = PluginManager.tabPlugins.some(
      (p) => p.title === plugin.title
    );
    if (isExisting) {
      throw new Error(
        `Plugin with title ${plugin.title} is already registered.`
      );
    }
    PluginManager.tabPlugins.push(plugin);
  }

  static getDefaultCategory() {
    if (this.tabPlugins.length === 0) {
      return undefined;
    }
    return this.tabPlugins[0].category;
  }

  static getDefaultTab() {
    const defaultCategory = this.getDefaultCategory();
    if (!defaultCategory) {
      return undefined;
    }
    const categoryPlugins = this.tabPlugins.filter(
      (p) => p.category === defaultCategory
    );
    if (categoryPlugins.length === 0) {
      return undefined;
    }
    return categoryPlugins[0].title;
  }
}

const useStrings = createUseStrings(localization);

function TabView({ category }: any) {
  const styles = useStyles();
  const strings = useStrings();
  const navigate = useNavigate();
  const view = usePartialView('selectedSettingsTabId');
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
    [view, category, navigate]
  );

  const tabsForCategory = PluginManager.getTabPlugins().filter(
    (plugin) => plugin.category === category
  );

  const renderSelectedTabContent = () => {
    const selectedTabPlugin = tabsForCategory.find(
      (plugin) => plugin.title === view.selectedSettingsTabId
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

  return (
    <div>
      <TabsHeader
        selected={view.selectedSettingsTabId}
        setSelected={setSelected}
        className={styles.noteTypeToggleSmall}
      >
        {tabElements}
      </TabsHeader>
      {renderSelectedTabContent()}
    </div>
  );
}

export default TabView;
