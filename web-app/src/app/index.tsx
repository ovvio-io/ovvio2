import { ReadonlyJSONObject } from '@ovvio/base/lib/utils/interfaces';
import { NS_WORKSPACE } from '@ovvio/cfds';
import { OnboardingStep } from '@ovvio/cfds/lib/base/scheme-versions';
import { Note } from '@ovvio/cfds/lib/client/graph/vertices';
import { layout } from '@ovvio/styles/lib';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { Devices, useCurrentDevice } from '@ovvio/styles/lib/responsive';
import { darkTheme, lightTheme, ThemeProvider } from '@ovvio/styles/lib/theme';
import { useGraphManager, useRootUser } from 'core/cfds/react/graph';
import { useIsGraphLoading } from 'core/cfds/react/query';
import { usePartialVertex } from 'core/cfds/react/vertex';
import config from 'core/config';
import { Features, useIsFeatureActive } from 'core/feature-toggle';
import { useSyncUrlParam } from 'core/react-utils/history/use-sync-url-param';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Route, Switch, useLocation } from 'react-router';
import { FileUploaderProvider } from 'shared/components/file-uploader';
import { DemoProvider } from 'shared/demo';
import { InvitationsProvider } from 'shared/invitation';
import { Userpilot } from 'userpilot';
import { CriticalErrorDialog } from './critical-error-view';
import LoadingView from './loading-view';
import { CreateWorkspaceView } from './new-workspace';
import WorkspaceContentView from './workspace-content';
import { WorkspacesBar } from './workspaces-bar/index';

if (!config.isProduction) {
  document.title = `Ovvio - ${config.name}`;
}

const useStyles = makeStyles(theme => ({
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

function useUserPilot() {
  const rootUser = useRootUser();
  const { creationDate, onboardingStep, isLoading } = usePartialVertex(
    rootUser,
    ['creationDate', 'onboardingStep', 'isLoading']
  );

  const isActive = useIsFeatureActive(Features.Userpilot);
  const location = useLocation();
  // const prevPathname = useRef<string>();
  useEffect(() => {
    if (isLoading) {
      return;
    }
    Userpilot.identify(rootUser.key, {
      created_at: creationDate.toISOString(),
      onboardingStep: onboardingStep,
    });
  }, [isLoading, rootUser.key, onboardingStep, creationDate]);

  useEffect(() => {
    if (isActive && !rootUser.isLoading) {
      Userpilot.reload();
    }
    // if (prevPathname.current && location.pathname === prevPathname.current) {
    //   return;
    // }
    // prevPathname.current = location.pathname;
    // if (isActive) {
    //   Userpilot.reload({
    //     url: `${window.location.hostname}${location.pathname}`,
    //   });
    // }
  }, [location, isActive, rootUser.isLoading]);
}

const kDemoDataPromise: Promise<ReadonlyJSONObject> = fetch('/demo.json').then(
  response => response.json()
);

// May 24, 2022
const CUTOFF_DATE = new Date(1653393858426);

function Root({ style }: AppProps & { style?: any }) {
  const styles = useStyles();

  useUserPilot();

  const [selectedWorkspaces, setSelectedWorkspaces] = useState([]);

  const isLoading = useIsGraphLoading();
  const graph = useGraphManager();
  const [demoWorkspaces, setDemoWorkspaces] = useState<string[]>([]);
  const { onboardingStep, creationDate } = usePartialVertex(useRootUser(), [
    'onboardingStep',
    'creationDate',
  ]);

  const isInDemo =
    onboardingStep === OnboardingStep.Start && creationDate > CUTOFF_DATE;

  useEffect(() => {
    if (isInDemo && !demoWorkspaces.length) {
      kDemoDataPromise.then(data => {
        const vertices = graph.importSubGraph(data, true);
        vertices.forEach(mgr => {
          const vert = mgr.getVertexProxy();
          vert.isDemoData = true;
          if (vert instanceof Note) {
            vert.rewritePinsToRootUser();
          }
        });
        setDemoWorkspaces(
          vertices
            .filter(mgr => mgr.namespace === NS_WORKSPACE)
            .map(mgr => mgr.key)
        );
      });
    }
  }, [isInDemo, graph, demoWorkspaces]);

  useEffect(() => {
    if (!isLoading && demoWorkspaces.length > 0) {
      // Setup demo data
      setSelectedWorkspaces(demoWorkspaces);
      // triggerTutorial(UserpilotTutorial.OnboardDemo);
    }
  }, [isLoading, demoWorkspaces]);

  const device = useCurrentDevice();

  const [expanded, setExpanded] = useState(device > Devices.Tablet);

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
    selectedWorkspaces,
    setSelectedWorkspaces,
    {
      route: '/',
    }
  );

  const onWorkspaceCreated = useCallback((wsKey: string) => {
    setSelectedWorkspaces(current => [...current, wsKey]);
  }, []);

  return (
    <div className={cn(styles.root)} style={style}>
      <CriticalErrorDialog />
      {!isLoading ? (
        <FileUploaderProvider>
          <DemoProvider
            isInDemo={isInDemo}
            demoWorkspaces={demoWorkspaces}
            setSelectedWorkspaces={setSelectedWorkspaces}
          >
            <WorkspacesBar
              expanded={expanded}
              setExpanded={setExpanded}
              selectedWorkspaces={selectedWorkspaces}
              setSelectedWorkspaces={setSelectedWorkspaces}
            />
            <div className={cn(styles.content)}>
              <InvitationsProvider>
                <Switch>
                  <Route
                    path="/new"
                    exact
                    render={props => (
                      <CreateWorkspaceView
                        location={props.location}
                        onWorkspaceCreated={onWorkspaceCreated}
                      />
                    )}
                  />
                  <Route
                    path="/"
                    render={() => (
                      <WorkspaceContentView
                        selectedWorkspaces={selectedWorkspaces}
                      />
                    )}
                  />
                </Switch>
              </InvitationsProvider>
            </div>
          </DemoProvider>
        </FileUploaderProvider>
      ) : (
        <LoadingView />
      )}
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
