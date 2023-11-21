import React from 'react';
import { cn, makeStyles } from '../../../../styles/css-objects/index.ts';
import { layout } from '../../../../styles/layout.ts';
import { SettingsBar } from './components/settings-bar.tsx';

const useStyles = makeStyles((theme) => ({
  root: {
    height: '100vh',
    width: '100vw',
    basedOn: [layout.row],
  },
  content: {
    height: '100%',
    overflow: 'hidden',
    basedOn: [layout.column, layout.flexSpacer],
  },
}));

type SettingsProps = React.PropsWithChildren<{
  style?: any;
}>;
export function Settings({ style, children }: SettingsProps) {
  const styles = useStyles();

  return (
    <div className={cn(styles.root)} style={style}>
      <SettingsBar />
      <div className={cn(styles.content)}>{children}</div>
    </div>
  );
}
