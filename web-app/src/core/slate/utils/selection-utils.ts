import {
  BaseRange,
  Editor,
  Element,
  Node,
  NodeEntry,
  Path,
  Point,
  Range,
} from 'slate';
import { ReactEditor } from 'slate-react';
import { CfdsEditor } from '../cfds/with-cfds';
import { ElementUtils } from './element-utils';

export const SelectionUtils = {
  extractSingleElement(
    editor: Editor,
    at?: BaseRange
  ): NodeEntry<Element> | [null, null] {
    at = at || editor.selection;
    if (!at) {
      return [null, null];
    }
    const [a, b] = Range.edges(at);
    const [[nodeA, pathA], [, pathB]] = [
      ElementUtils.getClosestElement(editor, a.path),
      ElementUtils.getClosestElement(editor, b.path),
    ];
    if (!Path.equals(pathA, pathB)) {
      return [null, null];
    }
    return [nodeA, pathA];
  },
  getEditorEnd(editor: Editor): Point {
    let node: Node = editor;
    const path: Path = [];
    while (node.children) {
      const index = (node.children as []).length - 1;
      path.push(index);
      node = node.children[index];
    }
    const offset = Node.string(node).length;

    const point = { path, offset };
    return point;
  },
  focusAtEnd(editor: Editor): void {
    const end = SelectionUtils.getEditorEnd(editor);
    ReactEditor.deselect(editor);
    ReactEditor.blur(editor);
    const sel = {
      focus: end,
      anchor: end,
    };
    ReactEditor.focus(editor);
    CfdsEditor.setExternalSelection(editor, sel);
    editor.onChange();
  },
};
