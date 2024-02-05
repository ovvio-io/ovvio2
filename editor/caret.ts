import React, { useEffect, useLayoutEffect } from 'react';
import {
  docClone,
  Document,
  writingDirectionAtNode,
} from '../cfds/richtext/doc-state.ts';
import {
  dfs,
  ElementNode,
  isElementNode,
  isTextNode,
  pathToNode,
  RichText,
  TextNode,
  TreeNode,
} from '../cfds/richtext/tree.ts';
import { MarkupElement, MarkupNode } from '../cfds/richtext/model.ts';
import { coreValueEquals } from '../base/core-types/equals.ts';
import { WritingDirection } from '../base/string.ts';
import { RenderContext, domIdFromNodeKey } from '../cfds/richtext/react.tsx';
import { brandLightTheme as theme } from '../styles/theme.tsx';
import { styleguide } from '../styles/styleguide.ts';
import { assert } from '../base/error.ts';
import { MeasuredText } from './text.ts';

function findNear<T extends MarkupNode>(
  rt: RichText,
  target: TreeNode,
  predicate: (node: TreeNode) => boolean,
  direction: 'before' | 'after',
): T | undefined {
  let lastMatch: T | undefined;
  let foundTarget = false;
  if (!isElementNode(target)) {
    const path = pathToNode(rt.root, target);
    if (!path) {
      return undefined;
    }
    target = path[path.length - 1];
  }
  for (const [node] of dfs(rt.root)) {
    if (node === target) {
      if (direction === 'before') {
        return lastMatch;
      }
      foundTarget = true;
      continue;
    }
    if (direction === 'before' && predicate(node)) {
      lastMatch = node as T;
      continue;
    }
    if (foundTarget && direction === 'after' && predicate(node)) {
      return node as T;
    }
  }
  return undefined;
}

function upDownPredicate(node: TreeNode): boolean {
  return (
    isElementNode(node) &&
    node.children.length > 0 &&
    !isElementNode(node.children[0])
  );
}

export function onKeyboardArrow(
  doc: Document,
  selectionId: string,
  arrow: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight',
  baseDirection: WritingDirection,
): Document | undefined {
  doc = docClone(doc);
  if (!doc.ranges || !doc.ranges[selectionId]) {
    return;
  }
  const selection = doc.ranges[selectionId];
  if (!coreValueEquals(selection.anchor, selection.focus)) {
    return;
  }
  const predicate =
    arrow === 'ArrowUp' || arrow === 'ArrowDown' ? upDownPredicate : isTextNode;
  const focus = selection.focus.node;
  if (writingDirectionAtNode(doc, focus, baseDirection) === 'rtl') {
    if (arrow === 'ArrowLeft') {
      arrow = 'ArrowRight';
    } else if (arrow === 'ArrowRight') {
      arrow = 'ArrowLeft';
    }
  }
  if (arrow === 'ArrowRight' && selection.focus.offset < focus.text.length) {
    ++selection.focus.offset;
    ++selection.anchor.offset;
    return doc;
  }
  if (arrow === 'ArrowLeft' && selection.focus.offset > 0) {
    --selection.focus.offset;
    --selection.anchor.offset;
    return doc;
  }
  const target = findNear<MarkupElement>(
    doc,
    selection.anchor.node,
    predicate,
    arrow === 'ArrowUp' || arrow === 'ArrowLeft' ? 'before' : 'after',
  );
  if (!target) {
    return;
  }
  let lastChild: TextNode | undefined = isTextNode(target) ? target : undefined;
  const desiredOffset = selection.anchor.offset;
  let len = 0;
  if (isElementNode(target)) {
    for (const child of target.children) {
      if (isTextNode(child)) {
        lastChild = child;
        len += child.text.length;
        if (len >= desiredOffset) {
          selection.anchor.node = child;
          selection.focus.node = child;
          return doc;
        }
      }
    }
  }
  if (lastChild) {
    selection.anchor.node = lastChild;
    selection.focus.node = lastChild;
    if (arrow === 'ArrowRight') {
      selection.anchor.offset = 0;
      selection.focus.offset = 0;
    } else if (arrow === 'ArrowLeft') {
      selection.anchor.offset = lastChild.text.length;
      selection.focus.offset = lastChild.text.length;
    } else {
      selection.anchor.offset = len;
      selection.focus.offset = len;
    }
    return doc;
  }
}

function renderCaret(ctx: RenderContext) {
  const caretDiv = getCaretDiv(ctx);
  if (!caretDiv) {
    return;
  }
  if (!ctx.doc.ranges) {
    caretDiv.hidden = true;
    return;
  }

  const selectionId = ctx.selectionId;
  const selection = ctx.doc.ranges[selectionId];
  if (!selection) {
    caretDiv.hidden = true;
    return;
  }

  if (selection.anchor.node !== selection.focus.node) {
    caretDiv.hidden = true;
    return; // TODO: Range selection
  }

  const spanId = domIdFromNodeKey(ctx, selection.anchor.node);
  const span = document.getElementById(spanId);
  if (!span) {
    caretDiv.hidden = true;
    return;
  }

  caretDiv.hidden = false;
  const text = selection.anchor.node.text;
  const measuredText = new MeasuredText(
    text,
    getComputedStyle(span),
    span.clientWidth,
  );
  const idx = selection.anchor.offset;
  const spanBounds = span.getBoundingClientRect();
  if (idx === 0) {
    caretDiv.style.left = `${spanBounds.x}px`;
    caretDiv.style.top = `${spanBounds.y}px`;
  } else {
    const bounds = measuredText.characterRects[Math.min(idx, text.length - 1)];
    debugger;
    if (idx === text.length) {
      caretDiv.style.left = `${spanBounds.x + bounds.x + bounds.width}px`;
    } else {
      caretDiv.style.left = `${spanBounds.x + bounds.x}px`;
    }
    caretDiv.style.top = `${spanBounds.y + bounds.y}px`;
  }
}

function domIdForCaret(ctx: RenderContext) {
  return `${ctx.editorId}:caret`;
}

function getCaretDiv(ctx: RenderContext): HTMLDivElement | undefined {
  const editor = document.getElementById(ctx.editorId);
  if (editor === null) {
    return undefined;
  }
  const caretId = domIdForCaret(ctx);
  let div = document.getElementById(caretId);
  if (!div) {
    div = document.createElement('div');
    div.id = caretId;
    div.style.position = 'absolute';
    div.style.backgroundColor = theme.mono.m4;
    div.style.width = '2px';
    div.style.height = `${styleguide.gridbase * 2}px`;
    div.style.borderRadius = '1px';
    div.style.boxSizing = 'border-box';
    div.style.border = `1px solid ${theme.mono.m4}`;
    div.style.zIndex = '1';
    editor.appendChild(div);
  }
  return div as HTMLDivElement;
}

export function useCaret(ctx: RenderContext) {
  renderCaret(ctx);
  useLayoutEffect(() => {
    renderCaret(ctx);
  });
  useEffect(() => {
    const intervalId = setInterval(() => {
      const domId = `${ctx.editorId}:caret`;
      const div = document.getElementById(domId);
      if (div) {
        const opacity = div.style?.opacity;
        div.style.opacity = opacity === '0' ? '1' : '0';
      }
    }, 550);
    return () => {
      clearInterval(intervalId);
      const domId = `${ctx.editorId}:caret`;
      const element = document.getElementById(domId);
      if (element) {
        element.style.opacity = '1';
      }
    };
  }, [ctx.editorId]);
}
