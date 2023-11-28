import {
  BaseEditor,
  BaseRange,
  Editor,
  Element,
  Node,
  Operation,
  Path,
} from 'slate';
import { ReactEditor } from 'slate-react';
import { uniqueId } from '../../../../../base/common.ts';
import {
  Range,
  UnkeyedDocument,
  pointToPath,
} from '../../../../../cfds/richtext/doc-state.ts';
import { TextNode } from '../../../../../cfds/richtext/tree.ts';
import { NodeKey, TreeKeys } from '../../../../../cfds/richtext/tree-keys.ts';
import { CoreValue } from '../../../../../base/core-types/base.ts';
import { ElementNodeType } from '../types.ts';
import { CardElement } from '../elements/card.element/index.tsx';
import { notReached } from '../../../../../base/error.ts';

export interface CfdsEditor extends BaseEditor {
  localKey: { id: string };
  onLocalSelectionChanged?: (selection: BaseRange) => void;
  undo: () => void;
  redo: () => void;
}

export interface CfdsEditorInternal extends CfdsEditor {
  _isCfdsInternal: boolean;
  _isInExternalSelectionChange: boolean;
  _treeKeys: TreeKeys;
}

export default function withCfds<T extends Editor>(editor: T): T & CfdsEditor {
  const { apply, insertFragment, isVoid } = editor;

  const cfdsEditor = editor as CfdsEditorInternal & T;
  editor.localKey = { id: uniqueId() };
  cfdsEditor._isInExternalSelectionChange = false;
  cfdsEditor._isCfdsInternal = true;
  editor.apply = (operation: Operation) => {
    // if (operation.type === 'insert_node' && operation.node) {
    //   const { ...node } = operation.node;
    //   // (node as any).localKey = uniqueId();
    //   operation = {
    //     ...operation,
    //     node: node as Node,
    //   };
    // }
    // if (operation.type === 'split_node' && operation.properties) {
    //   const { ...properties } = operation.properties;
    //   // (properties as any).localKey = uniqueId();
    //   operation = {
    //     ...operation,
    //     properties,
    //   };
    // }
    apply(operation);
    if (
      operation.type === 'set_selection' &&
      !cfdsEditor._isInExternalSelectionChange &&
      cfdsEditor.onLocalSelectionChanged
    ) {
      cfdsEditor.onLocalSelectionChanged(editor.selection!);
    }
  };
  editor.insertFragment = (fragment: Node[]) => {
    const sanitizedFragment: Node[] = fragment.map((node) => {
      const { localKey, ...newNode } = node;
      return newNode as Node;
    });
    insertFragment(sanitizedFragment);
  };
  editor.isVoid = (el: ElementNodeType) => {
    return CardElement.isLoadingCard(el) || isVoid(el);
  };
  cfdsEditor.undo = () => {};
  cfdsEditor.redo = () => {};

  return cfdsEditor;
}

const findKey = ReactEditor.findKey;

export function isCfdsInternal(
  editor: BaseEditor
): editor is CfdsEditorInternal {
  return !!(editor as any)._isCfdsInternal;
}

ReactEditor.findKey = (editor: ReactEditor, node: Node): NodeKey => {
  if (!isCfdsInternal(editor)) {
    return findKey(editor, node);
  }
  if (Editor.isEditor(node)) {
    return editor.localKey;
  }
  return editor._treeKeys.keyFor(node as CoreValue);
};

function slateRangeToCfdsRange(editor: Editor, range: BaseRange): Range;

function slateRangeToCfdsRange(
  editor: Editor,
  range: BaseRange | null
): Range | undefined;

function slateRangeToCfdsRange(
  editor: Editor,
  range: BaseRange | null
): Range | undefined {
  if (!range) return undefined;
  const anchor = Node.get(editor, range.anchor.path);
  const focus = Node.get(editor, range.focus.path);

  return {
    anchor: {
      node: anchor as TextNode,
      offset: range.anchor.offset,
    },
    focus: {
      node: focus as TextNode,
      offset: range.focus.offset,
    },
  };
}

// eslint-disable-next-line
export const CfdsEditor = {
  setExternalSelection(editor: Editor, selection: BaseRange | null): void {
    const cfdsEditor = editor as CfdsEditorInternal & Editor;
    cfdsEditor._isInExternalSelectionChange = true;
    // Transforms.setSelection(editor, selection);
    cfdsEditor.selection = selection;
    cfdsEditor._isInExternalSelectionChange = false;
  },
  slateRangeToCfdsRange,
  findPath(parent: ElementNodeType | Editor, child: Node): Path {
    for (let i = 0; i < parent.children.length; i++) {
      const current = parent.children[i];
      if (current === child) {
        return [i];
      }
      if (Element.isElement(current) || Editor.isEditor(current)) {
        const inner = CfdsEditor.findPath(current, child);
        if (inner) {
          inner.unshift(i);
          return inner;
        }
      }
    }
    notReached('CfdsEditor.findPath() failed finding a path');
  },
  cfdsRangeToSlateRange(
    document: UnkeyedDocument,
    selectionId: string
  ): BaseRange | null {
    // if (!range) return null;
    if (!document.ranges) {
      return null;
    }

    const range = document.ranges[selectionId];
    if (!range) {
      return null;
    }

    // const anchorPath = ReactEditor.findPath(editor, anchor);
    // const focusPath = ReactEditor.findPath(editor, focus);

    // const anchorPath = CfdsEditor.findPath(editor, anchor);
    // const focusPath = CfdsEditor.findPath(editor, focus);

    return {
      anchor: pointToPath(document, range.anchor),
      focus: pointToPath(document, range.focus),
    };
  },
};
