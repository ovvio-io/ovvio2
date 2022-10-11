import { AVLIndexTree } from './avl';
import { IndexTree, KeyComparator } from './base';

export function createDefaultIndexTree<K, V>(
  comparator?: KeyComparator<K>
): IndexTree<K, V> {
  return new AVLIndexTree<K, V>(comparator);
}
