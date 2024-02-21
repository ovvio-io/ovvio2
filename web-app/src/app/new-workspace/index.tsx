import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { makeStyles, cn } from '../../../../styles/css-objects/index.ts';
import { layout, styleguide } from '../../../../styles/index.ts';
import Toolbar from '../workspace-content/workspace-view/toolbar/index.tsx';
import { Workspace } from '../../../../cfds/client/graph/vertices/workspace.ts';
import { WorkspaceForm } from './workspace-form.tsx';
import { UISource } from '../../../../logging/client-events.ts';
import { VertexId } from '../../../../cfds/client/graph/vertex.ts';
import { usePartialView } from '../../core/cfds/react/graph.tsx';

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
  onWorkspaceCreated?: (wsKey: VertexId<Workspace>) => void;
}
export const CreateWorkspaceView = ({
  source,
  onWorkspaceCreated,
}: CreateWorkspaceViewProps) => {
  const styles = useStyles();
  const navigate = useNavigate();
  const view = usePartialView('selectedWorkspaces');

  const onCreated = useCallback(
    (result: VertexId<Workspace>) => {
      view.clear();
      view.selectedWorkspaces.add(view.graph.getVertex<Workspace>(result));
      navigate('/');
    },
    [view, navigate]
  );

  return (
    <div className={cn(styles.root)}>
      <Toolbar />
      <div className={cn(styles.content)}>
        <div className={cn(styles.card)}>
          <WorkspaceForm
            source={source}
            onWorkspaceCreated={onWorkspaceCreated || onCreated}
          />
        </div>
      </div>
    </div>
  );
};
