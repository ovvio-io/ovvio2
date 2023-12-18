import React from 'react';
import { Route, RouterProvider } from 'react-router';
import { createBrowserRouter } from 'react-router-dom';
import { makeStyles, cn } from '../../../styles/css-objects/index.ts';
import { layout } from '../../../styles/layout.ts';
import { lightTheme } from '../../../styles/theme.tsx';
import { CreateWorkspaceView } from './new-workspace/index.tsx';
import WorkspaceContentView from './workspace-content/workspace-view/index.tsx';
import { WorkspacesBar } from './workspaces-bar/index.tsx';
import { RepoExplorer } from '../backoffice/repo-explorer.tsx';
import { CardsDisplay } from './workspace-content/workspace-view/cards-display/index.tsx';
import { Settings } from './settings/index.tsx';
import { CategorySettings } from './settings/category-settings.tsx';
import { App } from '../../../styles/components/app.tsx';
import { NoteEditor } from '../../../editor/editor.tsx';
import TabView from './settings/plugins/plugin-manager.tsx';

const useStyles = makeStyles((theme) => ({
  blurred: {
    filter: 'blur(2px)',
  },
  root: {
    height: '100%',
    basedOn: [layout.row],
  },
  content: {
    height: '100%',
    overflow: 'hidden',
    // width: `calc(100% - ${WORKSPACE_BAR_WIDTH}px)`,
    basedOn: [layout.column, layout.flexSpacer],
  },
  ws: {
    basedOn: [layout.row],
    height: '100%',
    zIndex: 1,
  },
}));

// const isDarkTheme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
const isDarkTheme = false;

// May 24, 2022
const CUTOFF_DATE = new Date(1653393858426);

type RootProps = React.PropsWithChildren<{
  style?: any;
}>;

function Root({ style, children }: RootProps) {
  const styles = useStyles();

  return (
    <div className={cn(styles.root)} style={style}>
      <WorkspacesBar key={'wsbar'} />
      <div className={cn(styles.content)}>
        <WorkspaceContentView key="contents">{children}</WorkspaceContentView>
      </div>
    </div>
  );
}

function SettingsWs({ style, children }: RootProps) {
  const styles = useStyles();

  return (
    <div className={styles.ws}>
      <WorkspacesBar />
      <div className={cn(styles.content)}>
        <WorkspaceContentView key="contents">{children}</WorkspaceContentView>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Root style={lightTheme}>
        <CardsDisplay />
      </Root>
    ),
  },
  {
    path: '/new',
    element: (
      <CreateWorkspaceView //TODO: CHECK line 78-88 in comment
        source="bar:workspace"
        // onWorkspaceCreated={(wsId: VertexId<Workspace>) => {
        //   workspacesQuery.forEach((ws) => (ws.selected = ws.key === wsKey));
        //   // Depending on exact timings, our query may miss
        //   // the newly created workspace. Ensure it's always
        //   // selected.
        //   graph.getVertex<Workspace>(wsKey).selected = true;
        // }}
      />
    ),
  },
  {
    path: `/:workspaceId/notes/:noteId`,
    // element: <NoteView />,
    element: <NoteEditor />,
  },
  {
    path: `/:repoType/:repoId/_explorer`,
    element: <RepoExplorer />,
  },
  {
    path: `/_explorer`,
    element: <RepoExplorer />,
  },
  {
    path: '/settings/:category/:tab',
    element: (
      <Settings style={lightTheme}>
        <CategorySettings />
      </Settings>
    ),
  },
  {
    path: '/settings/workspaces-infoS/:tab',
    element: (
      <Settings style={lightTheme}>
        <SettingsWs style={lightTheme}>
          <TabView category={'workspaces-info'} />
        </SettingsWs>
      </Settings>
    ),
  },
]);

export function AppView() {
  return (
    <App>
      <RouterProvider router={router} />
    </App>
  );
}

// scheme-version = add type
// add to the global view  (iew.ts - client graph - verice)
// view.ts - client graph - verices. = add getter setter

// add scheme-types.ts add type for settings tabs.

//javascript - the good parts (READ)
