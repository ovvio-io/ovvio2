import { resolveWritingDirection, WritingDirection } from '../base/string.ts';
import { docClone, Document } from '../cfds/richtext/doc-state.ts';
import {
  dfs,
  ElementNode,
  findLastTextNode,
  isElementNode,
  isTextNode,
  pathToNode,
  RichText,
  TextNode,
  TreeNode,
} from '../cfds/richtext/tree.ts';
import { MarkupElement, MarkupNode } from '../cfds/richtext/model.ts';
import { coreValueEquals } from '../base/core-types/equals.ts';
import { flattenRichText } from '../cfds/richtext/flat-rep.ts';

function findElementNear(
  rt: RichText,
  target: TreeNode,
  direction: 'before' | 'after',
): MarkupElement | undefined {
  debugger;
  if (!isElementNode(target)) {
    const path = pathToNode(rt.root, target);
    if (!path) {
      return undefined;
    }
    target = path[path.length - 1];
  }
  const atoms = Array.from(flattenRichText(rt, true, false));
  const idx = atoms.indexOf(target);
  if (idx < 0) {
    return undefined;
  }
  if (direction === 'before') {
    for (let j = idx - 1; j > 0; --j) {
      const node = atoms[j];
      if (
        isElementNode(node) && node.children.length > 0 &&
        !isElementNode(node.children[0])
      ) {
        return node as MarkupElement;
      }
    }
  } else {
    for (let j = idx + 1; j < atoms.length; ++j) {
      const node = atoms[j];
      if (
        isElementNode(node) && node.children.length > 0 &&
        !isElementNode(node.children[0])
      ) {
        return node as MarkupElement;
      }
    }
  }
  return undefined;
}

export function onArrowUpDown(
  doc: Document,
  selectionId: string,
  arrow: 'up' | 'down',
): Document | undefined {
  doc = docClone(doc);
  if (!doc.ranges || !doc.ranges[selectionId]) {
    return;
  }
  const selection = doc.ranges[selectionId];
  if (!coreValueEquals(selection.anchor, selection.focus)) {
    return;
  }
  const targetElement = findElementNear(
    doc,
    selection.anchor.node,
    arrow === 'up' ? 'before' : 'after',
  );
  if (!targetElement) {
    return;
  }
  const desiredOffset = selection.anchor.offset;
  let len = 0;
  let lastChild: TextNode | undefined;
  for (const child of targetElement.children) {
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
  if (lastChild) {
    selection.anchor.node = lastChild;
    selection.anchor.offset = len;
    selection.focus.node = lastChild;
    selection.focus.offset = len;
    return doc;
  }
}
