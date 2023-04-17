import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  createBrowserRouter,
  Route,
  RouterProvider,
  Routes,
} from 'react-router-dom';
import { layout } from '../../../styles/index.ts';
import { cn, makeStyles } from '../../../styles/css-objects/index.ts';
import { Devices, useCurrentDevice } from '../../../styles/responsive.ts';
import {
  darkTheme,
  lightTheme,
  ThemeProvider,
} from '../../../styles/theme.tsx';
import {
  CfdsClientProvider,
  useGraphManager,
} from '../core/cfds/react/graph.tsx';
import { VertexManager } from '../../../cfds/client/graph/vertex-manager.ts';
import { Filter } from '../../../cfds/client/graph/vertices/filter.ts';
import { Workspace } from '../../../cfds/client/graph/vertices/workspace.ts';
import LoadingView from './loading-view.tsx';
import { CreateWorkspaceView } from './new-workspace/index.tsx';
import WorkspaceContentView from './workspace-content/index.tsx';
import { WorkspacesBar } from './workspaces-bar/index.tsx';
import { useSharedQuery } from '../core/cfds/react/query.ts';
import { usePartialVertex, useVertex } from '../core/cfds/react/vertex.ts';
import { VertexId } from '../../../cfds/client/graph/vertex.ts';
import { delay } from '../../../base/time.ts';
import { uniqueId } from '../../../base/common.ts';
import { StyleProvider } from '../../../styles/css-objects/context.tsx';

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

export interface FilterContext {
  filter: VertexManager<Filter>;
  setFilter: (filter: VertexId<Filter>) => void;
}

const filterContext = React.createContext<FilterContext | undefined>(undefined);

export interface FilterContextProviderProps {
  filterKey?: string;
  children?: React.ReactNode;
}

export const FilterKeyTasks = 'TasksFilter';
export const FilterKeyNotes = 'NotesFilter';

export function FilterContextProvider(props: FilterContextProviderProps = {}) {
  const graph = useGraphManager();
  const [filter, setFilter] = useState<VertexManager<Filter>>(
    graph.getVertexManager<Filter>(props.filterKey || FilterKeyTasks)
  );
  return (
    <filterContext.Provider
      value={{
        filter,
        setFilter: (id) => setFilter(graph.getVertexManager<Filter>(id)),
      }}
    >
      {props.children}
    </filterContext.Provider>
  );
}

export function useFilterContext(): FilterContext {
  return useContext(filterContext)!;
}

export function useFilter(): Filter {
  return useVertex(useFilterContext().filter);
}

export function usePartialFilter(keys: (keyof Filter)[]): Filter {
  return usePartialVertex(useFilterContext().filter, keys);
}

interface AppProps {
  style?: any;
}

// const isDarkTheme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
const isDarkTheme = false;

function Root(props: AppProps) {
  const styles = useStyles();

  // const [selectedWorkspaces, setSelectedWorkspaces] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const graph = useGraphManager();

  // useEffect(() => {
  //   delay(3000, () => setLoading(false));
  //   // graph.loadLocalContents().then(() => setLoading(false));
  // }, [graph]);

  const device = useCurrentDevice();

  const [expanded, setExpanded] = useState(device > Devices.Tablet);
  // const selectedWorkspacesQuery = useSharedQuery('selectedWorkspaces');
  const workspacesQuery = useSharedQuery('workspaces');

  // const currentUser = user?.currentUser;
  // const history = useHistoryStatic();

  // useEffect(() => {
  //   if (currentUser?.firstLogin) {
  //     history.push(CREATE_WORKSPACE);
  //   }
  // }, [currentUser?.firstLogin, history]);
  // useSyncUrlParam(
  //   'selectedWorkspaces',
  //   true,
  //   Array.from(selectedWorkspacesQuery.keys()),
  //   (keys) =>
  //     workspacesQuery.forEach((ws) => (ws.selected = keys.includes(ws.key))),
  //   {
  //     route: '/',
  //   }
  // );

  // const onWorkspaceCreated = useCallback((wsKey: string) => {
  //   setSelectedWorkspaces((current) => [...current, wsKey]);
  // }, []);

  return (
    <div className={cn(styles.root)} style={props?.style}>
      <FilterContextProvider>
        {!loading ? (
          <div>
            <WorkspacesBar expanded={expanded} setExpanded={setExpanded} />
            <div className={cn(styles.content)}>
              <WorkspaceContentView />
            </div>
          </div>
        ) : (
          <LoadingView />
        )}
      </FilterContextProvider>
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
      <CreateWorkspaceView
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
    <CfdsClientProvider userId="ofri" sessionId={`ofri/${uniqueId()}`}>
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
