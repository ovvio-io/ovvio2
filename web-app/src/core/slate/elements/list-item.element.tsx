import React, { useContext } from 'react';
import { Editor, Element } from 'slate';
import { RenderElementProps } from 'slate-react';
import { Plugin } from '../plugins/index.ts';
import { TextType } from '../types.ts';
import { ElementUtils } from '../utils/element-utils.ts';
import { Text as TextElement } from '../../../../../styles/components/texts.tsx';
import { ListUtils } from '../utils/list-utils.ts';
import { ElementNode } from '../../../../../cfds/richtext/tree.ts';

import { cn, makeStyles } from '../../../../../styles/css-objects/index.ts';

export const listContext = React.createContext(0);

const useStyles = makeStyles((theme) => {
  let levelStyles = {};
  for (let level = 1; level < 6; level++) {
    levelStyles[`level_${level}_ltr`] = {
      marginLeft: level * 20,
      textAlign: 'start',
    };
    levelStyles[`level_${level}_rtl`] = {
      marginRight: level * 20,
      textAlign: 'start',
    };
  }
  return levelStyles;
}, 'list-item_element_ce3599');

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
  const level = useContext(listContext);
  return (
    <li
      {...props.attributes}
      className={cn(styles[`level_${level}_${isRtl ? 'rtl' : 'ltr'}`])}
    >
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
