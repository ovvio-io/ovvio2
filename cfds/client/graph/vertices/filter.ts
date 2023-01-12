import { mapIterable } from '../../../../base/common.ts';
import { CoreValue } from '../../../../base/core-types/base.ts';
import { coreValueCompare } from '../../../../base/core-types/comparable.ts';
import { notReached } from '../../../../base/error.ts';
import * as SetUtils from '../../../../base/set.ts';
import { toJS } from '../../../base/errors.ts';
import {
  FilterGroupBy,
  FilterSortBy,
  NoteStatus,
} from '../../../base/scheme-types.ts';
import {
  GroupByFuncResult,
  Query,
  QueryOptions,
  SourceProducer,
  SourceType,
  UnionQuery,
} from '../query.ts';
import { Vertex } from '../vertex.ts';
import { BaseVertex, Note, Tag, User, Workspace } from './index.ts';
import { NoteType } from './note.ts';

export class Filter extends BaseVertex {
  get parent(): Vertex {
    return this.owner;
  }

  get owner(): User {
    return this.graph.getVertex<User>(this.record.get<string>('owner')!);
  }

  set owner(u: User) {
    this.record.set('owner', u.key);
  }

  clearOwner(): void {
    this.record.set('owner', this.graph.rootKey);
  }

  get tags(): Set<Tag> {
    return this.vertSetForField('tags');
  }

  set tags(tags: Set<Tag>) {
    this.record.set(
      'tags',
      SetUtils.map(tags, (t) => t.key)
    );
  }

  get assignees(): Set<User> {
    return this.vertSetForField('assignees');
  }

  set assignees(assignees: Set<User>) {
    this.record.set(
      'assignees',
      SetUtils.map(assignees, (u) => u.key)
    );
  }

  get workspaces(): Set<Workspace> {
    return this.vertSetForField('workspaces');
  }

  set workspaces(workspaces: Set<Workspace>) {
    this.record.set(
      'workspaces',
      SetUtils.map(workspaces, (ws) => ws.key)
    );
  }

  get noteType(): NoteType | undefined {
    return this.record.get<NoteType>('noteType');
  }

  set noteType(type: NoteType | undefined) {
    if (!type) {
      this.record.delete('noteType');
    } else {
      this.record.set('noteType', type);
    }
  }

  get statuses(): Set<NoteStatus> | undefined {
    return this.record.get<Set<NoteStatus>>('statuses');
  }

  set statuses(s: Set<NoteStatus> | undefined) {
    if (s && s.size > 0) {
      this.record.set('statuses', s);
    } else {
      this.record.delete('statuses');
    }
  }

  get sortBy(): FilterSortBy {
    return this.record.get<FilterSortBy>('sortBy', 'Priority');
  }

  set sortBy(v: FilterSortBy) {
    this.record.set('sortBy', v);
  }

  get pinned(): boolean | undefined {
    const v = this.record.get<number>('pinned');
    if (typeof v === undefined) {
      return undefined;
    }
    return v !== 0;
  }

  set pinned(v: boolean | undefined) {
    if (typeof v === 'undefined') {
      this.record.delete('pinned');
    } else {
      this.record.set('pinned', v ? 1 : 0);
    }
  }

  get groupBy(): FilterGroupBy | undefined {
    return this.record.get<FilterGroupBy>('groupBy');
  }

  set groupBy(groupBy: FilterGroupBy | undefined) {
    if (!groupBy) {
      this.record.delete('groupBy');
    } else {
      this.record.set('groupBy', groupBy);
    }
  }

  get groupByPivot(): Vertex | undefined {
    const key = this.record.get<string>('groupByPivot');
    return key ? this.graph.getVertex(key) : undefined;
  }

  getEffectiveWorkspaces(): Workspace[] {
    if (this.workspaces) {
      return Array.from(this.workspaces);
    }
    return this.graph.sharedQueriesManager.selectedWorkspaces.results.map(
      (mgr) => mgr.getVertexProxy()
    );
  }

  private buildQuerySource(
    pinned: boolean,
    workspaces?: Set<Workspace>
  ): SourceType<Note> | SourceProducer<Note> {
    if (workspaces) {
      return new UnionQuery(
        SetUtils.map(workspaces, (ws) =>
          pinned ? ws.pinnedNotesQuery : ws.notesQuery
        )
      );
    }
    return () =>
      new UnionQuery(
        this.getEffectiveWorkspaces().map((ws) =>
          pinned ? ws.pinnedNotesQuery : ws.notesQuery
        )
      );
  }

  buildQuery(
    name: string,
    pinned?: boolean,
    workspaces?: Set<Workspace>
  ): Query<Note, Note> {
    if (!workspaces) {
      workspaces = this.workspaces;
    }
    if (typeof pinned === 'undefined') {
      pinned = this.pinned;
    }
    const graph = this.graph;
    const sharedQueriesManager = graph.sharedQueriesManager;
    const deps: Query[] = [];
    if (!workspaces) {
      deps.push(sharedQueriesManager.selectedWorkspaces as unknown as Query);
    }
    const type = this.noteType;
    const assignees = this.assignees;
    const tagsByParent = this.breakTagsByParents(this.tags);
    let sortByField: keyof Note;
    switch (this.sortBy) {
      case 'Created':
        sortByField = 'creationDate';
        break;

      case 'Modified':
        sortByField = 'lastModified';
        break;

      case 'Due':
        sortByField = 'dueDate';
        break;

      case 'Priority':
        sortByField = 'sortStamp';
        break;
    }
    const opts: QueryOptions<Note> = {
      name,
      deps,
    };
    switch (this.groupBy) {
      case 'assignee':
        opts.groupBy = groupByField('assignees');
        break;

      case 'workspace':
        opts.groupBy = groupByField('workspace');
        break;

      case 'tag': {
        const pivotTag = this.groupByPivot;
        if (!(pivotTag instanceof Tag)) {
          break;
        }
        const childTagsQuery = pivotTag.childTagsQuery;
        deps.push(childTagsQuery as unknown as Query);
        opts.groupBy = (note) => note.tags.get(pivotTag);
        break;
      }
    }

    return new Query(
      this.buildQuerySource(pinned === true, workspaces),
      (note) =>
        (!type || note.type === type) &&
        note.parentType !== NoteType.Task &&
        (!pinned || note.isPinned === pinned) &&
        (assignees.size === 0 ||
          (SetUtils.intersects(note.assignees, assignees) &&
            this.checkNoteMatchesTags(note, tagsByParent))),
      (n1, n2) =>
        coreValueCompare(
          n1[sortByField] as CoreValue,
          n2[sortByField] as CoreValue
        ),
      opts
    );
  }

  private breakTagsByParents(tags: Iterable<Tag>): Map<Tag, Set<Tag>> {
    const result = new Map<Tag, Set<Tag>>();
    for (const t of tags) {
      const parent = t.parentTag;
      let childrenSet = result.get(parent || t);
      if (!childrenSet) {
        childrenSet = new Set();
        result.set(parent || t, childrenSet);
      }
      if (parent) {
        childrenSet.add(t);
      } else {
        // We found a selected parent. Include all of its children.
        SetUtils.update(
          childrenSet,
          Query.blocking(
            this.graph.sharedQueriesManager.tags,
            (x) => x.parentTag === t
          ).map((mgr) => mgr.getVertexProxy())
        );
      }
    }
    return result;
  }

  private checkNoteMatchesTags(
    note: Note,
    tagsByParent: Map<Tag, Set<Tag>>
  ): boolean {
    if (tagsByParent.size === 0) {
      return true;
    }
    const noteTags = note.tags;
    for (const [parent, selectedChildren] of tagsByParent) {
      const child = noteTags.get(parent);
      if (!child || !selectedChildren.has(child)) {
        return false;
      }
    }
    return true;
  }
}

function groupByField<T extends Vertex, FT extends keyof T>(
  field: FT
): (v: T) => GroupByFuncResult {
  return (v: T) => v[field] as GroupByFuncResult;
}
