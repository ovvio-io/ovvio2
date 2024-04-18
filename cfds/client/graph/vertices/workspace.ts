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
import { coreValueCompare } from '../../../../base/core-types/comparable.ts';
import { Dictionary } from '../../../../base/collections/dict.ts';
import { JSONObject } from '../../../../base/interfaces.ts';
import { downloadJSON } from '../../../../base/browser.ts';
import { HashMap } from '../../../../base/collections/hash-map.ts';
import { coreValueHash } from '../../../../base/core-types/encoding/hash.ts';
import { coreValueEquals } from '../../../../base/core-types/equals.ts';
import { GraphManager } from '../graph-manager.ts';
import { normalizeEmail } from '../../../../base/string.ts';
import { SchemeNamespace } from '../../../base/scheme-types.ts';
import { Record } from '../../../base/record.ts';
import { Repository } from '../../../../repo/repo.ts';
import { UserSettings } from './user-settings.ts';

export interface UserAlias extends JSONObject {
  name?: string;
  email?: string;
}

export interface EncodedRecords extends JSONObject {
  [key: string]: JSONObject;
}

export interface EncodedWorkspace extends JSONObject {
  key: string;
  name: string;
  users: UserAlias[];
  tags: EncodedRecords;
  notes: EncodedRecords;
  isTemplate: boolean;
}

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
      const userSettings = this.graph.getRootVertex<User>().settings;
      if (userSettings instanceof UserSettings) {
        const personalWsKey = `${this.graph.rootKey}-ws`;
        if (this.key === personalWsKey) {
          return -1;
        }

        if (other.key === personalWsKey) {
          return 1;
        }

        const pinnedWorkspaces =
          userSettings.record.get<Set<string>>('pinnedWorkspaces');
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
        const hiddenWorkspaces =
          userSettings.record.get<Set<string>>('hiddenWorkspaces');
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

  get users(): Set<User> {
    return this.vertSetForField('users');
  }

  set users(users: Set<User>) {
    this.record.set(
      'users',
      SetUtils.map(users, (u: User) => u.key),
    );
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
    return Query.blocking<Tag, Tag, string>(
      this.graph.sharedQueriesManager.tags,
      (tag) => tag.workspace.key === key && !tag.parentTag,
    ).map((mgr) => mgr.getVertexProxy());
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

  static createFromJSON(
    graph: GraphManager,
    encodedWs: EncodedWorkspace,
  ): Workspace {
    const aliasToUserMap = new HashMap<UserAlias, string>(
      coreValueHash,
      coreValueEquals,
    );
    const users = graph.sharedQuery('users').vertices();
    // First, match users by email
    for (const alias of encodedWs.users) {
      if (!alias.email) {
        continue;
      }
      const email = normalizeEmail(alias.email);
      for (const u of users) {
        if (u.email === email) {
          aliasToUserMap.set(alias, u.key);
          break;
        }
      }
    }
    // Next, match any remaining users by name
    for (const alias of encodedWs.users) {
      if (!alias.name || aliasToUserMap.has(alias)) {
        continue;
      }
      const name = alias.name.toLowerCase().trim();
      for (const u of users) {
        1;
        if (u.name.toLowerCase().trim() === name) {
          aliasToUserMap.set(alias, u.key);
          break;
        }
      }
    }
    const wsMembers = new Set(aliasToUserMap.values());
    wsMembers.add(graph.rootKey);
    const workspace = graph.createVertex<Workspace>(
      SchemeNamespace.WORKSPACE,
      {
        name: encodedWs.name,
        users: wsMembers,
        createdBy: graph.rootKey,
        isTemplate: encodedWs.isTemplate ? 1 : 0,
      },
      encodedWs.key,
    );
    graph.markRepositoryReady(Repository.id('data', workspace.key));
    for (const [tagKey, encodedTag] of Object.entries(encodedWs.tags)) {
      const record = Record.fromJS(encodedTag);
      graph.createVertex<Tag>(SchemeNamespace.TAGS, record.cloneData(), tagKey);
    }
    for (const [noteKey, encodedNote] of Object.entries(encodedWs.notes)) {
      const assignees: string[] = [];
      // deno-lint-ignore no-explicit-any
      for (const alias of (encodedNote.d as any).assignees?.__v || []) {
        if (aliasToUserMap.has(alias)) {
          assignees.push(aliasToUserMap.get(alias)!);
        }
      }
      // deno-lint-ignore no-explicit-any
      (encodedNote.d as any).assignees = {
        __t: 'S',
        __v: assignees,
      };
      const record = Record.fromJS(encodedNote);
      graph.createVertex<Tag>(
        SchemeNamespace.NOTES,
        record.cloneData(),
        noteKey,
      );
    }
    return workspace;
  }

  exportToJSON(): EncodedWorkspace {
    const userToAliasMap = new Map<string, UserAlias>();
    this.users.forEach((u) => userToAliasMap.set(u.key, aliasForUser(u)));
    const encodedTags: EncodedRecords = {};
    this.graph.sharedQueriesManager.tags.group(this.key).forEach((mgr) => {
      const res = mgr.record.toJS();
      // deno-lint-ignore no-explicit-any
      delete (res.d as any).createdBy;
      encodedTags[mgr.key] = res;
    });
    const encodedNotes: EncodedRecords = {};
    this.graph.sharedQueriesManager.notDeleted
      .group(this.key)
      .filter((mgr) => mgr.getVertexProxy() instanceof Note)
      .forEach((mgr) => {
        const json = mgr.record.toJS();
        const userAliases: UserAlias[] = [];
        // deno-lint-ignore no-explicit-any
        for (const key of (json.d as any).assignees?.__v || []) {
          if (userToAliasMap.has(key)) {
            userAliases.push(userToAliasMap.get(key)!);
          }
        }
        // deno-lint-ignore no-explicit-any
        (json.d as any).assignees = {
          __t: 'S',
          __v: userAliases,
        };
        encodedNotes[mgr.key] = json;
      });
    return {
      key: this.key,
      name: this.name,
      users: Array.from(userToAliasMap.values()),
      tags: encodedTags,
      notes: encodedNotes,
      isTemplate: this.isTemplate,
    };
  }

  downloadJSON(): void {
    downloadJSON(
      `${this.name}-${new Date().toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })}.json`,
      this.exportToJSON(),
    );
  }
}

function aliasForUser(u: User): UserAlias {
  return {
    name: u.name,
    email: u.email,
  };
}
