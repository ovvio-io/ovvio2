import React, { useCallback, useState } from 'react';
import { SettingsTabId } from '../../../../../cfds/base/scheme-types.ts';
import { tabsStyles } from '../components/tabs-style.tsx';
import {
  usePartialRootUser,
  useRootUser,
} from '../../../core/cfds/react/graph.tsx';
import SettingsField from '../components/settings-field.tsx';
import { cn } from '../../../../../styles/css-objects/index.ts';
import MembersTabContent from './organization/members/base.tsx';
import { WsGeneralSettings } from './my-workspaces/ws-general.tsx';
import { useSharedQuery } from '../../../core/cfds/react/query.ts';
import { useVertices } from '../../../core/cfds/react/vertex.ts';
import {
  User,
  UserMetadataKey,
} from '../../../../../cfds/client/graph/vertices/user.ts';
import { Dictionary } from '../../../../../base/collections/dict.ts';
import { WsTagsSettings } from './my-workspaces/ws-tags.tsx';
import { getOvvioConfig } from '../../../../../server/config.ts';
import { tuple4ToString } from '../../../../../base/tuple.ts';

export interface SettingsTabPlugin {
  title: SettingsTabId;
  render: () => JSX.Element;
  category: string;
}

export function useTabPlugins(): SettingsTabPlugin[] {
  const partialRootUser = usePartialRootUser('permissions');
  const result: SettingsTabPlugin[] = [
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
      render: () => <WsTagsSettings />,
      category: 'workspaces-info',
    },
  ];

  if (partialRootUser.permissions.has('view:settings:org')) {
    result.push({
      title: 'members',
      render: () => <MembersTabContent />,
      category: 'organization-info',
    });
  }
  return result;
}

export function GeneralTabContent() {
  const styles = tabsStyles();
  const userData = usePartialRootUser('name', 'email');
  return (
    <div>
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
      <div className={cn(styles.userId)}>
        <div className={cn(styles.idTitleText)}>User I.D </div>
        <div className={cn(styles.userIdText)}> {userData.key}</div>
        <div className={cn(styles.userIdText)}>
          &nbsp;&nbsp; {tuple4ToString(getOvvioConfig().version)}
        </div>
      </div>
    </div>
  );
}
export function DetailsTabContent() {
  const rootUser = useRootUser();
  const metaDataDictionary: Dictionary<UserMetadataKey, string> =
    rootUser.getVertexProxy().metadata;

  const [metadata, setMetadata] = useState({
    team: metaDataDictionary ? metaDataDictionary.get('team') : '',
    companyRoles: metaDataDictionary
      ? metaDataDictionary.get('companyRoles')
      : '',
    comments: metaDataDictionary ? metaDataDictionary.get('comments') : '',
  });

  const handleMetadataChange = (key: string, value: string) => {
    setMetadata((prevMetadata) => ({
      ...prevMetadata,
      [key]: value,
    }));
  };

  const saveMetadata = useCallback(() => {
    const updatedMetaDataDictionary =
      metaDataDictionary instanceof Map
        ? metaDataDictionary
        : new Map<UserMetadataKey, string>();

    Object.entries(metadata).forEach(([key, value]) => {
      if (key === 'companyRoles' || key === 'comments' || key === 'team') {
        updatedMetaDataDictionary.set(key as UserMetadataKey, value);
      }
    });
    rootUser.getVertexProxy().metadata = updatedMetaDataDictionary;
  }, [metadata, rootUser, metaDataDictionary]);

  const styles = tabsStyles();
  return (
    <div className={cn(styles.barRow)}>
      <SettingsField
        title="Team"
        placeholder="Add team's name"
        toggle="editable"
        value={metadata.team}
        onChange={(newValue) => handleMetadataChange('team', newValue)}
        saveMetadata={saveMetadata}
      />
      <SettingsField
        title="Company Roles"
        placeholder="Add member’s role/s in the company. Separate between roles by “;”"
        toggle="editable"
        value={metadata.companyRoles}
        onChange={(newValue) => handleMetadataChange('companyRoles', newValue)}
        saveMetadata={saveMetadata}
      />
      <SettingsField
        title="Comments"
        placeholder="Add free text"
        toggle="editable"
        value={metadata.comments}
        onChange={(newValue) => handleMetadataChange('comments', newValue)}
        saveMetadata={saveMetadata}
      />
    </div>
  );
}
export function GeneralOrgTabContent() {
  const usersQuery = useSharedQuery('users');
  const users = useVertices(usersQuery.results) as User[];
  const styles = tabsStyles();

  return (
    <div className={cn(styles.barRow)}>
      <SettingsField title="Org. Name" value="Ovvio" toggle="label" />
      <SettingsField title="Org. URL" value="www.ovvio.io" toggle="label" />
      <SettingsField
        title="Members"
        value={`${users.length} users`}
        toggle="label"
      />
    </div>
  );
}
