import React, { useEffect, useRef, useState } from 'react';
import { NS_USERS, NS_WORKSPACE } from '../../../../cfds/base/scheme-types.ts';
import { Record } from '../../../../cfds/base/record.ts';
import { GraphManager } from '../../../../cfds/client/graph/graph-manager.ts';
import { VertexManager } from '../../../../cfds/client/graph/vertex-manager.ts';
import { Workspace } from '../../../../cfds/client/graph/vertices/index.ts';
import { styleguide } from '../../../../styles/styleguide.ts';
import { RaisedButton } from '../../../../styles/components/buttons.tsx';
import { TextField } from '../../../../styles/components/inputs/index.ts';
import { H2, Text } from '../../../../styles/components/texts.tsx';
import { cn, makeStyles } from '../../../../styles/css-objects/index.ts';
import { useGraphManager } from '../../core/cfds/react/graph.tsx';
import { useSharedQuery } from '../../core/cfds/react/query.ts';
import CreateIllustration from './create-workspace-illustration.tsx';
import { DuplicateWorkspaceView } from './duplicate-workspace.tsx';
import { UISource } from '../../../../logging/client-events.ts';
import { useLogger } from '../../core/cfds/react/logger.tsx';
import { uniqueId } from '../../../../base/common.ts';
import { VertexId } from '../../../../cfds/client/graph/vertex.ts';

const useStyles = makeStyles((theme) => ({
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

type CreateWorkspaceOptions = {
  copyFrom?: VertexManager<Workspace>;
};

function duplicateWorkspace(
  name: string,
  graph: GraphManager,
  src: VertexManager<Workspace>
): VertexManager<Workspace> {
  const subGraph = graph.exportSubGraph(src.key, 1, [NS_USERS], (r: Record) => {
    if (r.scheme.namespace === NS_WORKSPACE) {
      r.set('name', name);
    }
    if (r.scheme.hasField('createdBy')) {
      r.set('createdBy', graph.rootKey);
    }
  });

  const data = graph.importSubGraph(subGraph, false);
  return data[0] as VertexManager<Workspace>;
}

function createNewWorkspace(
  name: string,
  graphManager: GraphManager,
  opts: CreateWorkspaceOptions = {}
): VertexManager<Workspace> {
  const { copyFrom } = opts;
  if (copyFrom) {
    return duplicateWorkspace(name, graphManager, copyFrom);
  }
  return graphManager.createVertex<Workspace>(NS_WORKSPACE, {
    name,
    users: new Set([graphManager.rootKey]),
  }).manager;
}

export interface WorkspaceFormProps {
  source?: UISource;
  onWorkspaceCreated: (createResult: VertexId<Workspace>) => void;
}

export function WorkspaceForm({
  source,
  onWorkspaceCreated,
}: WorkspaceFormProps) {
  const styles = useStyles();
  const [name, setName] = useState('');
  const logger = useLogger();
  const graph = useGraphManager();
  const nameRef = useRef();
  const createRef = useRef(null);
  const workspacesQuery = useSharedQuery('workspaces');
  const [duplicateWs, setDuplicateWs] = useState<VertexManager<Workspace>>();
  const [flowId] = useState(uniqueId());

  useEffect(() => {
    logger.log({
      severity: 'EVENT',
      event: 'Start',
      flow: 'create',
      type: 'workspace',
      source,
      id: flowId,
    });
  }, [logger, flowId]);

  const createWorkspace = () => {
    const wsResult = createNewWorkspace(name, graph, {
      copyFrom: duplicateWs,
    });
    logger.log({
      severity: 'EVENT',
      event: 'End',
      flow: 'create',
      type: 'workspace',
      source,
      id: flowId,
    });
    graph.sharedQueriesManager.workspaces.forEach(
      (ws) => (ws.selected = ws.key === wsResult.key)
    );
    wsResult.getVertexProxy().selected = true;
    onWorkspaceCreated(wsResult);
  };
  return (
    <React.Fragment>
      <H2>Create a new workspace</H2>
      <React.Fragment>
        <p>
          <Text>
            Organize your units, departments and projects with Workspaces. Write
            meeting minutes or notes, and assign tasks to a specific group of
            people.
          </Text>
        </p>
        {workspacesQuery.count > 0 && (
          <DuplicateWorkspaceView
            className={cn(styles.input)}
            allWorkspaces={workspacesQuery.results}
            setWorkspace={setDuplicateWs}
            workspace={duplicateWs}
          />
        )}
        <TextField
          placeholder="Name your workspace"
          value={name}
          onChange={(e: any) => setName(e.currentTarget.value)}
          className={cn(styles.input)}
          ref={nameRef}
        />
        <RaisedButton
          disabled={name.trim().length === 0}
          className={cn(styles.input)}
          onClick={createWorkspace}
          ref={createRef}
        >
          <span>Create new workspace</span>
        </RaisedButton>
      </React.Fragment>
      <CreateIllustration className={cn(styles.illustration)} />
    </React.Fragment>
  );
}
