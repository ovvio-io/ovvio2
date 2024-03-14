import {
  NS_NOTES,
  NS_TAGS,
  NS_USERS,
  NS_WORKSPACE,
  SortBy,
} from '../../base/scheme-types.ts';
import { GraphManager } from './graph-manager.ts';
import {
  Predicate,
  Query,
  QueryOptions,
  SortDescriptor,
  UnionQuery,
} from './query.ts';
import { Vertex } from './vertex.ts';
import {
  BaseVertex,
  ContentVertex,
  Note,
  Tag,
  User,
  Workspace,
} from './vertices/index.ts';
import { NOTE_SORT_BY, NoteType } from './vertices/note.ts';
import { CoreValue } from '../../../base/core-types/base.ts';
import { assert, notReached } from '../../../base/error.ts';
import { VertexManager } from './vertex-manager.ts';
import { VertexSource } from './vertex-source.ts';

export type SharedQueryName =
  | 'notDeleted'
  | 'noNotes'
  | 'workspaces'
  | 'tags'
  | 'childTags'
  | 'parentTagsByName'
  // | 'childTagsByParentName'
  | 'users'
  | 'parentTagsByWorkspace';
// | 'users'
// | 'hasPendingChanges';

export type SharedQueryType<N extends SharedQueryName> = N extends 'notDeleted'
  ? Query<Vertex>
  : N extends 'noNotes'
  ? Query<Vertex>
  : N extends 'workspaces'
  ? Query<Vertex, Workspace>
  : N extends 'tags'
  ? Query<Vertex, Tag, string>
  : N extends 'childTags'
  ? Query<Tag, Tag, string>
  : N extends 'parentTagsByName'
  ? Query<Tag, Tag, string>
  : // : N extends 'childTagsByParentName'
  // ? Query<Tag, Tag, string>
  N extends 'users'
  ? Query<Vertex, User>
  : N extends 'parentTagsByWorkspace'
  ? Query<Tag, Tag, VertexManager<Workspace>>
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
  readonly tags: Query<Vertex, Tag, string>;
  readonly childTags: Query<Tag, Tag, string>;
  readonly parentTagsByName: Query<Tag, Tag, string>;
  // readonly childTagsByParentName: Query<Tag, Tag, string>;
  readonly users: Query<Vertex, User>;
  readonly parentTagsByWorkspace: Query<Tag, Tag, VertexManager<Workspace>>;

  constructor(graph: GraphManager) {
    this._vertexQueries = new Map();
    this._noteQueries = new Map();
    this.notDeleted = new Query<Vertex, Vertex, CoreValue>({
      source: graph,
      predicate: (vert) => !vert.isNull && vert.isDeleted === 0,
      name: 'SharedNotDeleted',
      groupBy: groupByWorkspace,
      waitForSource: true,
      alwaysActive: true,
    }).lock();
    this.noNotes = new Query({
      source: this.notDeleted,
      predicate: (vert) => vert.namespace !== NS_NOTES,
      name: 'SharedNoNotes',
      alwaysActive: true,
    }).lock();
    this.workspaces = new Query<Vertex, Workspace>({
      source: this.noNotes,
      predicate: (vert) => vert instanceof Workspace,
      name: 'SharedWorkspaces',
      alwaysActive: true,
    }).lock();
    this.tags = new Query<Vertex, Tag, string>({
      source: this.noNotes,
      predicate: (vert) => vert.namespace === NS_TAGS,
      name: 'SharedTags',
      alwaysActive: true,
      groupBy: (tag) => tag.workspace.key,
    }).lock();
    this.childTags = new Query<Tag, Tag, string>({
      source: this.tags,
      predicate: (tag: Tag) => tag.isChildTag,
      name: 'SharedChildTags',
      alwaysActive: true,
      groupBy: (tag) => tag.workspace.key,
    }).lock();
    this.parentTagsByName = new Query<Tag, Tag, string>({
      source: this.tags,
      predicate: (tag) => !tag.isChildTag,
      name: 'SharedParentTags',
      alwaysActive: true,
      groupBy: (tag) => tag.name,
      contentSensitive: true,
      contentFields: ['childTags', 'name'],
    }).lock();
    // this.childTagsByParentName = new Query<Tag, Tag, string>({
    //   source: this.tags,
    //   predicate: (tag) => tag.isChildTag,
    //   name: 'SharedChildTags',
    //   alwaysActive: true,
    //   groupBy: (tag) => tag.parentTag?.name || null,
    //   contentSensitive: true,
    //   contentFields: ['parentTag'],
    // }).lock();
    this.users = new Query<Vertex, User>({
      source: this.noNotes,
      predicate: (vert) => vert.namespace === NS_USERS,
      name: 'SharedUsers',
      alwaysActive: true,
    }).lock();
    this.parentTagsByWorkspace = new Query({
      source: this.tags,
      predicate: (tag) => !tag.isChildTag,
      name: 'SharedTagsByWorkspace',
      groupBy: (tag) => tag.workspace.manager,
      alwaysActive: true,
    });
  }

  noteQuery(sortBy?: SortBy): Query<Vertex, Note, string> {
    if (typeof sortBy === 'undefined') {
      sortBy = SortBy.Default;
    }
    let query = this._noteQueries.get(sortBy);
    if (!query) {
      query = new Query({
        source: this.notDeleted,
        predicate: (vert: Vertex) =>
          vert instanceof Note && vert.parentType !== NoteType.Task,
        sortBy: NOTE_SORT_BY[sortBy],
        groupBy: (note) => note.workspace.key,
        name: 'SharedSortedNotes-' + sortBy,
        alwaysActive: true,
      }).lock();
      this._noteQueries.set(sortBy, query);
    }
    return query;
  }

  getVertexQuery<
    IT extends Vertex = Vertex,
    OT extends IT = IT,
    GT extends CoreValue = CoreValue,
  >(
    key: string,
    source: VertexSource,
    predicate: Predicate<IT, OT>,
    sortDescriptorOrOpts?:
      | SortDescriptor<OT>
      | QueryOptions<IT, OT, GT>
      | Omit<QueryOptions<IT, OT, GT>, 'source' | 'predicate'>,
    name?: string,
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
      'Must provide a name for vertex function',
    );
    let result = queries.get(name);
    const opts: QueryOptions<IT, OT, GT> =
      typeof sortDescriptorOrOpts === 'function'
        ? { source, predicate, sortBy: sortDescriptorOrOpts }
        : { ...sortDescriptorOrOpts, source, predicate };
    opts.name = name;
    if (!result) {
      result = new Query<IT, OT, GT>(opts).lock() as unknown as Query<
        Vertex,
        Vertex
      >;
      queries.set(name, result);
    }
    return result as unknown as Query<IT, OT>;
  }
}
