import React from 'react';
import { cn } from '../../../../styles/css-objects/index.ts';
import { tabsStyles } from './components/tabs-style.tsx';
import TabView from './plugins/plugin-manager.tsx';
import { useParams } from 'react-router';
import { createUseStrings } from '../../core/localization/index.tsx';
import localization from './settings.strings.json' assert { type: 'json' };

const useStrings = createUseStrings(localization);

export type CategorySettingsProps = {
  className?: string;
};

export function CategorySettings(props?: CategorySettingsProps) {
  const { className } = props || {};
  const styles = tabsStyles();
  const strings = useStrings();
  const { category } = useParams<{ category: string }>();

  return (
    <div className={styles.root}>
      <div className={cn(styles.bar, className)}>
        <div className={cn(styles.dialogHeader)}>{strings[category]}</div>
        <div className={cn(styles.barRow, styles.viewRow)}>
          <TabView category={category} />
        </div>
      </div>
    </div>
  );
}
