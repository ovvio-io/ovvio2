import React, { useEffect, useLayoutEffect, useMemo } from 'react';
import {
  docClone,
  Document,
  findEndOfDocument,
  writingDirectionAtNode,
} from '../cfds/richtext/doc-state.ts';
import {
  dfs,
  ElementNode,
  isElementNode,
  isTextNode,
  pathToNode,
  PointerDirection,
  RichText,
  TextNode,
  TreeNode,
} from '../cfds/richtext/tree.ts';
import { MarkupElement, MarkupNode } from '../cfds/richtext/model.ts';
import { coreValueEquals } from '../base/core-types/equals.ts';
import { WritingDirection } from '../base/string.ts';
import { RenderContext, domIdFromNodeKey } from './renderer.tsx';
import { brandLightTheme as theme } from '../styles/theme.tsx';
import { styleguide } from '../styles/styleguide.ts';
import { assert } from '../base/error.ts';
import { MeasuredText } from './text.ts';
import { getParagraphRenderer } from './paragraph-renderer.tsx';
import { expirationForSelection } from './utils.ts';

export type CaretStyle = 'p' | 'h1' | 'h2';

function findNear<T extends MarkupNode>(
  rt: RichText,
  target: TreeNode,
  predicate: (node: TreeNode) => boolean,
  direction: 'before' | 'after',
): T | undefined {
  let lastMatch: T | undefined;
  let foundTarget = false;
  if (direction === 'before' && !isElementNode(target)) {
    const path = pathToNode(rt.root, target);
    if (!path) {
      return undefined;
    }
    target = path[0];
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
  if (!ctx.doc.ranges) {
    const caret = getCaretDiv(ctx, 'p');
    if (caret) {
      caret.hidden = true;
    }
    return;
  }

  const selectionId = ctx.selectionId;
  const selection = ctx.doc.ranges[selectionId];
  if (!selection) {
    const caret = getCaretDiv(ctx, 'p');
    if (caret) {
      caret.hidden = true;
    }
    return;
  }

  const text = selection.anchor.node.text;
  const path = pathToNode(ctx.doc.root, selection.anchor.node)!;
  let style: CaretStyle = 'p';
  if (path[0].tagName === 'h1') {
    style = 'h1';
  } else if (path![0].tagName === 'h2') {
    style = 'h2';
  }

  const caretDiv = getCaretDiv(ctx, style);
  if (!caretDiv) {
    return;
  }

  if (selection.anchor.node !== selection.focus.node) {
    caretDiv.hidden = true;
    return; // TODO: Range selection
  }

  const canvasId = domIdFromNodeKey(ctx, path[path.length - 1]);
  const canvas = document.getElementById(canvasId) as
    | HTMLCanvasElement
    | undefined;

  if (!canvas) {
    caretDiv.hidden = true;
    return;
  }
  const paragraphCtx = getParagraphRenderer(canvas);
  if (!paragraphCtx) {
    caretDiv.hidden = true;
    return;
  }

  caretDiv.hidden = false;
  const spanStyle = getComputedStyle(canvas);
  const spanBounds = canvas.getBoundingClientRect();
  const rtl = spanStyle.direction === 'rtl';
  // const measuredText = new MeasuredText(
  //   text,
  //   spanStyle,
  //   spanBounds.width,
  //   rtl ? 'rtl' : 'ltr',
  // );

  const idx = selection.anchor.offset;
  if (idx === 0) {
    if (rtl) {
      caretDiv.style.left = `${spanBounds.right}px`;
    } else {
      caretDiv.style.left = `${spanBounds.left}px`;
    }
    caretDiv.style.top = `${spanBounds.y}px`;
  } else {
    const bounds = paragraphCtx.characterRects[Math.min(idx, text.length - 1)];
    if (!bounds) {
      return;
    }
    if (rtl) {
      if (idx === text.length) {
        caretDiv.style.left = `${
          spanBounds.right - bounds.x - bounds.width - 1
        }px`;
      } else {
        caretDiv.style.left = `${spanBounds.right - bounds.x - 1}px`;
      }
    } else {
      if (idx === text.length) {
        caretDiv.style.left = `${spanBounds.x + bounds.x + bounds.width - 1}px`;
      } else {
        caretDiv.style.left = `${spanBounds.x + bounds.x - 1}px`;
      }
    }
    caretDiv.style.top = `${spanBounds.y + bounds.y}px`;
  }
}

function domIdForCaret(ctx: RenderContext) {
  return `${ctx.editorId}:caret`;
}

function getCaretDiv(
  ctx: RenderContext,
  style: CaretStyle,
): HTMLDivElement | undefined {
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
    div.style.borderRadius = '1px';
    div.style.boxSizing = 'border-box';
    div.style.border = `1px solid ${theme.mono.m4}`;
    div.style.zIndex = '1';
    div.style.translate = '0px -3px';
    editor.appendChild(div);
  }
  let h: number;
  switch (style) {
    case 'h1':
      h = 24;
      break;

    case 'h2':
      h = 22;
      break;

    default:
      h = styleguide.gridbase * 2;
      break;
  }
  div.style.height = `${h}px`;
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
  }, [ctx]);

  const contentEditable = document.getElementById(ctx.editorId);
  useEffect(() => {
    if (contentEditable) {
      const observer = new ResizeObserver(() => renderCaret(ctx));
      observer.observe(contentEditable);
      return () => {
        observer.disconnect();
      };
    }
  }, [contentEditable, ctx]);

  useEffect(() => {
    if (contentEditable) {
      const listener = () => renderCaret(ctx);
      contentEditable.addEventListener('scroll', listener);
      return () => {
        contentEditable.removeEventListener('scroll', listener);
      };
    }
  }, [contentEditable, ctx]);
}

export function moveCaretToEnd(
  origDoc: Document,
  selectionId: string,
): Document {
  const doc = docClone(origDoc);
  const node = findEndOfDocument(doc);
  if (isTextNode(node)) {
    if (!doc.ranges) {
      doc.ranges = {};
    }
    doc.ranges[selectionId] = {
      anchor: {
        node,
        offset: node.text.length,
      },
      focus: {
        node,
        offset: node.text.length,
      },
      dir: PointerDirection.None,
      expiration: expirationForSelection(),
    };
    return doc;
  }
  return origDoc; // Nothing changed
}
