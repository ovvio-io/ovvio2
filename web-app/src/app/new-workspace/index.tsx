import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { layout, styleguide } from '@ovvio/styles/lib';
import Toolbar from 'app/workspace-content/workspace-view/toolbar';
import { useMemo, useState } from 'react';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { WorkspaceCreated, WorkspaceForm } from './workspace-form';
import { LOGIN, useHistory } from 'core/react-utils/history';
import { InviteForm } from 'shared/invite-form';
import { useWorkspaceTutorialSteps } from './workspace-tutorial';
import { UserOnboard } from 'shared/tutorial';

const useStyles = makeStyles(theme => ({
  root: {
    alignItems: 'stretch',
    flexShrink: 1,
    basedOn: [layout.column, layout.flex],
  },
  content: {
    backgroundColor: theme.background[150],
    alignItems: 'center',
    basedOn: [layout.column, layout.flex],
  },
  card: {
    marginTop: styleguide.gridbase * 3,
    alignItems: 'center',
    textAlign: 'center',
    backgroundColor: theme.background[0],
    padding: styleguide.gridbase * 4,
    paddingBottom: 0,
    width: '100%',
    maxWidth: styleguide.gridbase * 90,
    boxSizing: 'border-box',
    boxShadow: theme.shadows.z2,
    basedOn: [layout.column],
  },
  input: {
    marginTop: styleguide.gridbase * 3,
    width: '100%',
    maxWidth: styleguide.gridbase * 40,
  },
  illustration: {
    marginTop: styleguide.gridbase * 7,
  },
  error: {
    marginTop: styleguide.gridbase,
    color: 'red',
  },
}));

interface CreateWorkspaceViewProps {
  location: any;
  onWorkspaceCreated?: (wsKey: string) => void;
}
export const CreateWorkspaceView = ({
  location,
  onWorkspaceCreated,
}: CreateWorkspaceViewProps) => {
  const styles = useStyles();
  const [ws, setWs] = useState<VertexManager<Workspace>>();
  const history = useHistory();
  const workspaces = useMemo(() => [ws], [ws]);
  const tutorialSteps = useWorkspaceTutorialSteps();

  const onCreated = (result: WorkspaceCreated) => {
    let wsKey: string;
    if (result.loaded) {
      setWs(result.workspace);
      wsKey = result.workspace.key;
    } else {
      wsKey = (result as any).workspaceId;
      history.push(LOGIN);
    }

    if (onWorkspaceCreated) {
      onWorkspaceCreated(wsKey);
    }
  };

  const close = () => {
    history.push(LOGIN);
  };

  return (
    <UserOnboard
      disabled={true}
      steps={tutorialSteps}
      tutorialId="CREATE_WORKSPACE"
    >
      <div className={cn(styles.root)}>
        <Toolbar />
        <div className={cn(styles.content)}>
          <div className={cn(styles.card)}>
            {ws ? (
              <InviteForm
                workspaces={workspaces}
                showOnboard={true}
                close={close}
                source="new-workspace"
              />
            ) : (
              <WorkspaceForm
                location={location}
                onWorkspaceCreated={onCreated}
              />
            )}
          </div>
        </div>
      </div>
    </UserOnboard>
  );
};
