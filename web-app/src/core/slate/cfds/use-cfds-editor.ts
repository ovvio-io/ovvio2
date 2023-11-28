import React, { useCallback, useEffect, useMemo } from 'react';
import { BaseRange, Descendant, Editor, Range as SlateRange } from 'slate';
import { ReactEditor } from 'slate-react';
import { Vertex } from '../../../../../cfds/client/graph/vertex.ts';
import {
  Document,
  DocumentRanges,
  Range,
  UnkeyedDocument,
} from '../../../../../cfds/richtext/doc-state.ts';
import { TreeNode } from '../../../../../cfds/richtext/tree.ts';
import { VertexManager } from '../../../../../cfds/client/graph/vertex-manager.ts';
import { mutationPackHasField } from '../../../../../cfds/client/graph/mutations.ts';
import { UndoContextOptions } from '../../../../../cfds/client/undo/context.ts';
import { usePartialVertex } from '../../cfds/react/vertex.ts';
import { CfdsEditor, isCfdsInternal } from './with-cfds.tsx';
import { useGraphManager } from '../../cfds/react/graph.tsx';
import { Note } from '../../../../../cfds/client/graph/vertices/note.ts';
import { coreValueEquals } from '../../../../../base/core-types/equals.ts';

export type RichtextKeys<T extends Note> = {
  [K in keyof T]: T[K] extends UnkeyedDocument ? K : never;
}[keyof T] &
  string;

export interface EditorHandler {
  value: Descendant[];
  onChange: (newValue: Descendant[]) => void;
  selection?: BaseRange | null;
}

interface CfdsEditorOptions {
  undoAddBodyRefs: boolean;
  expirationInMs: number;
}

const DEFAULT_OPTS: CfdsEditorOptions = {
  undoAddBodyRefs: false,
  expirationInMs: 1000 * 10,
};

const expirationBuffer = 10000;

function makeExpirationDate(expirationInMs: number): Date {
  return new Date(Date.now() + expirationInMs + expirationBuffer);
}

function useUndoContext(
  editor: Editor,
  vMng: VertexManager<Note>,
  field: string,
  addBodyRefs: boolean
) {
  const graph = useGraphManager();
  useEffect(() => {
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

      options.vertices?.push({
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

    const undoCtx = graph.undoManager.createContext(options);

    editor.undo = () => {
      const res = undoCtx.undo();
      if (!res && !ReactEditor.isFocused(editor)) {
        ReactEditor.focus(editor);
      }
    };
    editor.redo = () => {
      const res = undoCtx.redo();
      if (!res && !ReactEditor.isFocused(editor)) {
        ReactEditor.focus(editor);
      }
    };

    return () => {
      editor.undo = () => {};
      editor.redo = () => {};
      undoCtx.dispose();
    };
  }, [editor, graph, vMng, field, addBodyRefs]);
}

function handleSelection(
  editor: Editor,
  document: UnkeyedDocument,
  selectionId: string
) {
  if (!ReactEditor.isFocused(editor)) {
    return;
  }
  const slateSelection = CfdsEditor.cfdsRangeToSlateRange(
    document,
    selectionId
  );

  if (!editor.selection && !slateSelection) {
    return;
  }

  // if (
  //   (!editor.selection && slateSelection) ||
  //   (editor.selection && !slateSelection) ||
  //   !SlateRange.equals(slateSelection!, editor.selection!)
  // ) {
  CfdsEditor.setExternalSelection(editor, slateSelection);
  // }
}

// Set this to false to disable updating of selection on external change
const SET_EXTERNAL_SELECTION = true;

export function useCfdsEditor<T extends Note, K extends RichtextKeys<T>>(
  vertexMng: VertexManager<T>,
  field: K,
  editor: Editor,
  selectionId: string,
  opts: Partial<CfdsEditorOptions> = {}
): EditorHandler {
  const vertex = usePartialVertex<T>(vertexMng, [field]);
  const {
    undoAddBodyRefs = DEFAULT_OPTS.undoAddBodyRefs,
    expirationInMs = DEFAULT_OPTS.expirationInMs,
  } = opts;

  useUndoContext(editor, vertexMng as any, field as string, undoAddBodyRefs);
  const richtext = vertex[field] as unknown as Document;
  const onChange = useCallback(
    (newValue: Descendant[]) => {
      const ranges: DocumentRanges = {};
      debugger;
      if (editor.selection) {
        ranges[selectionId] = {
          ...CfdsEditor.slateRangeToCfdsRange(editor, editor.selection),
          expiration: makeExpirationDate(expirationInMs),
        };
      }
      const v = vertexMng.getVertexProxy();
      v[field] = {
        root: {
          children: newValue as TreeNode[],
        },
        ranges,
      } as unknown as T[K];
    },
    [vertexMng, editor, selectionId, expirationInMs, field]
  );
  const value = richtext.root.children as Descendant[];

  // const selection = (richtext.ranges || {})[selectionId];

  // debugger;

  const slateValue = useMemo(() => {
    if (SET_EXTERNAL_SELECTION) {
      if (!coreValueEquals(editor.children, value)) {
        editor.children = value;
      }
      handleSelection(editor, richtext, selectionId);
    }
    return value;
  }, [richtext, editor]);
  // let slateValue = value;
  // if (SET_EXTERNAL_SELECTION) {
  //   // editor.children = value;
  //   handleSelection(editor, selection);
  // }

  useEffect(() => {
    const intervalId = setInterval(() => {
      const proxy = vertexMng.getVertexProxy();
      const rt = proxy[field] as unknown as Document;
      let selection = (rt.ranges || {})[selectionId];
      if (!selection) {
        if (!editor.selection) {
          return;
        }
        selection = CfdsEditor.slateRangeToCfdsRange(editor, editor.selection);
      }

      proxy[field] = {
        root: rt.root,
        ranges: {
          [selectionId]: {
            ...selection,
            expiration: makeExpirationDate(expirationInMs),
          },
        },
      } as unknown as T[K];
    }, expirationInMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [vertexMng, field, expirationInMs, selectionId, editor]);

  if (isCfdsInternal(editor)) {
    editor._treeKeys = richtext.nodeKeys;
  }

  return {
    onChange,
    value: slateValue,
    selection: CfdsEditor.cfdsRangeToSlateRange(
      vertex[field] as unknown as Document,
      selectionId
    ),
  };
}
