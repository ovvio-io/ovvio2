import { ElementNode } from '@ovvio/cfds/lib/richtext/tree';
import React from 'react';
import { Editor, NodeEntry, Transforms } from 'slate';
import { RenderElementProps } from 'slate-react';
import { styleguide } from '@ovvio/styles/lib';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { mergePlugins } from '../plugins';
import { TextType } from '../types';
import { createAutoReplaceHandler } from '../utils/auto-replace';
import { H3 } from '@ovvio/styles/lib/components/texts';
import { createEnterHandler } from './header.element';
const useStyles = makeStyles(theme => ({
  header2: {
    marginBottom: styleguide.gridbase,
  },
}));

export const HEADING_2_TYPE = 'h2';

export interface Header2Element extends ElementNode {
  tagName: typeof HEADING_2_TYPE;
  children: TextType[];
}

export function isHeader2Props(
  props: RenderElementProps
): props is Header2ElementProps {
  return props.element.tagName === HEADING_2_TYPE;
}

interface Header2ElementProps extends RenderElementProps {
  element: Header2Element;
}

export function Header2ElementNode(props: Header2ElementProps) {
  const styles = useStyles();
  return (
    <H3 {...props.attributes} className={cn(styles.header2)}>
      {props.children}
    </H3>
  );
}

export function renderHeader2(props: RenderElementProps) {
  if (isHeader2Props(props)) {
    return <Header2ElementNode {...props} />;
  }
}

export function createHeader2Plugin(editor: Editor) {
  return mergePlugins([
    createAutoReplaceHandler({
      trigger: {
        default: {
          metaKeys: [],
          key: ' ',
        },
      },
      prefix: '##',
      editor,
      onTriggered([node, path]: NodeEntry) {
        Transforms.setNodes(editor, { tagName: HEADING_2_TYPE }, { at: path });
      },
    }),
    { renderElement: renderHeader2 },
    createEnterHandler(editor, 'h2'),
  ]);
}
