import { notReached } from '@ovvio/base/lib/utils/error';
import { NS_NOTES, NS_TAGS, NS_WORKSPACE } from '../../base/scheme-types';
import { GraphManager } from './graph-manager';
import {
  EVENT_QUERY_DID_CLOSE,
  Predicate,
  Query,
  SortDescriptor,
  UnionQuery,
} from './query';
import { Vertex } from './vertex';
import { Note, Tag, Workspace } from './vertices';

export class SharedQueriesManager {
  private _vertexQueries: Map<string, Map<string, Query>>;

  readonly notDeletedQuery: Query<Vertex>;
  readonly noNotesQuery: Query<Vertex>;
  readonly workspacesQuery: Query<Vertex, Workspace>;
  readonly tagsQuery: Query<Vertex, Tag>;

  constructor(graph: GraphManager) {
    this._vertexQueries = new Map();
    this.notDeletedQuery = new Query(
      graph,
      vert => vert.isDeleted === 0,
      undefined,
      'SharedNotDeleted'
    ).lock();
    this.noNotesQuery = new Query(
      this.notDeletedQuery,
      vert => vert.namespace !== NS_NOTES,
      undefined,
      'SharedNoNotes'
    ).lock();
    this.workspacesQuery = new Query<Vertex, Workspace>(
      this.notDeletedQuery,
      vert => vert.namespace === NS_WORKSPACE,
      undefined,
      'SharedWorkspaces'
    ).lock();
    this.tagsQuery = new Query<Vertex, Tag>(
      this.notDeletedQuery,
      vert => vert.namespace === NS_TAGS,
      undefined,
      'SharedTags'
    ).lock();
  }

  getVertexQuery<IT extends Vertex = Vertex, OT extends IT = IT>(
    key: string,
    name: string,
    source: Query<IT> | UnionQuery<IT> | GraphManager,
    predicate: Predicate<IT, OT>,
    sortDesc?: SortDescriptor<OT>
  ): Query<IT, OT> {
    let queries = this._vertexQueries.get(key);
    if (!queries) {
      queries = new Map();
      this._vertexQueries.set(key, queries);
    }
    let result = queries.get(name);
    if (!result) {
      result = new Query<IT, OT>(
        source,
        predicate,
        sortDesc,
        name
      ).lock() as unknown as Query<Vertex, Vertex>;
      queries.set(name, result);
      result.once(EVENT_QUERY_DID_CLOSE, () =>
        notReached('Named queries should not be closed')
      );
    }
    return result as unknown as Query<IT, OT>;
  }
}
