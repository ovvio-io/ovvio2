import React, {
  CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { makeStyles } from '../../../../../../styles/css-objects/index.ts';
import { TagsTable } from '../../components/tag-table.tsx';
import { useGraphManager } from '../../../../core/cfds/react/graph.tsx';
import { View } from '../../../../../../cfds/client/graph/vertices/view.ts';
import {
  usePartialVertex,
  useVertex,
  useVertices,
} from '../../../../core/cfds/react/vertex.ts';
import { useSharedQuery } from '../../../../core/cfds/react/query.ts';
import { Tag } from '../../../../../../cfds/client/graph/vertices/index.ts';

export function WsTagsSettings() {
  const graph = useGraphManager();
  const mgr = graph.getVertexManager<View>('ViewWsSettings');
  const partialView = usePartialVertex(mgr, ['selectedWorkspaces']);
  const ws = [...partialView.selectedWorkspaces][0];
  const wsManager = ws.manager;

  // const styles = makeStyles();

  // return 'In Progress';
  return <TagsTable workspaceManager={wsManager} graphManager={graph} />;
}
