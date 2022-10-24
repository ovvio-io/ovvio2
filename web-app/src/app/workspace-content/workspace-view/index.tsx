import { Route, Switch, Redirect } from 'react-router-dom';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import Toolbar, { useStyles as toolbarStyles } from './toolbar';
import { layout } from '@ovvio/styles/lib';
import DueDateEditor from 'shared/components/due-date-editor';
import { Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import NotesView from './note-editor';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { CardsDisplay } from './cards-display';
import { EmptyState } from './empty-state';
import { useDemoInfo } from 'shared/demo';
import { DemoIndicator } from './demo-indicator';

const useStyles = makeStyles(theme => ({
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
  selectedWorkspaces: VertexManager<Workspace>[];
  className?: string;
}

export default function WorkspaceContentView({
  selectedWorkspaces,
  className,
}: ContentProps) {
  const styles = useStyles();
  const { isInDemo, demoWorkspaces, setSelectedWorkspaces } = useDemoInfo();

  return (
    <div className={cn(styles.main, className)}>
      <Toolbar />
      <DueDateEditor>
        <div className={cn(styles.content)}>
          <div className={cn(styles.router)}>
            <Switch>
              <Route
                path={`/:workspaceId/notes/:noteId`}
                render={props => <NotesView {...props} />}
              />
              <Route
                path="/"
                exact
                render={() =>
                  selectedWorkspaces.length ? (
                    <CardsDisplay selectedWorkspaces={selectedWorkspaces} />
                  ) : (
                    <EmptyState />
                  )
                }
              />
              <Route path="/" render={() => <Redirect to="/" />} />
            </Switch>
          </div>
          {isInDemo && (
            <DemoIndicator
              setSelectedWorkspaces={setSelectedWorkspaces}
              demoWorkspaces={demoWorkspaces}
            />
          )}
        </div>
      </DueDateEditor>
    </div>
  );
}
