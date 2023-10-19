import React, { useContext } from 'react';
import { Editor, NodeEntry } from 'slate';
import { RenderElementProps } from 'slate-react';
import { ElementNode } from '../../../../../cfds/richtext/tree.ts';
import { makeStyles, cn } from '../../../../../styles/css-objects/index.ts';
import { mergePlugins } from '../plugins/index.ts';
import { createAutoReplaceHandler } from '../utils/auto-replace.ts';
import { ListUtils } from '../utils/list-utils.ts';
import { listContext, ListItemElement } from './list-item.element.tsx';
import { NumberedListElement } from './numbered-list.element.tsx';

const useStyles = makeStyles(() => ({
  bulletList: {
    padding: 0,
    paddingInlineStart: 0,
  },
}));

export const BULLET_LIST_TYPE = 'ul';

export interface BulletListElement extends ElementNode {
  tagName: typeof BULLET_LIST_TYPE;
  children: (ListItemElement | BulletListElement | NumberedListElement)[];
}

export function isBulletListProps(
  props: RenderElementProps
): props is BulletListProps {
  return props.element.tagName === BULLET_LIST_TYPE;
}

interface BulletListProps extends RenderElementProps {
  element: BulletListElement;
}

export function BulletListElementNode(props: BulletListProps) {
  const styles = useStyles();
  const level = useContext(listContext);

  return (
    <ul {...props.attributes} className={cn(styles.bulletList)}>
      <listContext.Provider value={level + 1}>
        {props.children}
      </listContext.Provider>
    </ul>
  );
}

export function renderBulletList(props: RenderElementProps) {
  if (isBulletListProps(props)) {
    return <BulletListElementNode {...props} />;
  }
}

export function createBulletListPlugin(editor: Editor) {
  return mergePlugins([
    createAutoReplaceHandler({
      trigger: {
        default: {
          metaKeys: [],
          key: ' ',
        },
      },
      prefix: '*',
      editor,
      onTriggered([node, path]: NodeEntry) {
        ListUtils.setList(editor, path, BULLET_LIST_TYPE);
      },
    }),
    { renderElement: renderBulletList },
  ]);
}
