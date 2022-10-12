import Utils from '@ovvio/base/lib/utils';

import { TYPE_ELEMENT } from './richtext-tree2';

export function isValidTree(root) {
  return true;
}

function checkBadNestingWithNewlines(root) {
  for (const [node, depth] of root.dfs()) {
    const isRoot = node === root;
    Utils.assert((depth === 0) === isRoot);
    if (depth > 1 && (node.type === TYPE_ELEMENT || node.tagName === 'task')) {
      const parent = node.parent;
      if (parent.type === TYPE_ELEMENT) {
        debugger;
        return false;
      }
    }
  }
  return true;
}
