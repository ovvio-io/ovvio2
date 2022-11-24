import { ElementNode, TextNode } from '@ovvio/cfds/lib/richtext/tree';
import { Editor, Element, NodeEntry, Point, Transforms, Range } from 'slate';
import { RenderElementProps } from 'slate-react';
import { styleguide } from '@ovvio/styles/lib';
import { H2 } from '@ovvio/styles/lib/components/texts';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { KeyDownHandler, mergePlugins } from '../plugins';
import { TextType } from '../types';
import { createAutoReplaceHandler } from '../utils/auto-replace';
import { ElementUtils } from '../utils/element-utils';
import { isKeyPressed } from '../utils/hotkeys';
import { element } from 'core/richtext/document-writer';
import { MarkupNode } from '@ovvio/cfds/lib/richtext/model';

const useStyles = makeStyles(() => ({
  header: {
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
function selectionStartEndPoints(editor: Editor) {
  if (Range.isCollapsed(editor.selection)) {
    return [editor.selection.focus, editor.selection.focus];
  } else {
    return Range.edges(
      Editor.unhangRange(editor, editor.selection, { voids: true })
    );
  }
}
function rangeOfBlockAtPoint(editor: Editor, point: Point) {
  let [headerNode, rootPath] = Editor.parent(editor, point);
  let rangeStart: Point = { path: rootPath.concat([0]), offset: 0 };
  let lastNodeIndex = headerNode.children.length - 1;
  let lastNode = headerNode.children[lastNodeIndex] as TextNode;
  let rangeEnd: Point = {
    path: rootPath.concat([lastNodeIndex]),
    offset: lastNode.text.length,
  };

  return [rangeStart, rangeEnd];
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
      let [selectionStart, selectionEnd] = selectionStartEndPoints(editor);
      let elementAtStart = Editor.parent(
        editor,
        selectionStart
      )[0] as MarkupNode;

      if (elementAtStart.tagName !== tagName) {
        return;
      }

      e.preventDefault();

      let setPrefix = false,
        setSuffix = false;

      if (
        Point.equals(
          selectionStart,
          rangeOfBlockAtPoint(editor, selectionStart)[0]
        )
      ) {
        setPrefix = true;
      } else if (
        Point.equals(selectionEnd, rangeOfBlockAtPoint(editor, selectionEnd)[1])
      ) {
        setSuffix = true;
      }

      Editor.insertBreak(editor);
      if (setSuffix) {
        Transforms.setNodes(editor, { tagName: 'p' });
      } else if (setPrefix) {
        Transforms.setNodes(editor, { tagName: 'p' }, { at: selectionStart });
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
