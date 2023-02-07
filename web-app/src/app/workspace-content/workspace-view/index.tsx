import React from 'https://esm.sh/react@18.2.0';
import { Route } from 'https://esm.sh/react-router-dom@6.7.0';
import { makeStyles, cn } from '../../../../../styles/css-objects/index.ts';
import Toolbar, { useStyles as toolbarStyles } from './toolbar/index.tsx';
import { layout } from '../../../../../styles/index.ts';
import DueDateEditor from '../../../shared/components/due-date-editor/index.tsx';
import NoteView from './note-editor/index.tsx';
import { CardsDisplay } from './cards-display/index.tsx';
import { EmptyState } from './empty-state/index.tsx';
import { useSharedQuery } from '../../../core/cfds/react/query.ts';

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

interface ContentProps {
  className?: string;
}

export default function WorkspaceContentView({ className }: ContentProps) {
  const styles = useStyles();
  const selectedWorkspacesQuery = useSharedQuery('selectedWorkspaces');

  return (
    <div className={cn(styles.main, className)}>
      <Toolbar />
      <DueDateEditor>
        <div className={cn(styles.content)}>
          <div className={cn(styles.router)}>
            <Route path={`/:workspaceId/notes/:noteId`}>
              <NoteView />
            </Route>
            <Route path="/">
              selectedWorkspacesQuery.length ? (
              <CardsDisplay />
              ) : (
              <EmptyState />)
            </Route>
          </div>
        </div>
      </DueDateEditor>
    </div>
  );
}
