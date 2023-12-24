import React, { useEffect } from 'react';
import { tabsStyles } from '../../components/tabs-style.tsx';
import { cn } from '../../../../../../styles/css-objects/index.ts';
import SettingsField from '../../components/settings-field.tsx';
import { useGraphManager } from '../../../../core/cfds/react/graph.tsx';
import { usePartialVertex } from '../../../../core/cfds/react/vertex.ts';
import { View } from '../../../../../../cfds/client/graph/vertices/view.ts';

export function WsGeneralSettings() {
  const styles = tabsStyles();
  const graph = useGraphManager();
  const mgr = graph.getVertexManager<View>('ViewWsSettings');
  const partialView = usePartialVertex(mgr, ['selectedWorkspaces']);
  const ws = [...partialView.selectedWorkspaces][0];

  return (
    <div className={cn(styles.barRow)}>
      <SettingsField
        title="Workspace's Name"
        toggle="editable"
        value={ws && ws.name}
      />
      <SettingsField
        title="Workspace Template"
        placeholder=""
        toggle="label"
        value={ws && ws.assignees.size}
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
