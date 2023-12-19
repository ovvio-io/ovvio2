import React from 'react';
import { tabsStyles } from '../../components/tabs-style.tsx';
import { cn } from '../../../../../../styles/css-objects/index.ts';
import SettingsField from '../../components/settings-field.tsx';

export function WsGeneralSettings() {
  const styles = tabsStyles();
  return (
    <div className={cn(styles.barRow)}>
      <SettingsField title="Workspace's Name" toggle="editable" value="" />
      <SettingsField
        title="Workspace Template"
        placeholder=""
        toggle="label"
        value=""
      />
      <SettingsField
        title="Workspace's Email Address"
        toggle="duplicate"
        value=""
      />
      <SettingsField
        title="Description"
        placeholder="Add a description of the project/client/etc."
        toggle="editable"
        value=""
      />
    </div>
  );
}
