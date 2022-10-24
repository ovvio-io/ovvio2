import { ElementNode } from '@ovvio/cfds/lib/richtext/tree';
import { Editor, NodeEntry } from 'slate';
import { RenderElementProps } from 'slate-react';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { mergePlugins } from '../plugins';
import { createAutoReplaceHandler } from '../utils/auto-replace';
import { ListUtils } from '../utils/list-utils';
import { ListItemElement } from './list-item.element';
import { NumberedListElement } from './numbered-list.element';

const useStyles = makeStyles(() => ({
  bulletList: {
    margin: 0,
    padding: 0,
    marginLeft: 20,
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
  return (
    <ul {...props.attributes} className={cn(styles.bulletList)}>
      {props.children}
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
