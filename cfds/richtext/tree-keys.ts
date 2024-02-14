import { Dictionary } from '../../base/collections/dict.ts';
import { HashMap } from '../../base/collections/hash-map.ts';
import {
  Clonable,
  Equatable,
  CoreValue,
  coreValueEquals,
} from '../../base/core-types/index.ts';
import { encodableValueHash } from '../../base/core-types/encoding/index.ts';
import { dfs, ElementNode, kCoreValueTreeNodeOpts } from './tree.ts';
import { isElementNode } from './tree.ts';

export type NodeKey = { id: string };

// ID => { id: <ID> } mapping
const gAllocatedKeys: Dictionary<string, NodeKey> = new Map();

export class TreeKeys implements Clonable, Equatable<TreeKeys> {
  private readonly _root: ElementNode;
  private readonly _keys: Dictionary<CoreValue, NodeKey>;
  private readonly _counts: Dictionary<CoreValue, number>;
  private readonly _nodeByKey: Dictionary<string, CoreValue>;

  constructor(root: ElementNode) {
    this._root = root;
    this._keys = new Map();
    this._counts = new HashMap<CoreValue, number>(
      (v) => encodableValueHash(v, kCoreValueTreeNodeOpts),
      (v1, v2) => coreValueEquals(v1, v2, kCoreValueTreeNodeOpts),
    );
    this._nodeByKey = new Map();
    for (const [node] of dfs(root)) {
      this.keyFor(node);
    }
  }

  keyFor(node: CoreValue): NodeKey {
    const keys = this._keys;
    const nodeByKey = this._nodeByKey;
    let nodeKey = keys.get(node);
    if (nodeKey === undefined) {
      const counts = this._counts;
      const idx: number = counts.get(node) || 0;
      const hash = encodableValueHash(node, kCoreValueTreeNodeOpts);
      const tagName = (isElementNode(node) && node.tagName) || undefined;
      const id = `${tagName || ''}/${hash}/${idx}`;
      nodeKey = gAllocatedKeys.get(id);
      if (nodeKey === undefined) {
        nodeKey = { id };
        gAllocatedKeys.set(id, nodeKey);
      }
      keys.set(node, nodeKey);
      counts.set(node, idx + 1);
      nodeByKey.set(nodeKey.id, node);
    }
    return nodeKey;
  }

  clone(): TreeKeys {
    return new TreeKeys(this._root);
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

  nodeFromKey(key: string): CoreValue | undefined {
    return this._nodeByKey.get(key);
  }
}
