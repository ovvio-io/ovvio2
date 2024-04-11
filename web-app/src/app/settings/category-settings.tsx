import React from 'react';
import { cn } from '../../../../styles/css-objects/index.ts';
import { tabsStyles } from './components/tabs-style.tsx';
import TabView from './plugins/tab-view.tsx';
import { useParams } from 'react-router';
import { createUseStrings } from '../../core/localization/index.tsx';
import localization from './settings.strings.json' assert { type: 'json' };
import { WorkspacesBar } from '../workspaces-bar/index.tsx';
import { useGraphManager } from '../../core/cfds/react/graph.tsx';
import { usePartialVertex } from '../../core/cfds/react/vertex.ts';
import { View } from '../../../../cfds/client/graph/vertices/view.ts';
import { WorkspaceIndicator } from '../../../../components/workspace-indicator.tsx';
import { WorkspaceContainer } from '../index.tsx';

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
  const graph = useGraphManager();
  const mgr = graph.getVertexManager<View>('ViewWsSettings');
  const partialView = usePartialVertex(mgr, ['selectedWorkspaces']);
  const ws = [...partialView.selectedWorkspaces][0];

  return (
    <div className={styles.root}>
      <div className={cn(styles.bar)}>
        {category === 'workspaces-info' ? (
          <div className={styles.wsBar}>
            <WorkspaceContainer>
              <WorkspacesBar key={'wsbar'} ofSettings={true} />
            </WorkspaceContainer>
            <div style={{ overflow: 'hidden' }}>
              <div className={cn(styles.dialogHeader)}>
                {strings[category + 'S']}
                {ws && (
                  <WorkspaceIndicator
                    key={ws.key}
                    workspace={ws.manager}
                    ofSettings={true}
                  />
                )}
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
