import AVLTree, { Node } from '@ovvio/avl';
import { IndexTree, KeyComparator } from './base';

export class AVLIndexTree<K, V> implements IndexTree<K, V> {
  private _tree: AVLTree<K, V>;

  constructor(comparator?: KeyComparator<K>) {
    this._tree = new AVLTree(comparator, true);
  }

  get comparator(): KeyComparator<K> {
    return this._tree.comparator;
  }

  get size() {
    return this._tree.size;
  }

  insert(key: K, value: V): void {
    this._tree.insert(key, value);
  }

  remove(key: K): void {
    this._tree.remove(key);
  }

  range(minKey?: K, maxKey?: K, isAsc?: boolean): Generator<[K, V]> {
    return isAsc === undefined || isAsc === true
      ? this.ascIter(this._tree.root as Node<K, V>, minKey, maxKey)
      : this.descIter(this._tree.root as Node<K, V>, minKey, maxKey);
  }

  private *ascIter(
    node: Node<K, V>,
    minKey: K | undefined,
    maxKey: K | undefined
  ): Generator<[K, V]> {
    if (node !== null) {
      let minKeyCmp =
        minKey !== undefined
          ? this._tree.comparator(minKey, node.key!)
          : undefined;
      let maxKeyCmp =
        maxKey !== undefined
          ? this._tree.comparator(maxKey, node.key!)
          : undefined;

      if (node.left && (minKeyCmp === undefined || minKeyCmp < 0)) {
        for (const n of this.ascIter(node.left, minKey, maxKey)) {
          yield n;
        }
      }
      if (
        (minKeyCmp === undefined || minKeyCmp <= 0) &&
        (maxKeyCmp === undefined || maxKeyCmp >= 0)
      )
        yield [node.key!, node.data!];

      if (node.right && (maxKeyCmp === undefined || maxKeyCmp > 0)) {
        for (const n of this.ascIter(node.right, minKey, maxKey)) {
          yield n;
        }
      }
    }
  }

  private *descIter(
    node: Node<K, V>,
    minKey: K | undefined,
    maxKey: K | undefined
  ): Generator<[K, V]> {
    if (node !== null) {
      let minKeyCmp =
        minKey !== undefined
          ? this._tree.comparator(minKey, node.key!)
          : undefined;
      let maxKeyCmp =
        maxKey !== undefined
          ? this._tree.comparator(maxKey, node.key!)
          : undefined;

      if (node.right && (maxKeyCmp === undefined || maxKeyCmp > 0)) {
        for (const n of this.descIter(node.right, minKey, maxKey)) {
          yield n;
        }
      }
      if (
        (minKeyCmp === undefined || minKeyCmp <= 0) &&
        (maxKeyCmp === undefined || maxKeyCmp >= 0)
      )
        yield [node.key!, node.data!];

      if (node.left && (minKeyCmp === undefined || minKeyCmp < 0)) {
        for (const n of this.descIter(node.left, minKey, maxKey)) {
          yield n;
        }
      }
    }
  }
}
