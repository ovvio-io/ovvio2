import {
  cleanCloneTreeAtom,
  ElementNode,
  isElementNode,
  TreeNode,
  isTextNode,
} from '@ovvio/cfds/lib/richtext/tree';
import { coreValueClone } from '@ovvio/cfds/lib/core-types';

export interface NodeRenderer<O = never> {
  needRender(node: TreeNode, parentNode?: ElementNode, options?: O): boolean;
  render(node: TreeNode, parentNode?: ElementNode, options?: O): TreeNode;
}

export function renderRichText<O = never>(
  root: ElementNode,
  renderers: NodeRenderer<O>[],
  options?: O
) {
  renderers.push({
    needRender: () => true,
    render: n => {
      const newNode = coreValueClone(n, {
        fieldCloneOverride: cleanCloneTreeAtom,
      });
      if (n.text) newNode.text = n.text;
      return newNode;
    },
  });

  return renderNode(root, renderers, undefined, options);
}

function renderNode<O>(
  node: TreeNode,
  renderers: NodeRenderer<O>[],
  parentNode: ElementNode | undefined,
  options?: O
): TreeNode {
  const renderer = renderers.find(r =>
    r.needRender(node, parentNode, options)
  )!;
  const newNode = renderer.render(node, parentNode, options);

  if (isElementNode(node)) {
    const children: TreeNode[] = [];
    for (let i = 0; i < node.children.length; i++) {
      children[i] = renderNode(node.children[i], renderers, node, options);
    }
    newNode.children = children;
  }

  return newNode;
}

export function richTextToHtmlString(node: TreeNode) {
  let result = '';

  if (node.tagName !== undefined) {
    const tagName = node.tagName as string;
    result += `<${tagName}`;

    //Attributes
    for (const key in node) {
      if (node.hasOwnProperty(key)) {
        if (key === 'text' || key === 'children' || key === 'tagName') {
          continue;
        }
        result += ` ${key}="${node[key]}"`;
      }
    }

    result += '>';

    //Children
    if (isElementNode(node)) {
      for (const child of node.children) {
        result += richTextToHtmlString(child);
      }
    }
  }

  if (isTextNode(node)) {
    result += node.text;
  }
  if (node.tagName !== undefined) {
    if (node.tagName !== 'br') {
      result += `</${node.tagName}>`;
    }
  }
  return result;
}
