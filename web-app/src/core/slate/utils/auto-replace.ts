import {
  Editor,
  Range,
  Node as SlateNode,
  NodeEntry,
  Transforms,
  Node,
} from 'slate';
import { KeyDownHandler } from '../plugins';
import { ElementUtils } from './element-utils';
import { getPlatformHotkey, isHotkeyActive, Shortcut } from './hotkeys';

export interface AutoReplaceOptions {
  trigger: Shortcut;
  prefix: string;
  editor: Editor;
  onTriggered: (nodeEntry: NodeEntry) => void;
  canTrigger?: (nodeEntry: NodeEntry) => boolean;
}

export function createAutoReplaceHandler({
  trigger,
  prefix,
  editor,
  onTriggered,
  canTrigger = () => true,
}: AutoReplaceOptions): KeyDownHandler {
  const hotkey = getPlatformHotkey(trigger);

  return {
    onKeyDown(event) {
      if (
        !isHotkeyActive(event, hotkey) ||
        !editor.selection ||
        !Range.isCollapsed(editor.selection)
      ) {
        return;
      }
      const parent = ElementUtils.getClosestElement(editor, editor.selection);
      if (!parent) {
        return;
      }
      const [node, path] = parent;

      const text = SlateNode.string(node);

      if (text.startsWith(prefix) && canTrigger([node, path])) {
        event.preventDefault();
        const [[, textPath]] = Array.from(SlateNode.texts(node));
        const fullPath = [...path, ...textPath];
        Transforms.delete(editor, {
          at: {
            anchor: { path: fullPath, offset: 0 },
            focus: { path: fullPath, offset: prefix.length },
          },
        });
        const alteredNode = Node.get(editor, path);
        onTriggered([alteredNode, path]);
      }
    },
  };
}
