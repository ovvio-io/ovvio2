import React, { useCallback, useEffect, useState } from 'react';
import { styleguide } from '../../../../styles/styleguide.ts';
import { layout } from '../../../../styles/layout.ts';
import { brandLightTheme as theme } from '../../../../styles/theme.tsx';
import { makeStyles, cn } from '../../../../styles/css-objects/index.ts';
import { TabId } from '../../../../cfds/base/scheme-types.ts';
import {
  usePartialRootUser,
  usePartialView,
} from '../../core/cfds/react/graph.tsx';
import {
  TabButton,
  TabsHeader,
} from '../../../../styles/components/tabs/index.tsx';
import SettingsField from './components/settings-field.tsx';
import { tabPlugins } from './plugins/tab-plugin-interface.tsx';
import { createUseStrings } from '../../core/localization/index.tsx';
import localization from './settings.strings.json' assert { type: 'json' };

export const SIDES_PADDING = styleguide.gridbase * 11;
const useStrings = createUseStrings(localization);

const useStyles = makeStyles(() => ({
  root: {
    height: '100vh',
    background: 'var(--secondary-secondary-s-0, #FFFBF5)',
    overflow: 'auto',
  },
  bar: {
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    boxSizing: 'border-box',
    basedOn: [layout.column],
  },
  barRow: {
    padding: ['40px', 0],
    height: styleguide.gridbase * 5,
    basedOn: [layout.column],
  },
  viewRow: {
    borderBottom: `${theme.supporting.O1} 1px solid`,
    marginBottom: styleguide.gridbase,
    padding: [0, SIDES_PADDING],
  },

  dropDownButtonText: {
    marginLeft: styleguide.gridbase,
    marginRight: styleguide.gridbase,
  },

  noteTypeToggleSmall: {
    width: styleguide.gridbase * 40,
  },

  dialogHeader: {
    width: '100%',
    height: styleguide.gridbase * 14,
    boxSizing: 'border-box',
    alignItems: 'center',
    padding: [0, SIDES_PADDING],
    basedOn: [layout.row],
  },
}));

function TabView() {
  const styles = useStyles();
  const strings = useStrings();
  const view = usePartialView('noteType', 'selectedTabId');

  const setSelected = useCallback(
    (tabId: TabId) => {
      view.selectedTabId = tabId;
    },
    [view]
  );

  //TODO: ask Ofri about useString. why do we need them? why dont we spell all tabs with capital letter at the beginning?
  const tabs: React.ReactElement[] = tabPlugins.map((plugin) => (
    <TabButton
      key={plugin.title}
      value={plugin.title}
      onClick={() => setSelected(plugin.title)}
    >
      {strings[plugin.title] || plugin.title}
    </TabButton>
  ));
  return (
    <TabsHeader
      selected={view.selectedTabId}
      setSelected={setSelected}
      className={cn(styles.noteTypeToggleSmall)}
    >
      {...tabs}
    </TabsHeader>
  );
}

export function GeneralTabContent() {
  const styles = useStyles();
  const userData = usePartialRootUser('name', 'email');

  return (
    <div className={cn(styles.barRow)}>
      <SettingsField
        title="Full Name"
        placeholder="Add you'r name"
        value={userData.name}
        toggle="editable"
        onChange={(newValue) => (userData.name = newValue)}
      />
      <SettingsField
        title="Email Address"
        toggle="label"
        value={userData.email}
      />
      <SettingsField
        title="Forgot your password?"
        titleType="secondary"
        toggle="label"
        value=""
      />
    </div>
  );
}

export function DetailsTabContent() {
  const styles = useStyles();
  return (
    <div className={cn(styles.barRow)}>
      <SettingsField
        title="Team"
        placeholder="Add team's name"
        toggle="editable"
        value=""
      />
      <SettingsField
        title="Company Roles"
        placeholder=" Add member’s role/s in the company. Separate between roles by “;”"
        toggle="editable"
        value=""
      />
      <SettingsField
        title="Comments"
        placeholder="Add free text"
        toggle="editable"
        value=""
      />
    </div>
  );
}

export type PersonalSettingsProps = {
  className?: string;
};

export function PersonalSettings(props?: PersonalSettingsProps) {
  const { className } = props || {};
  const styles = useStyles();
  const view = usePartialView('selectedTabId');

  const renderSelectedTabContent = () => {
    const selectedTabPlugin = tabPlugins.find(
      (plugin) => plugin.title === view.selectedTabId
    );
    return selectedTabPlugin ? selectedTabPlugin.render() : null;
  };

  return (
    <div className={styles.root}>
      {' '}
      <div className={cn(styles.bar, className)}>
        <div className={cn(styles.dialogHeader)}>Personal Information</div>
        <div className={cn(styles.barRow, styles.viewRow)}>
          <TabView />
          {renderSelectedTabContent()}
        </div>
      </div>
    </div>
  );
}
