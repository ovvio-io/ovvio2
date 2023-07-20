import * as SetUtils from '../../../../base/set.ts';
import { Vertex } from '../vertex.ts';
import { BaseVertex } from './base.ts';
import { User } from './user.ts';
import { Query } from '../query.ts';
import { Note } from './note.ts';

export class Workspace extends BaseVertex {
  get parent(): Vertex | undefined {
    const rootKey = this.manager.graph.rootKey;
    for (const u of this.users) {
      if (u.key === rootKey) {
        return u;
      }
    }
    return undefined;
  }

  get name(): string {
    return this.record.get('name', '');
  }

  set name(name: string) {
    this.record.set('name', name);
  }

  get users(): Set<User> {
    return this.vertSetForField('users');
  }

  set users(users: Set<User>) {
    this.record.set(
      'users',
      SetUtils.map(users, (u: User) => u.key)
    );
  }

  clearUsers(): void {
    this.record.set('users', new Set());
  }

  get icon(): string | undefined {
    return this.record.get<string>('icon');
  }

  set icon(icon: string | undefined) {
    if (icon !== undefined) {
      this.record.set('icon', icon);
    } else {
      this.record.delete('icon');
    }
  }

  get exportImage(): string | undefined {
    return this.record.get<string>('exportImage');
  }

  set exportImage(img: string | undefined) {
    this.record.set('exportImage', img);
  }

  get footerHtml(): string | undefined {
    return this.record.get<string>('footerHtml');
  }

  set footerHtml(html: string | undefined) {
    this.record.set('footerHtml', html);
  }

  get notesQuery(): Query<Vertex, Note> {
    return this.graph.sharedQueriesManager.getVertexQuery(
      this.key,
      'notesQuery',
      this.graph.sharedQueriesManager.notDeleted,
      (vert) => vert instanceof Note && vert.workspace === this
    );
  }

  get pinnedNotesQuery(): Query<Note> {
    return this.graph.sharedQueriesManager.getVertexQuery(
      this.key,
      'pinnedNotesQuery',
      this.notesQuery,
      (note) => note.isPinned
    );
  }
}
