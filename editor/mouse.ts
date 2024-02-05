import React from 'react';
import { VertexManager } from '../cfds/client/graph/vertex-manager.ts';
import { Note } from '../cfds/client/graph/vertices/note.ts';
import {
  docClone,
  Document,
  writingDirectionAtNode,
} from '../cfds/richtext/doc-state.ts';
import { isTextNode, PointerDirection } from '../cfds/richtext/tree.ts';
import { expirationForSelection } from './utils.ts';
import { TreeNode } from '../cfds/richtext/tree.ts';
import { ElementNode } from '../cfds/richtext/tree.ts';
import { MarkupElement, MarkupNode } from '../cfds/richtext/model.ts';
import { CONTENTEDITABLE_PADDING } from './editor.tsx';
import { findFirstTextNode } from '../cfds/richtext/tree.ts';
import { findLastTextNode } from '../cfds/richtext/tree.ts';
import { MeasuredText } from './text.ts';

function onMouseUpInSpan(
  target: HTMLSpanElement,
  body: Document,
  selectionId: string,
  mouseX: number,
  mouseY: number,
): Document | undefined {
  const nodeKey = target.dataset.ovvNodeKey;
  if (!nodeKey) {
    return undefined;
  }
  const node = body.nodeKeys.nodeFromKey(nodeKey);
  if (isTextNode(node)) {
    const text = node.text;
    const targetBounds = target.getBoundingClientRect();
    const targetStyle = getComputedStyle(target);
    const measuredText = new MeasuredText(
      text,
      targetStyle,
      targetBounds.width,
    );
    const lineCount = measuredText.lines.length;
    const lineIdx = Math.floor(
      (lineCount * (mouseY - targetBounds.y)) / targetBounds.height,
    );
    let offset = 0;
    for (let idx = 0; idx < lineIdx; ++idx) {
      offset += measuredText.lines[idx][0].length;
    }
    const rtl = targetStyle.direction === 'rtl';
    const line = measuredText.lines[lineIdx];
    const lineText = line[0];
    let x = 0;
    let found = false;
    for (let i = 0; i < lineText.length; ++i) {
      const charW = measuredText.characterWidths[offset + i];
      if (
        x + charW >
        (rtl ? targetBounds.right - mouseX : mouseX - targetBounds.x)
      ) {
        offset += i;
        found = true;
        break;
      }
      x += charW;
    }
    if (!found) {
      offset += lineText.length;
    }
    if (!body.ranges) {
      body.ranges = {};
    }
    body.ranges[selectionId] = {
      anchor: {
        node,
        offset,
      },
      focus: {
        node,
        offset,
      },
      dir: PointerDirection.None,
      expiration: expirationForSelection(),
    };
    return body;
  }
  return undefined;
}

function onMouseUpOutsideSpan(
  e: React.MouseEvent,
  body: Document,
  selectionId: string,
): Document | undefined {
  let contentEditable: HTMLElement | null = null;
  for (
    contentEditable = e.target as HTMLDivElement;
    contentEditable && contentEditable.contentEditable !== 'true';
    contentEditable = contentEditable.parentElement
  ) {
    // Find the contentEditable container div that holds the entire editor
  }
  if (!contentEditable || contentEditable.contentEditable !== 'true') {
    return undefined;
  }
  const contentEditableBounds = contentEditable.getBoundingClientRect();
  const clientY = e.clientY;
  for (const node of contentEditable.childNodes) {
    const r = (node as HTMLElement).getBoundingClientRect();
    const ovvKey = (node as HTMLElement).dataset.ovvKey;
    if (!ovvKey) {
      continue;
    }
    const rtNode = body.nodeKeys.nodeFromKey(ovvKey) as
      | MarkupElement
      | undefined;
    if (!rtNode) {
      continue;
    }
    if (clientY >= r.y && clientY <= r.bottom) {
      debugger;
      let start =
        e.clientX < contentEditableBounds.x + contentEditableBounds.width / 2;
      if (writingDirectionAtNode(body, rtNode as MarkupElement) === 'rtl') {
        start = !start;
      }
      const rtTextNode = start
        ? findFirstTextNode(rtNode)
        : findLastTextNode(rtNode);
      if (!rtTextNode) {
        return undefined;
      }
      if (!body.ranges) {
        body.ranges = {};
      }
      body.ranges[selectionId] = {
        anchor: {
          node: rtTextNode,
          offset: start ? 0 : rtTextNode.text.length,
        },
        focus: {
          node: rtTextNode,
          offset: start ? 0 : rtTextNode.text.length,
        },
        dir: PointerDirection.None,
        expiration: expirationForSelection(),
      };
      return body;
    }
  }
  return undefined;
}

export function onMouseUp(
  e: React.MouseEvent,
  note: VertexManager<Note>,
  selectionId: string,
): void {
  const proxy = note.getVertexProxy();
  const body = docClone(proxy.body);
  if (e.target instanceof HTMLSpanElement) {
    const updatedBody = onMouseUpInSpan(
      e.target,
      body,
      selectionId,
      e.clientX,
      e.clientY,
    );
    if (updatedBody) {
      note.getVertexProxy().body = updatedBody;
    }
  } else {
    const updatedBody = onMouseUpOutsideSpan(e, body, selectionId);
    if (updatedBody) {
      note.getVertexProxy().body = updatedBody;
    }
  }
}
