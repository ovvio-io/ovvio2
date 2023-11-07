import React from 'react';
import { cn } from '../../../../styles/css-objects/index.ts';
import {
  usePartialRootUser,
  usePartialView,
} from '../../core/cfds/react/graph.tsx';
import SettingsField from './components/settings-field.tsx';
import TabView from './plugins/tab-plugin.tsx';
import { tabsStyles } from './components/tabs-style.tsx';

export function GeneralTabContent() {
  const styles = tabsStyles();
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
  const styles = tabsStyles();
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
  const styles = tabsStyles();
  return (
    <div className={styles.root}>
      <div className={cn(styles.bar, className)}>
        <div className={cn(styles.dialogHeader)}>Personal Information</div>
        <div className={cn(styles.barRow, styles.viewRow)}>
          <TabView sectionTitle="Personal Info" />
        </div>
      </div>
    </div>
  );
}
