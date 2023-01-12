import React, {
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'https://esm.sh/react@18.2.0';
import { Route, Switch, useLocation } from 'https://esm.sh/react-router@5.1.2';
import { layout } from '../../../styles/index.ts';
import { cn, makeStyles } from '../../../styles/css-objects/index.ts';
import { Devices, useCurrentDevice } from '../../../styles/responsive.ts';
import {
  darkTheme,
  lightTheme,
  ThemeProvider,
} from '../../../styles/theme.tsx';
import { useGraphManager, useRootUser } from '../core/cfds/react/graph.tsx';
import { usePartialVertex } from '../core/cfds/react/vertex.ts';
import { Features, useIsFeatureActive } from '../core/feature-toggle/index.tsx';
import { useSyncUrlParam } from '../core/react-utils/history/use-sync-url-param.ts';
import { FileUploaderProvider } from '../shared/components/file-uploader/index.tsx';
import { InvitationsProvider } from '../shared/invitation/index.tsx';
import { VertexManager } from '../../../cfds/client/graph/vertex-manager.ts';
import { Filter } from '../../../cfds/client/graph/vertices/filter.ts';
import { Workspace } from '../../../cfds/client/graph/vertices/workspace.ts';
import { CriticalErrorDialog } from './critical-error-view.tsx';
import LoadingView from './loading-view.tsx';
import { CreateWorkspaceView } from './new-workspace/index.tsx';
import WorkspaceContentView from './workspace-content/index.tsx';
import { WorkspacesBar } from './workspaces-bar/index.tsx';
import { useSharedQuery } from '../core/cfds/react/query.ts';

const useStyles = makeStyles((theme: any) => ({
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

export interface NotesContext {
  filter: VertexManager<Filter>;
  setFilter: (filter: VertexManager<Filter>) => void;
}

const notesContext = React.createContext<NotesContext | undefined>(undefined);

export interface NotesContextProviderProps {
  filterKey?: string;
  children: React.ReactNode;
}

export function NotesContextProvider({
  filterKey,
  children,
}: NotesContextProviderProps) {
  const graph = useGraphManager();
  const [filter, setFilter] = useState<VertexManager<Filter>>(
    graph.getVertexManager(filterKey || 'MyTasks')
  );
  return (
    <notesContext.Provider value={{ filter, setFilter }}>
      {children}
    </notesContext.Provider>
  );
}

export function useNotesContext(): NotesContext {
  return useContext(notesContext)!;
}

interface AppProps {}

// const isDarkTheme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
const isDarkTheme = false;

function Root({ style }: AppProps & { style?: any }) {
  const styles = useStyles();

  // const [selectedWorkspaces, setSelectedWorkspaces] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const graph = useGraphManager();
  const { creationDate } = usePartialVertex(useRootUser(), ['creationDate']);

  useEffect(() => {
    graph.loadLocalContents().then(() => setLoading(false));
  }, [graph]);

  const device = useCurrentDevice();

  const [expanded, setExpanded] = useState(device > Devices.Tablet);
  const selectedWorkspacesQuery = useSharedQuery('selectedWorkspaces');
  const workspacesQuery = useSharedQuery('workspaces');

  // const currentUser = user?.currentUser;
  // const history = useHistoryStatic();

  // useEffect(() => {
  //   if (currentUser?.firstLogin) {
  //     history.push(CREATE_WORKSPACE);
  //   }
  // }, [currentUser?.firstLogin, history]);
  useSyncUrlParam(
    'selectedWorkspaces',
    true,
    Array.from(selectedWorkspacesQuery.keys()),
    (keys) =>
      workspacesQuery.forEach((ws) => (ws.selected = keys.includes(ws.key))),
    {
      route: '/',
    }
  );

  // const onWorkspaceCreated = useCallback((wsKey: string) => {
  //   setSelectedWorkspaces((current) => [...current, wsKey]);
  // }, []);

  return (
    <div className={cn(styles.root)} style={style}>
      <NotesContextProvider>
        {!loading ? (
          <FileUploaderProvider>
            <WorkspacesBar
              expanded={expanded}
              setExpanded={setExpanded}
              // selectedWorkspaces={selectedWorkspaces}
              // setSelectedWorkspaces={setSelectedWorkspaces}
            />
            <div className={cn(styles.content)}>
              <InvitationsProvider>
                <Switch>
                  <Route
                    path="/new"
                    exact
                    render={(props) => (
                      <CreateWorkspaceView
                        location={props.location}
                        onWorkspaceCreated={(wsKey) => {
                          workspacesQuery.forEach(
                            (ws) => (ws.selected = ws.key === wsKey)
                          );
                          // Depending on exact timings, our query may miss
                          // the newly created workspace. Ensure it's always
                          // selected.
                          graph.getVertex<Workspace>(wsKey).selected = true;
                        }}
                      />
                    )}
                  />
                  <Route
                    path="/"
                    render={() => (
                      <WorkspaceContentView
                        selectedWorkspaces={Array.from(
                          selectedWorkspacesQuery.keys()
                        )}
                      />
                    )}
                  />
                </Switch>
              </InvitationsProvider>
            </div>
          </FileUploaderProvider>
        ) : (
          <LoadingView />
        )}
      </NotesContextProvider>
    </div>
  );
}

export default function AppView() {
  //const wsLoadedRef = useRef(false);
  const theme = useMemo(() => (isDarkTheme ? darkTheme : lightTheme), []);
  return (
    <ThemeProvider theme={theme} isRoot={true}>
      {({ style }) => <Root style={style} />}
    </ThemeProvider>
  );
}
