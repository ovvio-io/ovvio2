import { NS_NOTES, NS_USERS, NS_WORKSPACE, Record } from '@ovvio/cfds';
import { GraphManager } from '@ovvio/cfds/lib/client/graph/graph-manager';
import { Vertex } from '@ovvio/cfds/lib/client/graph/vertex';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Note, User, Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { present } from '@ovvio/cfds/lib/primitives-old/orderstamp';
import { styleguide } from '@ovvio/styles/lib';
import { RaisedButton } from '@ovvio/styles/lib/components/buttons';
import { TextField } from '@ovvio/styles/lib/components/inputs';
import SpinnerView from '@ovvio/styles/lib/components/spinner-view';
import { H2, Text } from '@ovvio/styles/lib/components/texts';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import RestClient from 'api';
import { useEventLogger } from 'core/analytics';
import { useGraphManager } from 'core/cfds/react/graph';
import { isWorkspace, useExistingQuery, useQuery } from 'core/cfds/react/query';
import { useScopedObservable } from 'core/state';
import React, { useEffect, useRef, useState } from 'react';
import { useTutorialStep } from 'shared/tutorial';
import UserStore from 'stores/user';
import CreateIllustration from './create-workspace-illustration';
import { DuplicateWorkspaceView } from './duplicate-workspace';
import { WorkspaceSteps } from './workspace-tutorial';

const useStyles = makeStyles(theme => ({
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

interface CreateWorkspaceResult {
  id: string;
  wsRecordKeys: string[];
}

export type WorkspaceCreated =
  | {
      loaded: true;
      workspace: VertexManager<Workspace>;
    }
  | {
      loaded: false;
      workspaceId: string;
    };

type CreateWorkspaceOptions = {
  createDemoCards?: boolean;
  copyFrom?: VertexManager<Workspace>;
};

async function createWorkspaceFromTemplate(
  name: string,
  graph: GraphManager,
  templateWs: VertexManager<Workspace>
): Promise<WorkspaceCreated> {
  const workspace = templateWs.getVertexProxy();
  const subGraph = graph.exportSubGraph(
    templateWs.key,
    1,
    [NS_USERS],
    (r: Record) => {
      if (r.scheme.namespace === NS_WORKSPACE) {
        r.set('name', name);
      }
      if (workspace.isTemplate) {
        if (r.scheme.hasField('createdBy')) {
          r.set('createdBy', graph.rootKey);
        }
        if (r.scheme.namespace === NS_NOTES) {
          r.delete('assignees');
        }
      }
    }
  );

  const data = graph.importSubGraph(subGraph, false);
  const dupWsMgr = data[0] as VertexManager<Workspace>;
  const dupWs = dupWsMgr.getVertexProxy();
  if (workspace.isTemplate) {
    dupWs.users = new Set([graph.getRootVertex<User>()]);
  }
  dupWs.createdBy = graph.getRootVertex<User>();
  const user = graph.getRootVertex<User>();
  const updatedWorkspaces = new Set(user.workspaces);
  updatedWorkspaces.add(dupWsMgr.getVertexProxy());
  user.workspaces = updatedWorkspaces;
  return {
    loaded: true,
    workspace: dupWsMgr,
  };
}

async function createNewWorkspace(
  name: string,
  graphManager: GraphManager,
  opts: CreateWorkspaceOptions = {}
): Promise<WorkspaceCreated> {
  const { /*createDemoCards = false,*/ copyFrom } = opts;
  if (copyFrom) {
    return await createWorkspaceFromTemplate(name, graphManager, copyFrom);
  }
  const rootUser = graphManager.getRootVertex<User>();
  const newWs = graphManager.createVertex<Workspace>(NS_WORKSPACE, {
    users: new Set([graphManager.rootKey]),
    createdBy: graphManager.rootKey,
    name,
  });
  rootUser.workspaces.add(newWs);
  return Promise.resolve({
    loaded: true,
    workspace: newWs.manager,
  });
  // const restClient = new RestClient(user.currentUser);
  //
  // const res = await restClient.post<CreateWorkspaceResult>('/workspaces', {
  //   name: name.trim(),
  //   demoCards: createDemoCards,
  // });
  // return await new Promise((resolve, reject) => {
  //   setTimeout(() => {
  //     const wsGroup = graphManager.createGroup([
  //       res.id,
  //       ...(res.wsRecordKeys || []),
  //     ]);
  //     wsGroup.waitForReady(
  //       () => {
  //         const ws = wsGroup.get<Workspace>(res.id);
  //         if (createDemoCards) {
  //           //First Workspace card should be pushed to the top
  //           if (user.firstCardKey) {
  //             const firstCard = graphManager.getVertex<Note>(user.firstCardKey);
  //             if (!firstCard.isLoading) {
  //               firstCard.sortStamp = present();
  //             }
  //           }
  //         }
  //         resolve({
  //           loaded: true,
  //           workspace: ws.manager as VertexManager<Workspace>,
  //         });
  //       },
  //       () => {
  //         console.warn(`ws: ${res.id} created but waiting failed`);
  //         resolve({
  //           loaded: false,
  //           workspaceId: res.id,
  //         });
  //       },
  //       15
  //     );
  //   }, 500);
  // });
}

export interface WorkspaceFormProps {
  location: any;
  onWorkspaceCreated: (createResult: WorkspaceCreated) => void;
}

export function WorkspaceForm({
  location,
  onWorkspaceCreated,
}: WorkspaceFormProps) {
  const styles = useStyles();
  const [name, setName] = useState('');
  const eventLogger = useEventLogger();
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const graph = useGraphManager();
  const nameRef = useRef();
  const createRef = useRef();
  const { results: workspaces, loading } = useExistingQuery(
    graph.sharedQueriesManager.workspaces
  );
  const [duplicateWs, setDuplicateWs] = useState<VertexManager<Workspace>>();

  const { className: nameInputClassName } = useTutorialStep(
    WorkspaceSteps.NameWorkspace,
    nameRef.current,
    { context: name }
  );
  const { className: createClassName, next: nextStep } = useTutorialStep(
    WorkspaceSteps.CreateWorkspace,
    createRef.current
  );

  let source: string | undefined;
  let onBoardFlow = false;
  if (location && location.state) {
    source = location.state.source;
    onBoardFlow = location.state.onBoardFlow || false;
  }

  useEffect(() => {
    eventLogger.action('WORKSPACE_CREATE_STARTED', {
      source,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createWorkspace = async () => {
    if (nextStep) {
      nextStep();
    }
    if (!name || processing) {
      return;
    }
    setError('');
    setProcessing(true);

    try {
      const wsResult = await createNewWorkspace(name, graph, {
        createDemoCards: onBoardFlow,
        copyFrom: duplicateWs,
      });

      eventLogger.action('WORKSPACE_CREATE_COMPLETED', {
        workspaceId: wsResult.loaded
          ? wsResult.workspace.key
          : (wsResult as any).workspaceId,
        source,
      });
      setProcessing(false);
      onWorkspaceCreated(wsResult);
    } catch (e) {
      eventLogger.error(e, {
        origin: 'WORKSPACE_CREATE',
        source,
      });

      setError('Something went wrong, try again later');
      setProcessing(false);
    }
  };
  return (
    <React.Fragment>
      <H2>Create a new workspace</H2>
      {loading ? (
        <SpinnerView />
      ) : (
        <React.Fragment>
          <p>
            <Text>
              Organize your units, departments and projects with Workspaces.
              Write meeting minutes or notes, and assign tasks to a specific
              group of people.
            </Text>
          </p>
          {!!workspaces.length && (
            <DuplicateWorkspaceView
              className={cn(styles.input)}
              workspaces={workspaces}
              setWorkspace={setDuplicateWs}
              selectedWorkspace={duplicateWs}
            />
          )}
          <TextField
            placeholder="Name your workspace"
            value={name}
            onChange={(e: any) => setName(e.currentTarget.value)}
            className={cn(styles.input, nameInputClassName)}
            ref={nameRef}
          />
          {error && <Text className={cn(styles.error)}>{error}</Text>}
          <RaisedButton
            disabled={name.trim().length === 0 || processing}
            className={cn(styles.input, createClassName)}
            onClick={createWorkspace}
            ref={createRef}
          >
            {processing ? (
              <SpinnerView size={styleguide.gridbase * 3} color="white" />
            ) : (
              <span>Create new workspace</span>
            )}
          </RaisedButton>
        </React.Fragment>
      )}
      <CreateIllustration className={cn(styles.illustration)} />
    </React.Fragment>
  );
}
