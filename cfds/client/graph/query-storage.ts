import { GraphManager } from './graph-manager.ts';
import { SortDescriptor } from './query.ts';
import { Vertex } from './vertex.ts';
import { VertexManager } from './vertex-manager.ts';
import { SortedList } from '../../../base/collections/sorted-list.ts';
import { coreValueCompare } from '../../../base/core-types/comparable.ts';
import { coreValueEquals } from '../../../base/core-types/equals.ts';

export class QueryStorage<T extends Vertex> {
  private readonly _keys: Set<string>;
  private readonly _managers: SortedList<VertexManager<T>>;
  // private readonly _sortDescriptor: (
  //   mgr1: VertexManager<T>,
  //   mgr2: VertexManager<T>
  // ) => number;
  public limit: number = Number.MAX_SAFE_INTEGER;
  // private _cachedResults: VertexManager<T>[] | undefined;

  constructor(
    readonly graph: GraphManager,
    sortDescriptor?: SortDescriptor<T>
  ) {
    this._keys = new Set();
    this._managers = new SortedList<VertexManager<T>>(
      sortDescriptor
        ? (mgr1, mgr2) =>
            sortDescriptor(mgr1.getVertexProxy(), mgr2.getVertexProxy())
        : coreValueCompare,
      coreValueEquals
    );
  }

  get results(): VertexManager<T>[] {
    return this._managers.valuesUnsafe();
  }

  get size(): number {
    return this._keys.size;
  }

  add(key: string): boolean {
    if (this._keys.has(key)) {
      return this.touch(key);
    }
    const mgr = this.graph.getVertexManager<T>(key);
    this._keys.add(key);
    return this._managers.add(mgr) < this.limit;
  }

  delete(key: string): boolean {
    if (!this._keys.delete(key)) {
      return false;
    }
    const mgr = this.graph.getVertexManager<T>(key);
    const idx = this.results.indexOf(mgr);
    this._managers.deleteIndex(idx);
    return idx < this.limit;
  }

  has(key: string): boolean {
    return this._keys.has(key);
  }

  touch(key: string): boolean {
    const keys = this._keys;
    if (!keys.has(key)) {
      return false;
    }
    const mgr = this.graph.getVertexManager<T>(key);
    const results = this.results;
    const managers = this._managers;
    const oldIdx = results.indexOf(mgr);
    let changed = false;
    if (
      oldIdx > 0 &&
      managers.comparator(results[oldIdx - 1], results[oldIdx]) > 0
    ) {
      changed = true;
    }
    if (
      oldIdx < results.length - 2 &&
      managers.comparator(results[oldIdx], results[oldIdx + 1]) > 0
    ) {
      changed = true;
    }
    if (changed) {
      managers.deleteIndex(oldIdx);
      managers.add(mgr);
    }
    return changed;
  }
}
