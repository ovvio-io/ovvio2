import React, { useEffect } from 'react';
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
import { RenderContext } from '../cfds/richtext/react.tsx';

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

export function CaretRenderer(
  contentEditable: HTMLDivElement,
  ctx: RenderContext,
) {
  // const emittedCaretIds: string[] = [];
  // useEffect(() => {
  //   const intervalId = setInterval(() => {
  //     for (const id of emittedCaretIds) {
  //       const element = document.getElementById(id);
  //       if (element) {
  //         const opacity = element.style?.opacity;
  //         element.style.opacity = opacity === '0' ? '1' : '0';
  //       }
  //     }
  //   }, 500);
  //   return () => {
  //     clearInterval(intervalId);
  //     for (const id of emittedCaretIds) {
  //       const element = document.getElementById(id);
  //       if (element) {
  //         element.style.opacity = '1';
  //       }
  //     }
  //   };
  // }, [emittedCaretIds]);

  if (!ctx.doc.ranges) {
    return;
  }

  const selectionId = ctx.selectionId;
  const selection = ctx.doc.ranges[selectionId];
  if (!selection) {
    return;
  }

  if (selection.anchor.node !== selection.focus.node) {
    return; // TODO: Range selection
  }
}
