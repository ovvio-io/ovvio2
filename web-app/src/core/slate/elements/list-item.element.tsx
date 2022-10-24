import { Editor, Element } from 'slate';
import { RenderElementProps } from 'slate-react';
import { Plugin } from '../plugins';
import { TextType } from '../types';
import { ElementUtils } from '../utils/element-utils';
import { Text as TextElement } from '@ovvio/styles/lib/components/texts';
import { ListUtils } from '../utils/list-utils';
import { ElementNode } from '@ovvio/cfds/lib/richtext/tree';

import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';

const useStyles = makeStyles(
  theme => ({
    rtl: {
      textAlign: 'right',
    },
  }),
  'list-item_element_ce3599'
);

export const LIST_ITEM_TYPE = 'li';

export interface ListItemElement extends ElementNode {
  tagName: typeof LIST_ITEM_TYPE;
  children: TextType[];
}

export function isListItemProps(
  props: RenderElementProps
): props is ListItemProps {
  return props.element.tagName === LIST_ITEM_TYPE;
}

interface ListItemProps extends RenderElementProps {
  element: ListItemElement;
}

export function ListItemElementNode(props: ListItemProps) {
  const styles = useStyles();
  const { dir } = props.attributes;
  const isRtl = dir === 'rtl';

  return (
    <li {...props.attributes} className={cn(isRtl && styles.rtl)}>
      <TextElement>{props.children}</TextElement>
    </li>
  );
}

export function renderElementItem(props: RenderElementProps) {
  if (isListItemProps(props)) {
    return <ListItemElementNode {...props} />;
  }
}

export function createListItemPlugin(editor: Editor): Partial<Plugin> {
  return {
    renderElement: renderElementItem,
    onKeyDown(e) {
      if (e.key !== 'Tab' || e.shiftKey) {
        return;
      }
      if (ListItemElement.isSingleListItem(editor)) {
        e.preventDefault();
        const [, path] = ElementUtils.getClosestNode(
          editor,
          editor.selection,
          ListItemElement.isListItem
        );
        const [parent] = ListUtils.getContainerParent(editor, path);
        ListUtils.setList(editor, path, parent.tagName);
      }
    },
  };
}
// eslint-disable-next-line
export const ListItemElement = {
  isListItem(value: any): value is ListItemElement {
    return Element.isElement(value) && value.tagName === 'li';
  },
  isSingleListItem(editor: Editor): boolean {
    return ElementUtils.isSingleElement(editor, ListItemElement.isListItem);
  },
};
