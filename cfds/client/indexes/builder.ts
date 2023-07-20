import { IndexField, IndexKeyOptions } from './index-field';
import { GetVertexManagerFunc, IIndex, IVertexManager } from './types';
import { IVertex } from '../graph/types';
import { Index, IndexOptions } from '.';
import { CoreValue } from '../../core-types';

export class IndexBuilder<
  V extends IVertex,
  M extends IVertexManager<V> = IVertexManager<V>
> {
  private _indexOpts: IndexOptions;
  private _keyOpts: IndexKeyOptions<V>;
  private _onBuildFunc?: (field: IndexField<V>, index: IIndex<V, M>) => void;
  private _vertexMngFunc: GetVertexManagerFunc;

  constructor(
    options: IndexOptions,
    vertexMngFunc: GetVertexManagerFunc,
    onBuildFunc?: (field: IndexField<V>, index: IIndex<V, M>) => void
  ) {
    this._indexOpts = options;
    this._keyOpts = {
      onlyReady: true,
    };
    this._vertexMngFunc = vertexMngFunc;
    this._onBuildFunc = onBuildFunc;
  }

  includeNotReady() {
    this._keyOpts.onlyReady = false;
    return this;
  }

  filterBy(func: (v: V) => boolean) {
    this._keyOpts.filter = func;
    return this;
  }

  addGroupBy(f: (vertex: V) => CoreValue) {
    if (!this._keyOpts.groupBys) this._keyOpts.groupBys = [];
    this._keyOpts.groupBys.push(f);
    return this;
  }

  sortBy(f: (vertex: V) => CoreValue, isAsc?: boolean) {
    this._keyOpts.sortBy = f;
    this._indexOpts.isAsc = isAsc;
    return this;
  }

  invalidateByFields(...keys: (keyof V & string)[]) {
    if (!this._keyOpts.invalidateByFields) {
      this._keyOpts.invalidateByFields = [];
    }
    for (const key of keys) {
      this._keyOpts.invalidateByFields.push(key);
    }
    return this;
  }

  save() {
    const field = new IndexField<V>(this._keyOpts);
    const index = new Index<V, M>(this._indexOpts, this._vertexMngFunc);

    if (this._onBuildFunc) {
      this._onBuildFunc(field, index);
    }

    return index;
  }
}
