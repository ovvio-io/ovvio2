import React from 'react';
import { cn } from '../../../../styles/css-objects/index.ts';
import { tabsStyles } from './components/tabs-style.tsx';
import TabView from './plugins/plugin-manager.tsx';
import { useParams } from 'react-router';
import { createUseStrings } from '../../core/localization/index.tsx';
import localization from './settings.strings.json' assert { type: 'json' };
import { WorkspacesBar } from '../workspaces-bar/index.tsx';
import { GraphManager } from '../../../../cfds/client/graph/graph-manager.ts';
import {
  useGraphManager,
  usePartialGlobalView,
} from '../../core/cfds/react/graph.tsx';
import { usePartialVertex } from '../../core/cfds/react/vertex.ts';
import { Workspace } from '../../../../cfds/client/graph/vertices/index.ts';
import { WorkspaceIndicator } from '../../../../components/workspace-indicator.tsx';

const useStrings = createUseStrings(localization);

export type CategorySettingsProps = {
  className?: string;
  isMyWorkspaces?: boolean;
};

export function CategorySettings(props: CategorySettingsProps) {
  const className = props.className || {};
  const styles = tabsStyles();
  const strings = useStrings();
  const { category } = useParams<{ category: string }>();
  const view = usePartialGlobalView('selectedWorkspaces');
  const ws = [...view.selectedWorkspaces][0];
  // const graph = useGraphManager();
  // const mgr = graph.getVertexManager('ViewTasks');
  // const partial = usePartialVertex(mgr,['selectedWorkspace',...])

  return (
    <div className={styles.root}>
      <div className={cn(styles.bar, className)}>
        {category === 'workspaces-info' ? (
          <div className={styles.wsBar}>
            <WorkspacesBar key={'wssettingsbar'} ofSettings={true} />
            <div>
              <div className={cn(styles.dialogHeader)}>
                {strings[category]}
                {/* {strings[category + 'S']} */}
              </div>
              <div>
                {ws && <WorkspaceIndicator key={ws.key} workspace={ws} />}
              </div>
              <div className={cn(styles.barRow, styles.viewRow)}>
                <TabView category={category} />
              </div>
            </div>
          </div>
        ) : (
          <React.Fragment>
            <div className={cn(styles.dialogHeader)}>
              {strings[category + 'S']}
            </div>
            <div className={cn(styles.barRow, styles.viewRow)}>
              <TabView category={category} />
            </div>
          </React.Fragment>
        )}
      </div>
    </div>
  );
}
