import { coreValueCompare } from '../../../base/core-types/comparable.ts';
import { notReached } from '../../../base/error.ts';
import {
  NS_NOTES,
  NS_TAGS,
  NS_USERS,
  NS_WORKSPACE,
} from '../../base/scheme-types.ts';
import { GraphManager } from './graph-manager.ts';
import {
  EVENT_QUERY_DID_CLOSE,
  Predicate,
  Query,
  SortDescriptor,
  UnionQuery,
} from './query.ts';
import { Vertex } from './vertex.ts';
import { BaseVertex, Tag, User, Workspace } from './vertices/index.ts';

export function defaultVertCompare(v1: Vertex, v2: Vertex): number {
  if (v1 instanceof BaseVertex && v2 instanceof BaseVertex) {
    return coreValueCompare(v1.sortStamp, v2.sortStamp);
  }
  return coreValueCompare(v1.key, v2.key);
}

export class SharedQueriesManager {
  private _vertexQueries: Map<string, Map<string, Query>>;

  readonly notDeletedQuery: Query<Vertex>;
  readonly noNotesQuery: Query<Vertex>;
  readonly workspacesQuery: Query<Vertex, Workspace>;
  readonly tagsQuery: Query<Vertex, Tag>;
  readonly usersQuery: Query<Vertex, User>;
  readonly selectedWorkspacesQuery: Query<Workspace, Workspace>;
  readonly selectedTagsQuery: Query<Tag, Tag>;
  readonly selectedUsersQuery: Query<User, User>;

  constructor(graph: GraphManager) {
    this._vertexQueries = new Map();
    this.notDeletedQuery = new Query(
      graph,
      (vert) => vert.isDeleted === 0,
      undefined,
      'SharedNotDeleted'
    ).lock();
    this.noNotesQuery = new Query(
      this.notDeletedQuery,
      (vert) => vert.namespace !== NS_NOTES,
      defaultVertCompare,
      'SharedNoNotes'
    ).lock();
    this.workspacesQuery = new Query<Vertex, Workspace>(
      this.noNotesQuery,
      (vert) => vert.namespace === NS_WORKSPACE,
      defaultVertCompare,
      'SharedWorkspaces'
    ).lock();
    this.tagsQuery = new Query<Vertex, Tag>(
      this.noNotesQuery,
      (vert) => vert.namespace === NS_TAGS,
      defaultVertCompare,
      'SharedTags'
    ).lock();
    this.usersQuery = new Query<Vertex, User>(
      this.noNotesQuery,
      (vert) => vert.namespace === NS_USERS,
      defaultVertCompare,
      'SharedUsers'
    ).lock();
    this.selectedWorkspacesQuery = new Query(
      this.workspacesQuery,
      (vert) => vert.selected,
      defaultVertCompare,
      'SharedSelectedWorkspaces'
    ).lock();
    this.selectedTagsQuery = new Query(
      this.tagsQuery,
      (vert) => vert.selected,
      defaultVertCompare,
      'SharedSelectedTags'
    ).lock();
    this.selectedUsersQuery = new Query(
      this.usersQuery,
      (vert) => vert.selected,
      defaultVertCompare,
      'SharedSelectedUsers'
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
