import { notReached } from '@ovvio/base/lib/utils/error';
import {
  NS_NOTES,
  NS_ROLES,
  NS_TAGS,
  NS_USERS,
  NS_WORKSPACE,
  SortBy,
} from '../../base/scheme-types';
import { GraphManager } from './graph-manager';
import {
  Predicate,
  Query,
  QueryOptions,
  SortDescriptor,
  UnionQuery,
} from './query';
import { Vertex } from './vertex';
import {
  BaseVertex,
  ContentVertex,
  Note,
  Tag,
  User,
  Workspace,
} from './vertices';
import { Role } from './vertices/role';
import { CoreValue, coreValueCompare } from '../../core-types';
import { assert } from '@ovvio/base/lib/utils';
import { EVENT_VERTEX_SOURCE_CLOSED } from './vertex-source';
import { NOTE_SORT_BY, NoteType } from './vertices/note';

export type SharedQueryName =
  | 'notDeleted'
  | 'noNotes'
  | 'workspaces'
  | 'tags'
  | 'parentTagsByName'
  | 'childTagsByParentName'
  | 'users';
// | 'users'
// | 'hasPendingChanges';

export type SharedQueryType<N extends SharedQueryName> = N extends 'notDeleted'
  ? Query<Vertex>
  : N extends 'noNotes'
  ? Query<Vertex>
  : N extends 'workspaces'
  ? Query<Vertex, Workspace>
  : N extends 'tags'
  ? Query<Vertex, Tag>
  : N extends 'parentTagsByName'
  ? Query<Tag, Tag, string>
  : N extends 'childTagsByParentName'
  ? Query<Tag, Tag, string>
  : N extends 'users'
  ? Query<Vertex, User>
  : Query;

export type GlobalSharedQueriesManager = {
  [name in SharedQueryName]: SharedQueryType<name>;
};

export function groupByWorkspace(vert: Vertex): string | null {
  return vert instanceof ContentVertex ? vert.workspace?.key : null;
}

export class SharedQueriesManager implements GlobalSharedQueriesManager {
  private _vertexQueries: Map<string, Map<string, Query>>;
  private _noteQueries: Map<SortBy, Query<Vertex, Note, string>>;

  readonly notDeleted: Query<Vertex, Vertex>;
  readonly noNotes: Query<Vertex>;
  readonly workspaces: Query<Vertex, Workspace>;
  readonly tags: Query<Vertex, Tag>;
  readonly roles: Query<Vertex, Role>;
  readonly parentTagsByName: Query<Tag, Tag, string>;
  readonly childTagsByParentName: Query<Tag, Tag, string>;
  readonly users: Query<Vertex, User>;

  constructor(graph: GraphManager) {
    this._vertexQueries = new Map();
    this._noteQueries = new Map();
    this.notDeleted = new Query<Vertex, Vertex, CoreValue>(
      graph,
      vert => !vert.isNull && vert.isDeleted === 0,
      {
        name: 'SharedNotDeleted',
        groupBy: groupByWorkspace,
        waitForSource: true,
      }
    ).lock();
    this.noNotes = new Query(
      this.notDeleted,
      vert => vert.namespace !== NS_NOTES,
      undefined,
      'SharedNoNotes'
    ).lock();
    this.workspaces = new Query<Vertex, Workspace>(
      this.noNotes,
      vert => vert.namespace === NS_WORKSPACE,
      undefined,
      'SharedWorkspaces'
    ).lock();
    this.tags = new Query<Vertex, Tag>(
      this.noNotes,
      vert => vert.namespace === NS_TAGS,
      { name: 'SharedTags', groupBy: tag => tag.workspace.key }
    ).lock();
    this.parentTagsByName = new Query<Tag, Tag, string>(
      this.tags,
      tag => tag.parentTag === undefined,
      {
        name: 'SharedParentTags',
        groupBy: tag => tag.name,
      }
    ).lock();
    this.childTagsByParentName = new Query<Tag, Tag, string>(
      this.tags,
      tag => tag.parentTag !== undefined,
      {
        name: 'SharedChildTags',
        groupBy: tag => tag.parentTag!.name,
      }
    ).lock();
    this.roles = new Query<Vertex, Role>(
      this.noNotes,
      vert => vert.namespace === NS_ROLES,
      undefined,
      'SharedRoles'
    ).lock();
    this.users = new Query<Vertex, User>(
      this.noNotes,
      vert => vert.namespace === NS_USERS,
      undefined,
      'SharedUsers'
    ).lock();
  }

  noteQuery(sortBy?: SortBy): Query<Vertex, Note, string> {
    if (typeof sortBy === 'undefined') {
      sortBy = SortBy.Default;
    }
    let query = this._noteQueries.get(sortBy);
    if (!query) {
      query = new Query(
        this.notDeleted,
        vert => vert instanceof Note && vert.parentType !== NoteType.Task,
        {
          sortBy: NOTE_SORT_BY[sortBy],
          groupBy: note => note.workspace.key,
          name: 'SharedSortedNotes-' + sortBy,
        }
      ).lock();
      this._noteQueries.set(sortBy, query);
    }
    return query;
  }

  getVertexQuery<
    IT extends Vertex = Vertex,
    OT extends IT = IT,
    GT extends CoreValue = CoreValue
  >(
    key: string,
    source: Query<any, IT> | UnionQuery<any, IT> | GraphManager,
    predicate: Predicate<IT, OT>,
    sortDescriptorOrOpts?: SortDescriptor<OT> | QueryOptions<OT, GT>,
    name?: string
  ): Query<IT, OT> {
    let queries = this._vertexQueries.get(key);
    if (!queries) {
      queries = new Map();
      this._vertexQueries.set(key, queries);
    }
    if (!name && typeof sortDescriptorOrOpts !== 'function') {
      name = sortDescriptorOrOpts!.name!;
    }
    assert(
      typeof name !== 'undefined',
      'Must provide a name for vertex function'
    );
    let result = queries.get(name);
    const opts: QueryOptions<OT, GT> =
      typeof sortDescriptorOrOpts === 'function'
        ? { sortBy: sortDescriptorOrOpts }
        : {};
    opts.name = name;
    if (!result) {
      result = new Query<IT, OT, GT>(
        source,
        predicate,
        opts
      ).lock() as unknown as Query<Vertex, Vertex>;
      queries.set(name, result);
      result.once(EVENT_VERTEX_SOURCE_CLOSED, () =>
        notReached('Named queries should not be closed')
      );
    }
    return result as unknown as Query<IT, OT>;
  }
}
