import React, { useCallback } from 'react';
import {
  DetailsTabContent,
  GeneralTabContent,
} from '../personal-information.tsx';
import { TabId } from '../../../../../cfds/base/scheme-types.ts';
import { GeneralOrgTabContent } from '../organization-settings.tsx';
import { createUseStrings } from '../../../core/localization/index.tsx';
import localization from '../settings.strings.json' assert { type: 'json' };
import { usePartialView } from '../../../core/cfds/react/graph.tsx';
import {
  TabButton,
  TabsHeader,
} from '../../../../../styles/components/tabs/index.tsx';
import { styleguide } from '../../../../../styles/styleguide.ts';
import { makeStyles } from '../../../../../styles/css-objects/index.ts';

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

interface TabPlugin {
  title: TabId;
  render: () => JSX.Element;
}

type SectionTabs = {
  [sectionTitle: string]: TabPlugin[];
};

export const sectionTabGroups: SectionTabs = {
  'Personal Info': [
    {
      title: 'general',
      render: () => <GeneralTabContent />,
    },
    {
      title: 'details',
      render: () => <DetailsTabContent />,
    },
  ],
  'Organization Info': [
    {
      title: 'generalOrg',
      render: () => <GeneralOrgTabContent />,
    },
    {
      title: 'Members',
      render: () => <DetailsTabContent />,
    },
    {
      title: 'Billing',
      render: () => <DetailsTabContent />,
    },
  ],
};
const useStrings = createUseStrings(localization);

function TabView({ sectionTitle }: any) {
  const styles = useStyles();
  const strings = useStrings();
  const view = usePartialView('selectedTabId');
  const sectionTabs = sectionTabGroups[sectionTitle];
  const renderSelectedTabContent = () => {
    const selectedTabPlugin = sectionTabs.find(
      (plugin) => plugin.title === view.selectedTabId
    );
    return selectedTabPlugin ? selectedTabPlugin.render() : null;
  };

  const setSelected = useCallback(
    (tabId: TabId) => {
      try {
        view.selectedTabId = tabId;
      } catch (error) {
        console.error('Error setting selectedTabId:', error);
      }
    },
    [view]
  );

  const tabElements: React.ReactElement[] = sectionTabs.map((plugin) => (
    <TabButton
      key={plugin.title}
      value={plugin.title}
      onClick={() => setSelected(plugin.title)}
    >
      {strings[plugin.title] || plugin.title}
    </TabButton>
  ));

  return (
    <div>
      <TabsHeader
        selected={view.selectedTabId}
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
