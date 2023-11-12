import React from 'react';
import { SettingsTabId } from '../../../../../cfds/base/scheme-types.ts';
import { tabsStyles } from '../components/tabs-style.tsx';
import { usePartialRootUser } from '../../../core/cfds/react/graph.tsx';
import SettingsField from '../components/settings-field.tsx';
import { cn } from '../../../../../styles/css-objects/index.ts';

export interface SettingsTabPlugin {
  title: SettingsTabId;
  render: () => JSX.Element;
  category: string;
}

export const tabPlugins: SettingsTabPlugin[] = [
  {
    title: 'generalPersonal',
    render: () => <GeneralTabContent />,
    category: 'PersonalInfo',
  },
  {
    title: 'details',
    render: () => <DetailsTabContent />,
    category: 'PersonalInfo',
  },
  {
    title: 'generalWorkspaces',
    render: () => <GeneralOrgTabContent />,
    category: 'WorkspacesInfo',
  },
  {
    title: 'tags',
    render: () => <DetailsTabContent />,
    category: 'WorkspacesInfo',
  },
  {
    title: 'roles&details',
    render: () => <DetailsTabContent />,
    category: 'WorkspacesInfo',
  },
  {
    title: 'generalOrganization',
    render: () => <GeneralOrgTabContent />,
    category: 'OrganizationInfo',
  },
  {
    title: 'members',
    render: () => <DetailsTabContent />,
    category: 'OrganizationInfo',
  },
  {
    title: 'billing',
    render: () => <DetailsTabContent />,
    category: 'OrganizationInfo',
  },
];

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
