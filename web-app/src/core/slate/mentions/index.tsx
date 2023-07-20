import { JSXElementConstructor, KeyboardEventHandler } from 'react';
import { BaseEditor, Editor, Element, Transforms } from 'slate';

import { FormattedText } from '../types';
import { Plugin } from '../plugins';
import { MentionElementNode, RenderMentionPopupProps } from './mention-node';
import { ElementNode } from '@ovvio/cfds/lib/richtext/tree';
import { uniqueId } from '@ovvio/base/lib/utils';
import { isKeyPressed } from '../utils/hotkeys';
import { SelectionUtils } from '../utils/selection-utils';
import { ElementUtils } from '../utils/element-utils';
import { suggestResults } from '@ovvio/cfds/lib/client/suggestions';
//import { wordDist } from '@ovvio/cfds/lib/primitives-old/plaintext';

export const MENTION_NODE_TYPE = 'mention';

export interface MentionElement extends ElementNode {
  tagName: typeof MENTION_NODE_TYPE;
  pluginId: string;
  children: FormattedText[];
  isLocal: true;
}

export interface MentionEditor extends BaseEditor {
  activeMention?: string;
  discardMention: () => void;
}

export function isMention(node: any): node is MentionElement {
  return Element.isElement(node) && node.tagName === MENTION_NODE_TYPE;
}

export function filterSortMentions<T>(
  items: T[],
  query: string,
  getSortValue: (item: T) => string
) {
  return suggestResults(query, items, getSortValue);
  // return items
  //   .map(x => ({
  //     item: x,
  //     dist: wordDist(getSortValue(x).toLowerCase(), query.toLowerCase()),
  //   }))
  //   .filter(x => !query || x.dist > 0.3)
  //   .sort((a, b) => b.dist - a.dist)
  //   .slice(0, 5)
  //   .map(x => x.item);
}

export function withMentions<T extends Editor>(editor: T): MentionEditor & T {
  const { isInline, apply } = editor;

  editor.isInline = element => isMention(element) || isInline(element);
  const mentionEditor = editor as unknown as MentionEditor & T;

  mentionEditor.apply = operation => {
    apply(operation);
    if (operation.type === 'set_selection' && mentionEditor.activeMention) {
      const [node] = editor.selection
        ? SelectionUtils.extractSingleElement(
            mentionEditor,
            mentionEditor.selection
          )
        : [null];
      if (!node || !isMention(node)) {
        mentionEditor.discardMention();
      }
    }
  };

  mentionEditor.activeMention = '';
  mentionEditor.discardMention = () => {};

  return mentionEditor as MentionEditor & T;
}

export interface MentionOptions<T> {
  trigger: string;
  editor: Editor;
  canOpen: () => boolean;
  MentionComponent: JSXElementConstructor<RenderMentionPopupProps<T>>;
}

export function createMentionsPlugin<T>({
  trigger,
  editor,
  canOpen,
  MentionComponent,
}: MentionOptions<T>): Partial<Plugin> {
  const pluginId = uniqueId();
  const handlers: KeyboardEventHandler[] = [];
  const registerKeyDown = (fn: KeyboardEventHandler) => {
    handlers.push(fn);
    return () => handlers.splice(handlers.indexOf(fn), 1);
  };

  return {
    onKeyDown(e) {
      if (editor.activeMention === pluginId) {
        handlers.forEach(fn => fn(e));
      }
      if (!editor.activeMention && isKeyPressed(e, trigger) && canOpen()) {
        e.preventDefault();
        const path = [...editor.selection.focus.path];
        const index = path.pop();
        Editor.insertNode(editor, {
          tagName: MENTION_NODE_TYPE,
          pluginId,
          isLocal: true,
          children: [{ text: `${trigger} ` }],
        });
        const point = {
          path: [...path, index + 1, 0],
          offset: trigger.length,
        };
        Transforms.setSelection(editor, {
          focus: point,
          anchor: point,
        });
        editor.activeMention = pluginId;
        editor.discardMention = () => {
          const [mention, path] = ElementUtils.findNode(
            editor,
            node => isMention(node) && node.pluginId === pluginId
          );
          if (!mention) {
            console.warn('Discard mention called but no mention found');
          } else {
            Transforms.unwrapNodes(editor, { at: path });
          }
          editor.activeMention = '';
          editor.discardMention = () => {};
        };
      }
    },
    renderElement(props) {
      if (!isMention(props.element) || props.element.pluginId !== pluginId) {
        return;
      }

      return (
        <MentionElementNode
          MentionComponent={MentionComponent}
          registerKeyDown={registerKeyDown}
          {...props}
          element={props.element}
          trigger={trigger}
        />
      );
    },
  };
}
