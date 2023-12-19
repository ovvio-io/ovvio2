import { resolveWritingDirection, WritingDirection } from '../base/string.ts';
import { docClone, Document } from '../cfds/richtext/doc-state.ts';
import {
  dfs,
  ElementNode,
  findLastTextNode,
  isElementNode,
  isTextNode,
  pathToNode,
  TextNode,
  TreeNode,
} from '../cfds/richtext/tree.ts';
import { MarkupElement, MarkupNode } from '../cfds/richtext/model.ts';
import { coreValueEquals } from '../base/core-types/equals.ts';

function findElementBefore(
  root: ElementNode,
  target: TreeNode,
  targetDepth?: number,
): [element: MarkupElement, path: readonly MarkupElement[]] | [
  undefined,
  undefined,
] {
  if (!isElementNode(target)) {
    const path = pathToNode(root, target);
    if (!path) {
      return [undefined, undefined];
    }
    target = path[0];
  }

  let result: ElementNode | undefined;
  let resultPath: readonly ElementNode[] | undefined;
  for (const [node, depth, path] of dfs(root)) {
    if (node === target) {
      break;
    }
    if (
      (targetDepth === undefined || depth === targetDepth) &&
      isElementNode(node)
    ) {
      result = node as ElementNode;
      resultPath = path;
    }
  }
  return result
    ? [result as MarkupElement, resultPath! as MarkupElement[]]
    : [undefined, undefined];
}

export function onArrowUp(
  doc: Document,
  selectionId: string,
): Document | undefined {
  doc = docClone(doc);
  if (!doc.ranges || !doc.ranges[selectionId]) {
    return;
  }
  const selection = doc.ranges[selectionId];
  if (!coreValueEquals(selection.anchor, selection.focus)) {
    return;
  }
  const [targetElement, _targetElementPath] = findElementBefore(
    doc.root,
    selection.anchor.node,
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
