import { ReadonlyJSONObject } from '@ovvio/base/lib/utils/interfaces';
import { NS_WORKSPACE } from '@ovvio/cfds';
import { OnboardingStep } from '@ovvio/cfds/lib/base/scheme-versions';
import { Note, Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { layout } from '@ovvio/styles/lib';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { Devices, useCurrentDevice } from '@ovvio/styles/lib/responsive';
import { darkTheme, lightTheme, ThemeProvider } from '@ovvio/styles/lib/theme';
import {
  useGraphManager,
  useRootUser,
  usePartialView,
} from 'core/cfds/react/graph';
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
      <CriticalErrorDialog />
      {loaded ? (
        <FileUploaderProvider>
          <WorkspacesBar key={'wsbar'} />
          <div className={cn(styles.content)}>
            <InvitationsProvider>
              <Switch>
                <Route
                  path="/new"
                  exact
                  render={props => (
                    <CreateWorkspaceView location={props.location} />
                  )}
                />
                <Route
                  path="/"
                  render={() => <WorkspaceContentView key={'contents'} />}
                />
              </Switch>
            </InvitationsProvider>
          </div>
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
