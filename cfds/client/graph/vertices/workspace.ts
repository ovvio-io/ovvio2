import * as SetUtils from '../../../../base/set.ts';
import {
  keyDictToVertDict,
  vertDictToKeyDict,
  Vertex,
  VertexConfig,
} from '../vertex.ts';
import { VertexManager } from '../vertex-manager.ts';
import { BaseVertex } from './base.ts';
import { Tag } from './tag.ts';
import { User } from './user.ts';
import { Query } from '../query.ts';
import { Note } from './note.ts';
import { Role } from './role.ts';
import { MutationPack } from '../mutations.ts';
import { coreValueCompare } from '../../../../base/core-types/comparable.ts';
import { Dictionary } from '../../../../base/collections/dict.ts';

// function nop(_: unknown): void {}

const kPriorityTagNames = ['priority', 'דחיפות'];

export class Workspace extends BaseVertex {
  constructor(
    mgr: VertexManager,
    prevVertex: Vertex | undefined,
    config: VertexConfig | undefined,
  ) {
    super(mgr, prevVertex, config);
    // if (prevVertex && prevVertex instanceof Workspace) {
    // }
    this.initHelperQueries();
  }

  private initHelperQueries(): void {
    // nop(this.tagsQuery);
    // nop(this.parentTagsQuery);
    // nop(this.statusTagQuery);
    // nop(this.notesQuery);
    // nop(this.pinnedNotesQuery);
  }

  compare(other: Vertex): number {
    if (other instanceof Workspace) {
      const rootUser = this.graph.getRootVertex<User>();
      const personalWsKey = `${this.graph.rootKey}-ws`;
      if (this.key === personalWsKey) {
        return -1;
      }

      if (other.key === personalWsKey) {
        return 1;
      }

      const pinnedWorkspaces = rootUser.pinnedWorkspaces;
      if (pinnedWorkspaces) {
        if (
          pinnedWorkspaces.has(this.key) &&
          !pinnedWorkspaces.has(other.key)
        ) {
          return -1;
        }
        if (
          !pinnedWorkspaces.has(this.key) &&
          pinnedWorkspaces.has(other.key)
        ) {
          return 1;
        }
      }
      const hiddenWorkspaces = rootUser.hiddenWorkspaces;
      if (hiddenWorkspaces) {
        if (
          hiddenWorkspaces.has(this.key) &&
          !hiddenWorkspaces.has(other.key)
        ) {
          return 1;
        }
        if (
          !hiddenWorkspaces.has(this.key) &&
          hiddenWorkspaces.has(other.key)
        ) {
          return -1;
        }
      }
      const nameDiff = coreValueCompare(this.name, other.name);
      if (nameDiff !== 0) {
        return nameDiff;
      }
    }
    return super.compare(other);
  }

  get parent(): Vertex | undefined {
    const users = this.record.get<Set<string>>('users');
    return users && users.has(this.graph.rootKey)
      ? this.graph.getRootVertex()
      : undefined;
  }

  get name(): string {
    return this.record.get('name', '');
  }

  set name(name: string) {
    if (this.key === `${this.graph.rootKey}-ws`) {
      return;
    }
    this.record.set('name', name);
  }

  /** @deprecated */
  selected: boolean = false;
  clearSelected() {
    this.selected = false;
  }

  get users(): Set<User> {
    return this.vertSetForField('users');
  }

  set users(users: Set<User>) {
    this.record.set(
      'users',
      SetUtils.map(users, (u: User) => u.key),
    );
  }

  get assignees(): Set<User> {
    return this._computeAssignees(this.vertSetForField<User>('users'));
  }

  private _computeAssignees(users: Set<User> | undefined): Set<User> {
    if (!users || users.size === 0 || !this.graph.hasVertex('Unassignable')) {
      return users || new Set();
    }
    const unassignable = this.graph.getVertex<Role>('Unassignable').users;
    const remainder = SetUtils.subtract(users, unassignable);
    return remainder.size > 0 ? remainder : users;
  }

  usersDidMutate(
    local: boolean,
    oldValue: Set<User> | undefined,
  ): MutationPack {
    return ['assignees', local, this._computeAssignees(oldValue)];
  }

  clearUsers(): void {
    this.record.set('users', new Set());
  }

  get icon(): string | undefined {
    return this.record.get('icon');
  }

  set icon(icon: string | undefined) {
    if (icon !== undefined) {
      this.record.set('icon', icon);
    } else {
      this.record.delete('icon');
    }
  }

  get noteTags(): Dictionary<Tag, Tag> {
    const map: Map<string, string> | undefined = this.record.get('noteTags');
    return map === undefined ? new Map() : keyDictToVertDict(this.graph, map);
  }

  set noteTags(map: Dictionary<Tag, Tag>) {
    this.record.set('noteTags', vertDictToKeyDict(map));
  }

  clearNoteTags(): void {
    this.noteTags = new Map();
  }

  get taskTags(): Dictionary<Tag, Tag> {
    const map: Map<string, string> | undefined = this.record.get('taskTags');
    return map === undefined ? new Map() : keyDictToVertDict(this.graph, map);
  }

  set taskTags(map: Dictionary<Tag, Tag>) {
    this.record.set('taskTags', vertDictToKeyDict(map));
  }

  clearTaskTags(): void {
    this.taskTags = new Map();
  }

  get exportImage(): string | undefined {
    return this.record.get('exportImage');
  }

  set exportImage(img: string | undefined) {
    this.record.set('exportImage', img);
  }

  get footerHtml(): string | undefined {
    return this.record.get('footerHtml');
  }

  set footerHtml(html: string | undefined) {
    this.record.set('footerHtml', html);
  }

  get isTemplate(): boolean {
    return this.record.get<number>('isTemplate', 0) === 1;
  }

  set isTemplate(flag: boolean) {
    if (flag) {
      this.record.set('isTemplate', 1);
    } else {
      this.record.delete('isTemplate');
    }
  }

  get createdBy(): User | undefined {
    const key = this.record.get('createdBy');
    return key ? this.graph.getVertex<User>(key) : undefined;
  }

  set createdBy(u: User | undefined) {
    if (u) {
      this.record.set('createdBy', u.key);
    } else {
      this.record.delete('createdBy');
    }
  }

  get parentTags(): Tag[] {
    const key = this.key;
    return Query.blocking(
      this.graph.sharedQueriesManager.tags,
      (tag) => tag.workspace.key === key && !tag.parentTag,
    ).map((mgr) => mgr.getVertexProxy());
  }

  get priorityTag(): Tag | undefined {
    const mgr = Query.blocking<Tag>(
      this.parentTagsQuery,
      (tag) => kPriorityTagNames.includes(tag.name.toLowerCase()),
    )[0];
    return mgr?.getVertexProxy<Tag>();
  }

  get tagsQuery(): Query<Tag, Tag> {
    const key = this.key;
    return this.graph.sharedQueriesManager.getVertexQuery(
      this.key,
      this.graph.sharedQueriesManager.tags,
      (tag) => tag.workspace.key === key,
      { name: 'tagsQuery', sourceGroupId: this.key },
    );
  }

  get parentTagsQuery(): Query<Tag> {
    return this.graph.sharedQueriesManager.getVertexQuery(
      this.key,
      this.graph.sharedQueriesManager.tags,
      (tag) => tag.parentTag === undefined,
      { name: 'parentTagsQuery', sourceGroupId: this.key },
    );
  }

  get statusTagQuery(): Query<Tag> {
    return this.graph.sharedQueriesManager.getVertexQuery(
      this.key,
      this.parentTagsQuery,
      (tag) => tag.name.toLowerCase() === 'status',
      { name: 'statusTagQuery' },
    );
  }

  get notesQuery(): Query<Vertex, Note> {
    const key = this.key;
    return this.graph.sharedQueriesManager.getVertexQuery(
      this.key,
      this.graph.sharedQueriesManager.notDeleted,
      (vert) => vert instanceof Note && vert.workspace.key === key,
      { name: 'notesQuery', sourceGroupId: this.key },
    );
  }

  get pinnedNotesQuery(): Query<Note> {
    return this.graph.sharedQueriesManager.getVertexQuery(
      this.key,
      this.notesQuery,
      (note) => note.isPinned,
      { name: 'pinnedNotesQuery' },
    );
  }
}
