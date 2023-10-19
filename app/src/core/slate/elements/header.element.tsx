import React from 'react';
import { Editor, Element, NodeEntry, Point, Transforms, Range } from 'slate';
import { RenderElementProps } from 'slate-react';
import { ElementNode, TextNode } from '../../../../../cfds/richtext/tree.ts';
import { styleguide } from '../../../../../styles/index.ts';
import { H2 } from '../../../../../styles/components/texts.tsx';
import { makeStyles, cn } from '../../../../../styles/css-objects/index.ts';
import { KeyDownHandler, mergePlugins } from '../plugins/index.ts';
import { TextType } from '../types.ts';
import { createAutoReplaceHandler } from '../utils/auto-replace.ts';
import { isKeyPressed } from '../utils/hotkeys.ts';
import { MarkupNode } from '../../../../../cfds/richtext/model.ts';

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
