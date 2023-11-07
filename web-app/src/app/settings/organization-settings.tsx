import React from 'react';
import SettingsField from './components/settings-field.tsx';
import TabView from './plugins/tab-plugin.tsx';
import { tabsStyles } from './components/tabs-style.tsx';
import { cn } from '../../../../styles/css-objects/index.ts';

export function GeneralOrgTabContent() {
  const styles = tabsStyles();
  return (
    <div className={cn(styles.barRow)}>
      <SettingsField title="Org. Name" value="Ovvio" toggle="label" />
      <SettingsField title="Org. URL" value="www.ovvio.io" toggle="label" />
      <SettingsField title="Members" value="356 users" toggle="label" />
    </div>
  );
}

export function MembersTabContent() {
  const styles = tabsStyles();
  return (
    <div className={cn(styles.barRow)}>
      <SettingsField title="Org. Members" value="Ovvio" toggle="label" />
    </div>
  );
}

export type OrgSettingsProps = {
  className?: string;
};

export function OrgSettings(props?: OrgSettingsProps) {
  const styles = tabsStyles();
  const { className } = props || {};
  return (
    <div className={styles.root}>
      <div className={cn(styles.bar, className)}>
        <div className={cn(styles.dialogHeader)}>Organization Settings</div>
        <div className={cn(styles.barRow, styles.viewRow)}>
          <TabView sectionTitle="Organization Info" />
        </div>
      </div>
    </div>
  );
}
