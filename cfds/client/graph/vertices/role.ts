import * as SetUtils from '../../../../base/set.ts';
import { BaseVertex } from './base.ts';
import { User } from './user.ts';
import { Workspace } from './workspace.ts';
import { Tag } from './tag.ts';
import { encodeTagId } from '../../../base/scheme-types.ts';

export class Role extends BaseVertex {
  get name(): string {
    return this.record.get<string>('name', '');
  }

  set name(name: string) {
    this.record.set('name', name);
  }

  // get assignees(): Set<User> {
  //   const result = new Set<User>();
  //   const graph = this.graph;
  //   for (const key of this.record.get('assignees', [])) {
  //     if (graph.hasVertex(key)) {
  //       const vert = graph.getVertex(key);
  //       if (vert instanceof User && !vert.isDeleted) {
  //         result.add(vert);
  //       }
  //     }
  //   }
  //   return result;
  // }

  // set assignees(assignees: Set<User>) {
  //   this.record.set(
  //     'assignees',
  //     SetUtils.map(assignees, (u) => u.key)
  //   );
  // }

  // get tags(): Set<string> {
  //   return this.record.get('tags', new Set<string>());
  // }

  // set tags(tags: Set<string>) {
  //   this.record.set('tags', tags);
  // }

  // get users(): Set<User> {
  //   const result = new Set<User>();
  //   const graph = this.graph;
  //   for (const key of this.record.get('users', [])) {
  //     if (graph.hasVertex(key)) {
  //       const vert = graph.getVertex(key);
  //       if (vert instanceof User && !vert.isDeleted) {
  //         result.add(vert);
  //       }
  //     }
  //   }
  //   return result;
  // }

  // set users(users: Set<User>) {
  //   this.record.set(
  //     'users',
  //     SetUtils.map(users, (u) => u.key)
  //   );
  // }

  // resolveTagsForWorkspace(ws: Workspace): Set<Tag> {
  //   const result = new Set<Tag>();
  //   const ids = this.tags;
  //   for (const mgr of ws.tagsQuery.results) {
  //     const tag = mgr.getVertexProxy();
  //     if (tag.parentTag && ids.has(encodeTagId(tag.parentTag.name, tag.name))) {
  //       result.add(tag);
  //     }
  //   }
  //   return result;
  // }

  // resolveTagIdsForWorkspace(ws: Workspace): Set<string> {
  //   const ids = this.tags;
  //   const result = new Set<string>();
  //   for (const mgr of ws.tagsQuery.results) {
  //     const tag = mgr.getVertexProxy();
  //     const parentTag = tag.parentTag;
  //     const tagId = encodeTagId(
  //       (parentTag || tag).name,
  //       parentTag ? tag.name : undefined
  //     );
  //     if (tag.parentTag && ids.has(tagId)) {
  //       result.add(tagId);
  //     }
  //   }
  //   return result;
  // }
}
