import React, { useMemo, useState } from 'https://esm.sh/react@18.2.0';
import { makeStyles, cn } from '../../../../styles/css-objects/index.ts';
import { layout, styleguide } from '../../../../styles/index.ts';
import Toolbar from '../workspace-content/workspace-view/toolbar/index.tsx';
import { VertexManager } from '../../../../cfds/client/graph/vertex-manager.ts';
import { Workspace } from '../../../../cfds/client/graph/vertices/workspace.ts';
import { WorkspaceCreated, WorkspaceForm } from './workspace-form.tsx';
import { InviteForm } from '../../shared/invite-form/index.tsx';

const useStyles = makeStyles((theme) => ({
  root: {
    alignItems: 'stretch',
    flexShrink: 1,
    basedOn: [layout.column, layout.flex],
  },
  content: {
    backgroundColor: theme.background[100],
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
  onWorkspaceCreated?: (wsKey: string) => void;
}
export const CreateWorkspaceView = ({
  onWorkspaceCreated,
}: CreateWorkspaceViewProps) => {
  const styles = useStyles();
  const [ws, setWs] = useState<VertexManager<Workspace>>();
  const workspaces = useMemo(() => [ws], [ws]);

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
