import React, {
  useCallback,
  useEffect,
  useMemo,
} from 'https://esm.sh/react@18.2.0';
import {
  Descendant,
  Editor,
  Range as SlateRange,
} from 'https://esm.sh/slate@0.87.0';
import { ReactEditor } from 'https://esm.sh/slate-react@0.87.1';
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
import { useOnCriticalError } from '../../cfds/react/graph-use.ts';

export type RichtextKeys<T> = {
  [K in keyof T]: T[K] extends UnkeyedDocument ? K : never;
}[keyof T];

export interface EditorHandler {
  value: Descendant[];
  onChange: (newValue: Descendant[]) => void;
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

function handleSelection(editor: Editor, selection: Range | undefined) {
  if (!ReactEditor.isFocused(editor)) {
    return;
  }
  const slateSelection = CfdsEditor.cfdsRangeToSlateRange(editor, selection);

  if (!editor.selection && !slateSelection) {
    return;
  }

  if (
    (!editor.selection && slateSelection) ||
    (editor.selection && !slateSelection) ||
    !SlateRange.equals(slateSelection!, editor.selection!)
  ) {
    CfdsEditor.setExternalSelection(editor, slateSelection);
  }
}

// Set this to false to disable updating of selection on external change
const SET_EXTERNAL_SELECTION = true;

export function useCfdsEditor<T extends Vertex, K extends RichtextKeys<T>>(
  vertexMng: VertexManager<T>,
  field: K,
  editor: Editor,
  selectionId: string,
  opts: Partial<CfdsEditorOptions> = {}
): EditorHandler {
  const vertex = usePartialVertex(vertexMng, [field]);
  const {
    undoAddBodyRefs = DEFAULT_OPTS.undoAddBodyRefs,
    expirationInMs = DEFAULT_OPTS.expirationInMs,
  } = opts;

  useOnCriticalError(() => {
    ReactEditor.blur(editor);
  });

  useUndoContext(editor, vertexMng as any, field as string, undoAddBodyRefs);
  const richtext = vertex[field] as unknown as Document;
  const onChange = useCallback(
    (newValue: Descendant[]) => {
      const ranges: DocumentRanges = {};
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

  const selection = (richtext.ranges || {})[selectionId];

  const slateValue = useMemo(() => {
    if (SET_EXTERNAL_SELECTION) {
      editor.children = value;
      handleSelection(editor, selection);
    }
    return value;
  }, [value, selection, editor]);

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
  };
}
