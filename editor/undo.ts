import React, { useEffect, useMemo } from 'react';
import { mutationPackHasField } from '../cfds/client/graph/mutations.ts';
import { VertexManager } from '../cfds/client/graph/vertex-manager.ts';
import { Note } from '../cfds/client/graph/vertices/note.ts';
import { UndoContextOptions } from '../cfds/client/undo/context.ts';
import { useGraphManager } from '../web-app/src/core/cfds/react/graph.tsx';

export function useUndoContext(
  vMng: VertexManager<Note>,
  field: string,
  addBodyRefs: boolean,
) {
  const graph = useGraphManager();
  const options: UndoContextOptions = {
    vertices: [
      {
        keys: [vMng.key],
        filter: (_, mut) => {
          return mutationPackHasField(mut, field);
        },
        snapshotFields: [field],
      },
    ],
  };

  if (addBodyRefs) {
    const childKeys = vMng.getVertexProxy().getBodyRefs();

    options.vertices!.push({
      keys: childKeys,
      filter: (_, mut) => {
        return mutationPackHasField(mut, 'title');
      },
      snapshotFields: ['title'],
    });
  }
  options.filters = [
    {
      filter: (v, mut) => {
        return (
          v instanceof Note &&
          v.parentNote?.key === vMng.key &&
          mutationPackHasField(mut, 'title')
        );
      },
      initialSnapshot: { data: { isDeleted: 1 }, local: {} },
      snapshotFields: ['title'],
    },
  ];

  const undoCtx = useMemo(() => graph.undoManager.createContext(options), [
    graph,
    vMng,
    field,
    addBodyRefs,
  ]);
  useEffect(() => {
    return () => undoCtx.dispose();
  }, [undoCtx]);
  return undoCtx;
}
