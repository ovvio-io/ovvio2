import {
  docClone,
  Document,
  writingDirectionAtNode,
} from '../cfds/richtext/doc-state.ts';
import {
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
import { WritingDirection } from '../base/string.ts';

function findNear<T extends MarkupNode>(
  rt: RichText,
  target: TreeNode,
  predicate: (node: TreeNode) => boolean,
  direction: 'before' | 'after',
): T | undefined {
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
      if (predicate(node)) {
        return node as T;
      }
    }
  } else {
    for (let j = idx + 1; j < atoms.length; ++j) {
      const node = atoms[j];
      if (predicate(node)) {
        return node as T;
      }
    }
  }
  return undefined;
}

function upDownPredicate(node: TreeNode): boolean {
  return isElementNode(node) && node.children.length > 0 &&
    !isElementNode(node.children[0]);
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
  const predicate = arrow === 'ArrowUp' || arrow === 'ArrowDown'
    ? upDownPredicate
    : isTextNode;
  const focus = selection.focus.node;
  if (writingDirectionAtNode(doc, focus, baseDirection) === 'rtl') {
    if (arrow === 'ArrowLeft') {
      arrow = 'ArrowRight';
    } else if (arrow === 'ArrowRight') {
      arrow = 'ArrowLeft';
    }
  }
  if (arrow === 'ArrowRight' && selection.focus.offset < focus.text.length) {
    return undefined;
  }
  if (arrow === 'ArrowLeft' && selection.focus.offset > 0) {
    return undefined;
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
