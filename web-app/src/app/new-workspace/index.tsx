import React, { useMemo, useState } from 'https://esm.sh/react@18.2.0';
import { useNavigate } from 'https://esm.sh/react-router@6.7.0';
import { makeStyles, cn } from '../../../../styles/css-objects/index.ts';
import { layout, styleguide } from '../../../../styles/index.ts';
import Toolbar from '../workspace-content/workspace-view/toolbar/index.tsx';
import { VertexManager } from '../../../../cfds/client/graph/vertex-manager.ts';
import { Workspace } from '../../../../cfds/client/graph/vertices/workspace.ts';
import { WorkspaceForm } from './workspace-form.tsx';
import { useCallback } from 'https://esm.sh/v96/@types/react@18.0.21/index.d.ts';
import { UISource } from '../../../../logging/client-events.ts';

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
  source: UISource;
  onWorkspaceCreated?: (wsKey: string) => void;
}
export const CreateWorkspaceView = ({
  source,
  onWorkspaceCreated,
}: CreateWorkspaceViewProps) => {
  const styles = useStyles();
  const [ws, setWs] = useState<VertexManager<Workspace>>();
  const navigate = useNavigate();

  const onCreated = useCallback(
    (result: VertexManager<Workspace>) => {
      setWs(result);
      if (onWorkspaceCreated) {
        onWorkspaceCreated(result.key);
      }
    },
    [setWs]
  );

  const closeView = useCallback(() => {
    navigate('/login');
  }, [navigate]);

  return (
    <div className={cn(styles.root)}>
      <Toolbar />
      <div className={cn(styles.content)}>
        <div className={cn(styles.card)}>
          {/* {ws ? (
            <InviteForm showOnboard={true} close={closeView} source={source} />
          ) : ( */}
          <WorkspaceForm source={source} onWorkspaceCreated={onCreated} />
          {/* )} */}
        </div>
      </div>
    </div>
  );
};
