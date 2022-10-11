export type KeyComparator<Key> = (a: Key, b: Key) => number;

export interface IndexTree<K, V> {
  readonly comparator: KeyComparator<K>;
  readonly size: number;
  insert(key: K, value: V): void;
  remove(key: K): void;
  range(minKey?: K, maxKey?: K, isAsc?: boolean): Generator<[K, V]>;
}
