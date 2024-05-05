import React, { useEffect, useRef, useState } from 'react';
import {
  NS_USERS,
  NS_WORKSPACE,
  SchemeNamespace,
} from '../../../../cfds/base/scheme-types.ts';
import { CoreObject } from '../../../../base/core-types/base.ts';
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
import { Repository } from '../../../../repo/repo.ts';
import { getOrganizationId } from '../../../../net/rest-api.ts';

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
  graph: GraphManager,
  src: VertexManager<Workspace>,
  initialData: CoreObject,
): VertexManager<Workspace> {
  const data = {
    ...src.record.cloneData(),
    ...initialData,
  };
  delete data.isTemplate;
  const newWs = graph.createVertex<Workspace>(SchemeNamespace.WORKSPACE, data);
  const srcRepo = graph.repository(Repository.id('data', src.key));
  const recordByNamespace = new Map<SchemeNamespace, [string, Record][]>();
  const rewriteKeys = new Map<string, string>();
  rewriteKeys.set(src.key, newWs.key);
  for (const k of srcRepo.keys()) {
    const record = srcRepo.valueForKey(k);
    let entries = recordByNamespace.get(record.scheme.namespace);
    if (!entries) {
      entries = [];
      recordByNamespace.set(record.scheme.namespace, entries);
    }
    entries.push([k, record]);
    rewriteKeys.set(k, uniqueId());
  }
  const newRepoId = Repository.id('data', newWs.key);
  graph.markRepositoryReady(newRepoId);
  const dstRepo = graph.repository(newRepoId);
  // Copy notes and reset their assignees
  for (const [oldKey, record] of recordByNamespace.get(SchemeNamespace.NOTES) ||
    []) {
    record.delete('assignees');
    record.rewriteRefs(rewriteKeys);
    dstRepo.setValueForKey(rewriteKeys.get(oldKey)!, record, undefined);
  }
  // Copy everything else
  for (const ns of recordByNamespace.keys()) {
    if (ns === SchemeNamespace.NOTES) {
      continue;
    }
    for (const [oldKey, record] of recordByNamespace.get(ns)!) {
      record.rewriteRefs(rewriteKeys);
      dstRepo.setValueForKey(rewriteKeys.get(oldKey)!, record, undefined);
    }
  }
  // Finally initialize the new repo and sync it
  graph.prepareRepositoryForUI(newRepoId);
  return newWs.manager;
}

function createNewWorkspace(
  name: string,
  graphManager: GraphManager,
  opts: CreateWorkspaceOptions = {},
): VertexManager<Workspace> {
  const { copyFrom } = opts;
  const data = {
    name,
    users: new Set([graphManager.rootKey]),
  };
  if (copyFrom) {
    return duplicateWorkspace(graphManager, copyFrom, data);
  }
  return graphManager.createVertex<Workspace>(NS_WORKSPACE, data).manager;
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
    // Hack for sandbox - mass workspace creation
    // if (getOrganizationId() === 'sandbox') {
    //   for (let i = 1; i <= 100; ++i) {
    //     const copyName = `${name} (${i})`;
    //     createNewWorkspace(copyName, graph, {
    //       copyFrom: duplicateWs,
    //     });
    //   }
    // }
    logger.log({
      severity: 'EVENT',
      event: 'End',
      flow: 'create',
      type: 'workspace',
      source,
      id: flowId,
    });
    // graph.sharedQueriesManager.workspaces.forEach(
    //   (ws) => (ws.selected = ws.key === wsResult.key),
    // );
    // wsResult.getVertexProxy().selected = true;
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
            allWorkspaces={workspacesQuery.results.filter((mgr) =>
              graph.repositoryReady(Repository.id('data', mgr.key)),
            )}
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
