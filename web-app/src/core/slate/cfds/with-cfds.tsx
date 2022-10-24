import { uniqueId } from '@ovvio/base/lib/utils';
import { Range } from '@ovvio/cfds/lib/richtext/doc-state';
import { TextNode } from '@ovvio/cfds/lib/richtext/tree';
import { TreeKeys } from '@ovvio/cfds/lib/richtext/tree-keys';
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
import { Key } from 'slate-react/dist/utils/key';
import { CoreValue } from '@ovvio/cfds/lib/core-types';
import { HistoryEditor } from 'slate-history';
import { ElementNodeType } from '../types';
import { CardElement } from '../elements/card.element';

export interface CfdsEditor extends BaseEditor, Omit<HistoryEditor, 'history'> {
  localKey: { id: string };
  onLocalSelectionChanged?: (selection: BaseRange) => void;
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
      cfdsEditor.onLocalSelectionChanged(editor.selection);
    }
  };
  editor.insertFragment = (fragment: Node[]) => {
    const sanitizedFragment: Node[] = fragment.map(node => {
      //@ts-ignore
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

ReactEditor.findKey = (editor: ReactEditor, node: Node): Key => {
  if (!isCfdsInternal(editor)) {
    return findKey(editor, node);
  }
  if (Editor.isEditor(node)) {
    return editor.localKey;
  }
  return editor._treeKeys.keyFor(node as CoreValue);
};

// eslint-disable-next-line
export const CfdsEditor = {
  setExternalSelection(editor: Editor, selection: BaseRange | null): void {
    const cfdsEditor = editor as CfdsEditorInternal & Editor;
    cfdsEditor._isInExternalSelectionChange = true;
    // Transforms.setSelection(editor, selection);
    cfdsEditor.selection = selection;
    cfdsEditor._isInExternalSelectionChange = false;
  },
  slateRangeToCfdsRange(
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
  },
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
  },
  cfdsRangeToSlateRange(
    editor: Editor,
    range: Range | undefined
  ): BaseRange | null {
    if (!range) return null;
    const anchor = range.anchor.node;
    const focus = range.focus.node;

    // const anchorPath = ReactEditor.findPath(editor, anchor);
    // const focusPath = ReactEditor.findPath(editor, focus);

    const anchorPath = CfdsEditor.findPath(editor, anchor);
    const focusPath = CfdsEditor.findPath(editor, focus);

    return {
      anchor: {
        path: anchorPath,
        offset: range.anchor.offset,
      },
      focus: {
        path: focusPath,
        offset: range.focus.offset,
      },
    };
  },
};
