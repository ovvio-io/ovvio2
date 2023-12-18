import React from 'react';
import { cn } from '../../../../styles/css-objects/index.ts';
import { tabsStyles } from './components/tabs-style.tsx';
import TabView from './plugins/plugin-manager.tsx';
import { useParams } from 'react-router';
import { createUseStrings } from '../../core/localization/index.tsx';
import localization from './settings.strings.json' assert { type: 'json' };
import { DisplayBar } from '../workspace-content/workspace-view/cards-display/display-bar/index.tsx';
import { WorkspacesBar } from '../workspaces-bar/index.tsx';

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

  return (
    <div className={styles.root}>
      <div className={cn(styles.bar, className)}>
        {category === 'workspaces-info' ? (
          <div className={styles.wsBar}>
            <WorkspacesBar key={'wssettingsbar'} />
            <div>
              <div className={cn(styles.dialogHeader)}>
                {strings[category]}
                {/* {strings[category + 'S']} */}
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
