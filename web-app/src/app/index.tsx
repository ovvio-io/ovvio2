import React, { useState, useMemo } from 'react';
import { Route, RouterProvider } from 'react-router';
import { makeStyles, cn } from '../../../styles/css-objects/index.ts';
import { layout } from '../../../styles/layout.ts';
import {
  darkTheme,
  lightTheme,
  ThemeProvider,
} from '../../../styles/theme.tsx';
import { useIsGraphLoading } from '../core/cfds/react/query.ts';
import LoadingView from './loading-view.tsx';
import { CreateWorkspaceView } from './new-workspace/index.tsx';
import WorkspaceContentView from './workspace-content/workspace-view/index.tsx';
import { WorkspacesBar } from './workspaces-bar/index.tsx';
import { createBrowserRouter } from 'react-router-dom';
import { uniqueId } from '../../../base/common.ts';
import { StyleProvider } from '../../../styles/css-objects/context.tsx';
import { CfdsClientProvider } from '../core/cfds/react/graph.tsx';

const useStyles = makeStyles((theme) => ({
  blurred: {
    filter: 'blur(2px)',
  },
  root: {
    height: '100vh',
    width: '100vw',
    basedOn: [layout.row],
  },
  content: {
    height: '100%',
    overflow: 'hidden',
    // width: `calc(100% - ${WORKSPACE_BAR_WIDTH}px)`,
    basedOn: [layout.column, layout.flexSpacer],
  },
}));

interface AppProps {}

// const isDarkTheme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
const isDarkTheme = false;

// May 24, 2022
const CUTOFF_DATE = new Date(1653393858426);

function Root({ style }: AppProps & { style?: any }) {
  const styles = useStyles();
  const isLoading = useIsGraphLoading();
  const [loaded, setLoaded] = useState(!isLoading);

  if (!loaded && !isLoading) {
    setLoaded(true);
  }

  return (
    <div className={cn(styles.root)} style={style}>
      {loaded && <WorkspacesBar key={'wsbar'} />}
      {loaded ? (
        <div className={cn(styles.content)}>
          <WorkspaceContentView key="contents" />
        </div>
      ) : (
        <LoadingView />
      )}
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root style={lightTheme} />,
  },
  {
    path: '/new',
    element: (
      <CreateWorkspaceView //TODO: CHECK linr 78-88 in comment
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
]);

export default function AppView() {
  //const wsLoadedRef = useRef(false);
  const theme = useMemo(() => (isDarkTheme ? darkTheme : lightTheme), []);

  return (
    <CfdsClientProvider user="ofri" sessionId={`ofri/${uniqueId()}`}>
      <StyleProvider dev={false}>
        <ThemeProvider theme={theme} isRoot={true}>
          {({ style }) => (
            <React.StrictMode>
              <RouterProvider router={router} />
            </React.StrictMode>
          )}
        </ThemeProvider>
      </StyleProvider>
    </CfdsClientProvider>
  );
}
