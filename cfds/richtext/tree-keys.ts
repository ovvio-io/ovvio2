import { Dictionary } from '../collections/dict';
import { HashMap } from '../collections/hash-map';
import {
  Comparable,
  Clonable,
  Equatable,
  CoreValue,
  coreValueEquals,
} from '../core-types';
import { encodableValueHash } from '../encoding';
import { dfs, ElementNode, kCoreValueTreeNodeOpts, TreeNode } from './tree';

export type NodeKey = { id: string };

// ID => { id: <ID> } mapping
const gAllocatedKeys: Dictionary<string, NodeKey> = new Map();

export class TreeKeys implements Clonable, Equatable<TreeKeys> {
  private readonly _root: ElementNode;
  private readonly _keys: Dictionary<CoreValue, NodeKey>;
  private readonly _counts: Dictionary<CoreValue, number>;

  constructor(root: ElementNode) {
    this._root = root;
    this._keys = new Map();
    this._counts = new HashMap<CoreValue, number>(
      v => encodableValueHash(v, kCoreValueTreeNodeOpts),
      (v1, v2) => coreValueEquals(v1, v2, kCoreValueTreeNodeOpts)
    );
    for (const [node] of dfs(root)) {
      this.keyFor(node);
    }
  }

  keyFor(node: CoreValue): NodeKey {
    const keys = this._keys;
    let nodeKey = keys.get(node);
    if (nodeKey === undefined) {
      const counts = this._counts;
      const idx: number = counts.get(node) || 0;
      const hash = encodableValueHash(node, kCoreValueTreeNodeOpts);
      const id = hash + '/' + idx;
      nodeKey = gAllocatedKeys.get(id);
      if (nodeKey === undefined) {
        nodeKey = { id };
        gAllocatedKeys.set(id, nodeKey);
      }
      keys.set(node, nodeKey);
      counts.set(node, idx + 1);
    }
    return nodeKey;
  }

  clone(): this {
    return new TreeKeys(this._root) as this;
  }

  isEqual(other: TreeKeys): boolean {
    const thisCounts = this._counts;
    const otherCounts = other._counts;
    for (const [key, value] of thisCounts) {
      if (otherCounts.get(key) !== value) {
        return false;
      }
    }
    for (const key of otherCounts.keys()) {
      if (!thisCounts.has(key)) {
        return false;
      }
    }
    return true;
  }
}
