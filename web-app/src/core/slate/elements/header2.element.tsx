import React from 'react';
import { Editor, NodeEntry, Transforms } from 'slate';
import { RenderElementProps } from 'slate-react';
import { ElementNode } from '../../../../../cfds/richtext/tree.ts';
import { styleguide } from '../../../../../styles/index.ts';
import { makeStyles, cn } from '../../../../../styles/css-objects/index.ts';
import { mergePlugins } from '../plugins/index.ts';
import { TextType } from '../types.ts';
import { createAutoReplaceHandler } from '../utils/auto-replace.ts';
import { H3 } from '../../../../../styles/components/texts.tsx';
import { createEnterHandler } from './header.element.tsx';
const useStyles = makeStyles((theme) => ({
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
