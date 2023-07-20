import React, { useContext } from 'react';
import { Editor, NodeEntry } from 'https://esm.sh/slate@0.87.0';
import { RenderElementProps } from 'https://esm.sh/slate-react@0.87.1';
import { ElementNode } from '../../../../../cfds/richtext/tree.ts';
import { makeStyles, cn } from '../../../../../styles/css-objects/index.ts';
import { mergePlugins } from '../plugins/index.ts';
import { createAutoReplaceHandler } from '../utils/auto-replace.ts';
import { ListUtils } from '../utils/list-utils.ts';
import { listContext, ListItemElement } from './list-item.element.tsx';

const useStyles = makeStyles(() => ({
  numberedList: {
    padding: 0,
    paddingInlineStart: 0,
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
  const level = useContext(listContext);
  return (
    <ol {...props.attributes} className={cn(styles.numberedList)}>
      <listContext.Provider value={level + 1}>
        {props.children}
      </listContext.Provider>
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
