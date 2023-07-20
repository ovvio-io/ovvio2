import { Utils } from '@ovvio/base';
import logger from '@ovvio/base/lib/logger';
import { MutationPack } from '../graph/mutations';
import { CompositeField, IndexField } from './index-field';
import { IndexBuilder } from './builder';
import { buildQuery, NotifyOnOptions } from './query';
import { Expression } from './query/expression';
import {
  GetVertexManagerFunc,
  IBaseIndex,
  IIndex,
  IIndexQueryManager,
  IQuery,
  IVertexManager,
} from './types';
import { IVertex } from '../graph/types';

export class IndexQueryManager implements IIndexQueryManager {
  private _customIndexes: { [s: string]: IBaseIndex };
  private _indexes: { [s: string]: IIndex };
  private _activeQueries: Set<IQuery>;
  private _registerField: (
    namespaces: string | string[] | undefined,
    name: string,
    field: CompositeField
  ) => void;
  private _vertexMngFunc: GetVertexManagerFunc;

  constructor(
    registerField: (
      namespaces: string | string[] | undefined,
      name: string,
      field: CompositeField
    ) => void,
    vertexMngFunc: GetVertexManagerFunc
  ) {
    this._indexes = {};
    this._customIndexes = {};
    this._activeQueries = new Set<IQuery>();

    this._registerField = registerField;
    this._vertexMngFunc = vertexMngFunc;
  }

  /**
   * Returns an IndexKeyBuilder instance attached to this manager.
   *
   * Examples:
   * ---------
   *
   * Notes by Workspace:
   *
   * manager.addIndex(NS_NOTES, 'by_ws')
   *       .filterBy(r => r.isDeleted !== 1)
   *       .addGroupBy(r => r.workspace)
   *       .invalidateByFields('isDeleted', 'workspace')
   *       .sortBy(r => r.sortStamp, false)
   *       .save();
   *
   */
  addIndex<V extends IVertex = IVertex>(
    name: string,
    namespaces: string | string[]
  ): IndexBuilder<V> {
    if (this._indexes[name] !== undefined) {
      throw new Error(`Index name: ${name} already exists`);
    }
    const fieldName = `__if-${name}`;

    const keyBuilder = new IndexBuilder<V>(
      { namespaces, name: name, fieldName },
      this._vertexMngFunc,
      (field: IndexField<V>, index: IIndex<V>) => {
        this._registerField(namespaces, fieldName, field);
        this._indexes[name] = index;
      }
    );

    return keyBuilder;
  }

  addCustomIndex(index: IBaseIndex) {
    this._customIndexes[index.name] = index;
  }

  /**
   * Returns the Index instance with the given name. Throws if not found.
   * This method is used internally by the query implementation and shouldn't
   * normally be needed.
   */
  getIndex<
    V extends IVertex = IVertex,
    M extends IVertexManager<V> = IVertexManager<V>
  >(name: string): IIndex<V, M> {
    Utils.assert(name !== undefined && name !== null);
    if (!this._indexes[name]) {
      throw new Error(`Index ${name} not found`);
    }
    return this._indexes[name] as IIndex<V, M>;
  }

  getCustomIndex<TIndex extends IBaseIndex = IBaseIndex>(name: string): TIndex {
    Utils.assert(name !== undefined && name !== null);
    if (!this._customIndexes[name]) {
      throw new Error(`Custom Index ${name} not found`);
    }
    return this._customIndexes[name] as TIndex;
  }

  removeIndex(name: string) {
    Utils.assert(name !== undefined && name !== null);
    for (const q of this._activeQueries) {
      Utils.assert(!q.containsIndex(name));
    }
    if (this._indexes[name]) {
      delete this._indexes[name];
    }
  }

  removeCustomIndex(name: string) {
    Utils.assert(name !== undefined && name !== null);
    for (const q of this._activeQueries) {
      Utils.assert(!q.containsIndex(name));
    }
    if (this._customIndexes[name]) {
      delete this._customIndexes[name];
    }
  }

  query<
    V extends IVertex = IVertex,
    M extends IVertexManager<V> = IVertexManager<V>
  >(
    expression: Expression<V, M>,
    notifyOps?: NotifyOnOptions<V>
  ): IQuery<V, M> {
    return buildQuery<V, M>(this, expression, notifyOps);
  }

  subscribeQuery<
    V extends IVertex = IVertex,
    M extends IVertexManager<V> = IVertexManager<V>
  >(q: IQuery<V, M>): void {
    this._activeQueries.add(q as IQuery);
  }

  unsubscribeQuery<
    V extends IVertex = IVertex,
    M extends IVertexManager<V> = IVertexManager<V>
  >(q: IQuery<V, M>): void {
    this._activeQueries.delete(q as IQuery);
  }

  update(updates: Iterable<[IVertexManager, MutationPack]>) {
    let changedQueries: Set<IQuery> | undefined;
    let queryMap: Map<IQuery, boolean> | undefined;
    let changedIndexes: Set<IIndex> | undefined;

    for (const [vMng, mutPack] of updates) {
      queryMap = undefined;
      const vertex = vMng.getVertexProxy();

      //Go Over query before the index change
      for (const query of this._activeQueries) {
        if (changedQueries && changedQueries.has(query)) continue;

        if (query.shouldNotify(vertex, mutPack)) {
          if (!changedQueries) changedQueries = new Set<IQuery>();
          changedQueries.add(query);
          continue;
        }

        if (!queryMap) queryMap = new Map<IQuery, boolean>();
        queryMap.set(query, query.contains(vMng));
      }

      //Update Indexes
      for (const idx of Object.values(this._indexes)) {
        if (idx.update(vertex, mutPack)) {
          if (!changedIndexes) changedIndexes = new Set<IIndex>();
          changedIndexes.add(idx);
        }
      }

      for (const idx of Object.values(this._customIndexes)) {
        idx.update(vertex, mutPack);
      }

      //Go Over query after the index change
      if (queryMap) {
        for (const [query, containsBefore] of queryMap) {
          if (changedQueries && changedQueries.has(query)) continue;

          if (containsBefore !== query.contains(vMng)) {
            //Vertex added or removed
            if (!changedQueries) changedQueries = new Set<IQuery>();
            changedQueries.add(query);
            continue;
          }

          if (containsBefore) {
            if (query.shouldNotify(vertex, mutPack)) {
              //Vertex update, and query should notify on mutation
              if (!changedQueries) changedQueries = new Set<IQuery>();
              changedQueries.add(query);
            }

            if (changedIndexes) {
              for (const idx of changedIndexes) {
                if (query.containsIndex(idx)) {
                  //Vertex update + index changed
                  if (!changedQueries) changedQueries = new Set<IQuery>();
                  changedQueries.add(query);
                  break;
                }
              }
            }
          }
        }
      }
    }

    if (changedQueries) {
      for (const query of changedQueries) {
        if (query.name) logger.debug(`Query "${query.name}" notified`);
        query.notify();
      }
    }
  }
}
