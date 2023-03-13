import { CoreObject } from '../../../base/core-types/base.ts';
import { coreValueCompare } from '../../../base/core-types/comparable.ts';
import { notReached } from '../../../base/error.ts';
import {
  NS_NOTES,
  NS_TAGS,
  NS_USERS,
  NS_WORKSPACE,
} from '../../base/scheme-types.ts';
import { GraphManager } from './graph-manager.ts';
import { Predicate, Query, SortDescriptor, UnionQuery } from './query.ts';
import { EVENT_VERTEX_SOURCE_CLOSED } from './vertex-source.ts';
import { Vertex } from './vertex.ts';
import { Tag, User, Workspace } from './vertices/index.ts';

export type SharedQueryName =
  | 'notDeleted'
  | 'noNotes'
  | 'workspaces'
  | 'tags'
  | 'users'
  | 'selectedWorkspaces'
  | 'selectedTags'
  | 'selectedUsers'
  | 'parentTags'
  | 'childTags'
  | 'hasPendingChanges';

export type SharedQueryType<N extends SharedQueryName> = N extends 'notDeleted'
  ? Query<Vertex>
  : N extends 'noNotes'
  ? Query<Vertex>
  : N extends 'workspaces'
  ? Query<Vertex, Workspace>
  : N extends 'tags'
  ? Query<Vertex, Tag>
  : N extends 'users'
  ? Query<Vertex, User>
  : N extends 'selectedWorkspaces'
  ? Query<Workspace>
  : N extends 'selectedTags'
  ? Query<Tag>
  : N extends 'selectedUsers'
  ? Query<User>
  : N extends 'parentTags'
  ? Query<Tag>
  : N extends 'childTags'
  ? Query<Tag>
  : Query;

export type GlobalSharedQueriesManager = {
  [name in SharedQueryName]: SharedQueryType<name>;
};

export class SharedQueriesManager implements GlobalSharedQueriesManager {
  private _vertexQueries: Map<string, Map<string, Query>>;

  readonly notDeleted: Query<Vertex>;
  readonly noNotes: Query<Vertex>;
  readonly workspaces: Query<Vertex, Workspace>;
  readonly tags: Query<Vertex, Tag>;
  readonly users: Query<Vertex, User>;
  readonly selectedWorkspaces: Query<Workspace, Workspace>;
  readonly selectedTags: Query<Tag, Tag>;
  readonly selectedUsers: Query<User, User>;
  readonly parentTags: Query<Tag, Tag>;
  readonly childTags: Query<Tag, Tag>;
  readonly hasPendingChanges: Query;

  constructor(graph: GraphManager) {
    this._vertexQueries = new Map();
    this.notDeleted = new Query(
      graph,
      (vert) => vert.isDeleted === 0,
      coreValueCompare,
      'SharedNotDeleted'
    ).lock();
    this.noNotes = new Query(
      this.notDeleted,
      (vert) => vert.namespace !== NS_NOTES,
      coreValueCompare,
      'SharedNoNotes'
    ).lock();
    this.workspaces = new Query<Vertex, Workspace>(
      this.noNotes,
      (vert) => vert.namespace === NS_WORKSPACE,
      coreValueCompare,
      'SharedWorkspaces'
    ).lock();
    this.tags = new Query<Vertex, Tag>(
      this.noNotes,
      (vert) => vert.namespace === NS_TAGS,
      coreValueCompare,
      'SharedTags'
    ).lock();
    this.users = new Query<Vertex, User>(
      this.noNotes,
      (vert) => vert.namespace === NS_USERS,
      coreValueCompare,
      'SharedUsers'
    ).lock();
    this.selectedWorkspaces = new Query(
      this.workspaces,
      (vert) => vert.selected,
      coreValueCompare,
      'SharedSelectedWorkspaces'
    ).lock();
    this.selectedTags = new Query(
      this.tags,
      (vert) => vert.selected,
      coreValueCompare,
      'SharedSelectedTags'
    ).lock();
    this.selectedUsers = new Query(
      this.users,
      (vert) => vert.selected,
      coreValueCompare,
      'SharedSelectedUsers'
    ).lock();
    this.parentTags = new Query(
      this.tags,
      (tag) => !tag.parentTag,
      coreValueCompare,
      'SharedParentTags'
    ).lock();
    this.childTags = new Query(
      this.tags,
      (tag) => typeof tag.parentTag !== 'undefined',
      coreValueCompare,
      'SharedParentTags'
    ).lock();
    this.hasPendingChanges = new Query(graph, (v) => v.hasPendingChanges);
  }

  getVertexQuery<IT extends Vertex = Vertex, OT extends IT = IT>(
    key: string,
    name: string,
    source: Query<any, IT> | UnionQuery<any, IT> | GraphManager,
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
      result.once(EVENT_VERTEX_SOURCE_CLOSED, () =>
        notReached('Named queries should not be closed')
      );
    }
    return result as unknown as Query<IT, OT>;
  }
}
