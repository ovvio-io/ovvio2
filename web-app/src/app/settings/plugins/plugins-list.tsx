import React from 'react';
import { SettingsTabId } from '../../../../../cfds/base/scheme-types.ts';
import { tabsStyles } from '../components/tabs-style.tsx';
import { usePartialRootUser } from '../../../core/cfds/react/graph.tsx';
import SettingsField from '../components/settings-field.tsx';
import { cn } from '../../../../../styles/css-objects/index.ts';
import MembersTabContent from './organization/members/base.tsx';
import { WsGeneralSettings } from './my-workspaces/ws-general.tsx';

export interface SettingsTabPlugin {
  title: SettingsTabId;
  render: () => JSX.Element;
  category: string;
}

export const tabPlugins: SettingsTabPlugin[] = [
  {
    title: 'general-personal',
    render: () => <GeneralTabContent />,
    category: 'personal-info',
  },
  {
    title: 'details',
    render: () => <DetailsTabContent />,
    category: 'personal-info',
  },
  {
    title: 'general-workspaces',
    render: () => <WsGeneralSettings />,
    category: 'workspaces-info',
  },
  {
    title: 'tags',
    render: () => <DetailsTabContent />,
    category: 'workspaces-info',
  },
  {
    title: 'roles-details',
    render: () => <DetailsTabContent />,
    category: 'workspaces-info',
  },
  {
    title: 'general-organization',
    render: () => <GeneralOrgTabContent />,
    category: 'organization-info',
  },
  {
    title: 'members',
    render: () => <MembersTabContent />,
    category: 'organization-info',
  },
  {
    title: 'billing',
    render: () => <DetailsTabContent />,
    category: 'organization-info',
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
