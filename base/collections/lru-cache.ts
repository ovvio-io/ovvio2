import { Dictionary } from './dict.ts';
import { OrderedMap } from './orderedmap.ts';

export class LRUCache<K, V> implements Dictionary<K, V> {
  private readonly _map: OrderedMap<K, V>;
  private _limit: number;

  constructor(limit?: number, dictInst?: Dictionary) {
    this._map = new OrderedMap();
    this._limit = Math.max(0, limit || 0);
  }

  get size(): number {
    return this._map.size;
  }

  get limit(): number {
    return this._limit;
  }

  set limit(limit: number) {
    this._limit = Math.max(0, limit);
    this.evictValuesIfNeeded();
  }

  get(key: K): V | undefined {
    return this._map.get(key);
  }

  has(key: K): boolean {
    return this._map.has(key);
  }

  entries(): Iterable<[K, V]> {
    return this._map.entries();
  }

  keys(): Iterable<K> {
    return this._map.keys();
  }

  values(): Iterable<V> {
    return this._map.values();
  }

  [Symbol.iterator](): Iterator<[K, V]> {
    return this._map[Symbol.iterator]();
  }

  set(key: K, value: V): void {
    const map = this._map;
    const valueExists = map.has(key);
    map.set(key, value);
    if (valueExists) {
      map.moveToEnd(key);
    } else {
      this.evictValuesIfNeeded();
    }
  }

  delete(key: K): boolean {
    return this._map.delete(key);
  }

  clear(): void {
    this._map.clear();
  }

  private evictValuesIfNeeded(): void {
    const map = this._map;
    const limit = this._limit;
    while (limit > 0 && map.size > limit) {
      map.delete(map.startKey!);
    }
  }
}
