import { ElementNode } from '@ovvio/cfds/lib/richtext/tree';
import { Editor, Element, NodeEntry, Transforms } from 'slate';
import { RenderElementProps } from 'slate-react';
import { styleguide } from '@ovvio/styles/lib';
import { H2 } from '@ovvio/styles/lib/components/texts';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { KeyDownHandler, mergePlugins } from '../plugins';
import { TextType } from '../types';
import { createAutoReplaceHandler } from '../utils/auto-replace';
import { ElementUtils } from '../utils/element-utils';
import { isKeyPressed } from '../utils/hotkeys';

const useStyles = makeStyles(() => ({
  header: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: styleguide.gridbase * 2,
  },
}));

export const HEADING_1_TYPE = 'h1';

export interface HeaderElement extends ElementNode {
  tagName: typeof HEADING_1_TYPE;
  children: TextType[];
}

export function isHeaderProps(
  props: RenderElementProps
): props is HeaderElementProps {
  return props.element.tagName === HEADING_1_TYPE;
}

interface HeaderElementProps extends RenderElementProps {
  element: HeaderElement;
}

export function HeaderElementNode(props: HeaderElementProps) {
  const styles = useStyles();
  return (
    <H2 {...props.attributes} className={cn(styles.header)}>
      {props.children}
    </H2>
  );
}

export function renderHeader(props: RenderElementProps) {
  if (isHeaderProps(props)) {
    return <HeaderElementNode {...props} />;
  }
}

export function createEnterHandler(
  editor: Editor,
  tagName: Element['tagName']
): KeyDownHandler {
  return {
    onKeyDown(e) {
      if (!isKeyPressed(e, 'Enter')) {
        return;
      }
      if (ElementUtils.isSingleElement(editor, el => el.tagName === tagName)) {
        e.preventDefault();
        Editor.insertBreak(editor);
        Transforms.setNodes(editor, { tagName: 'p' });
      }
    },
  };
}

export function createHeaderPlugin(editor: Editor) {
  return mergePlugins([
    createAutoReplaceHandler({
      trigger: {
        default: {
          metaKeys: [],
          key: ' ',
        },
      },
      prefix: '#',
      editor,
      onTriggered([node, path]: NodeEntry) {
        Transforms.setNodes(editor, { tagName: HEADING_1_TYPE }, { at: path });
      },
    }),
    { renderElement: renderHeader },
    createEnterHandler(editor, 'h1'),
  ]);
}
