import React, { useState, useMemo, useEffect } from 'react';
import { Route, RouterProvider } from 'react-router';
import { makeStyles, cn } from '../../../styles/css-objects/index.ts';
import { layout } from '../../../styles/layout.ts';
import { lightTheme } from '../../../styles/theme.tsx';
import LoadingView from './loading-view.tsx';
import { CreateWorkspaceView } from './new-workspace/index.tsx';
import WorkspaceContentView from './workspace-content/workspace-view/index.tsx';
import { WorkspacesBar } from './workspaces-bar/index.tsx';
import { createBrowserRouter } from 'react-router-dom';
import NoteView from './workspace-content/workspace-view/note-editor/index.tsx';
import { RepoExplorer } from '../backoffice/repo-explorer.tsx';
import { CardsDisplay } from './workspace-content/workspace-view/cards-display/index.tsx';
import { Settings } from './settings/index.tsx';
import { CategorySettings } from './settings/category-settings.tsx';
import { App } from '../../../styles/components/app.tsx';

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
    element: (
      <Root style={lightTheme}>
        <NoteView />
      </Root>
    ),
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
