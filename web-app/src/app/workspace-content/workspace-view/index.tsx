import React from 'react';
import { makeStyles, cn } from '../../../../../styles/css-objects/index.ts';
import Toolbar, { useStyles as toolbarStyles } from './toolbar/index.tsx';
import { layout } from '../../../../../styles/index.ts';
import DueDateEditor from '../../../shared/components/due-date-editor/index.tsx';
import { usePartialGlobalView } from '../../../core/cfds/react/graph.tsx';
import { EmptyState } from './empty-state/index.tsx';

const useStyles = makeStyles((theme) => ({
  blurred: {
    filter: 'blur(2px)',
  },
  main: {
    width: '100%',
    height: '100%',
    flexShrink: 0,
    flexGrow: 0,
    basedOn: [layout.column],
  },
  content: {
    position: 'relative',
    width: '100%',
    height: `calc(100% - ${toolbarStyles.toolbar.rules.height}px)`,
    flexShrink: 1,
    basedOn: [layout.column, layout.flex],
  },
  router: {
    flexShrink: 0,
    flexGrow: 0,
    overflowY: 'auto',
    width: '100%',
    height: '100%',
    basedOn: [layout.row],
  },
}));

type ContentProps = React.PropsWithChildren<{
  className?: string;
}>;

export default function WorkspaceContentView({
  className,
  children,
}: ContentProps) {
  const styles = useStyles();
  const view = usePartialGlobalView('selectedWorkspaces');

  return (
    <div className={cn(styles.main, className)}>
      <Toolbar />
      <DueDateEditor>
        <div className={cn(styles.content)}>
          <div className={cn(styles.router)}>
            {view.selectedWorkspaces.size > 0 ? children : <EmptyState />}
          </div>
        </div>
      </DueDateEditor>
    </div>
  );
}
