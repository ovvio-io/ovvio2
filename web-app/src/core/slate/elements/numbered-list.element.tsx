import { ElementNode } from '@ovvio/cfds/lib/richtext/tree';
import { Editor, NodeEntry } from 'slate';
import { RenderElementProps } from 'slate-react';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { mergePlugins } from '../plugins';
import { createAutoReplaceHandler } from '../utils/auto-replace';
import { ListUtils } from '../utils/list-utils';
import { ListItemElement } from './list-item.element';

const useStyles = makeStyles(() => ({
  numberedList: {
    margin: 0,
    padding: 0,
    marginLeft: 20,
  },
}));

export const NUMBERED_LIST_TYPE = 'ol';

export interface NumberedListElement extends ElementNode {
  tagName: typeof NUMBERED_LIST_TYPE;
  children: ListItemElement[];
}

export function isNumberedListProps(
  props: RenderElementProps
): props is NumberedListProps {
  return props.element.tagName === NUMBERED_LIST_TYPE;
}

interface NumberedListProps extends RenderElementProps {
  element: NumberedListElement;
}

export function NumberedListElementNode(props: NumberedListProps) {
  const styles = useStyles();
  return (
    <ol {...props.attributes} className={cn(styles.numberedList)}>
      {props.children}
    </ol>
  );
}

export function renderNumberedList(props: RenderElementProps) {
  if (isNumberedListProps(props)) {
    return <NumberedListElementNode {...props} />;
  }
}

export function createNumberedListPlugin(editor: Editor) {
  return mergePlugins([
    createAutoReplaceHandler({
      trigger: {
        default: {
          metaKeys: [],
          key: ' ',
        },
      },
      prefix: '1.',
      editor,
      onTriggered([node, path]: NodeEntry) {
        ListUtils.setList(editor, path, NUMBERED_LIST_TYPE);
      },
    }),
    {
      renderElement: renderNumberedList,
    },
  ]);
}
