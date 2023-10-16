import React, { useState, useMemo, useEffect } from 'react';
import { Route, RouterProvider } from 'react-router';
import { makeStyles, cn } from '../../../styles/css-objects/index.ts';
import { layout } from '../../../styles/layout.ts';
import {
  darkTheme,
  lightTheme,
  ThemeProvider,
} from '../../../styles/theme.tsx';
import LoadingView from './loading-view.tsx';
import { CreateWorkspaceView } from './new-workspace/index.tsx';
import WorkspaceContentView from './workspace-content/workspace-view/index.tsx';
import { WorkspacesBar } from './workspaces-bar/index.tsx';
import { createBrowserRouter } from 'react-router-dom';
import { uniqueId } from '../../../base/common.ts';
import { StyleProvider } from '../../../styles/css-objects/context.tsx';
import {
  CfdsClientProvider,
  useIsGraphLoading,
} from '../core/cfds/react/graph.tsx';
import NoteView from './workspace-content/workspace-view/note-editor/index.tsx';
import { RepoExplorer } from '../backoffice/repo-explorer.tsx';
import { CardsDisplay } from './workspace-content/workspace-view/cards-display/index.tsx';
import { OwnedSession, generateKeyPair } from '../../../auth/session.ts';
import { useLogger } from '../core/cfds/react/logger.tsx';
import { loadAllSessions, storeSession } from '../../../auth/idb.ts';
import { retry } from '../../../base/time.ts';
import { Logger } from '../../../logging/log.ts';
import { createNewSession } from '../../../net/rest-api.ts';

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

// const isDarkTheme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
const isDarkTheme = false;

// May 24, 2022
const CUTOFF_DATE = new Date(1653393858426);

type RootProps = React.PropsWithChildren<{
  style?: any;
}>;

function Root({ style, children }: RootProps) {
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
          <WorkspaceContentView key="contents">{children}</WorkspaceContentView>
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
    element: (
      <Root style={lightTheme}>
        <CardsDisplay />
      </Root>
    ),
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
]);

interface CancelHandle {
  cancelled?: true;
}

async function setupSession(
  logger: Logger,
  callback: (session: OwnedSession) => void,
  cancelHandle: CancelHandle
): Promise<void> {
  while (cancelHandle.cancelled !== true) {
    try {
      const session = await retry(
        async () => {
          let s = (await loadAllSessions())[0];
          if (!s) {
            const keys = await generateKeyPair();
            const publicSession = await createNewSession(keys.publicKey);
            if (publicSession) {
              s = {
                ...publicSession,
                privateKey: keys.privateKey,
              };
              await storeSession(s);
            }
          }
          return s;
        },
        30000,
        5000
      );
      if (session) {
        callback(session);
        break;
      }
    } catch (err: any) {
      logger.log({
        severity: 'INFO',
        error: 'SessionError',
        type: 'AnonCreationFailed',
      });
    }
  }
}

export default function AppView() {
  //const wsLoadedRef = useRef(false);
  const theme = useMemo(() => (isDarkTheme ? darkTheme : lightTheme), []);
  const [session, setSession] = useState<OwnedSession | undefined>();
  const logger = useLogger();

  useEffect(() => {
    const handle: CancelHandle = {};
    setupSession(
      logger,
      (s) => {
        setSession(s);
      },
      handle
    );
    return () => {
      handle.cancelled = true;
    };
  }, [logger, setSession]);

  return (
    <CfdsClientProvider session={session}>
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
