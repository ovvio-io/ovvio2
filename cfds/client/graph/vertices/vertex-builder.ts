import { Record } from '../../../base/record.ts';
import { SchemeNamespace } from '../../../base/scheme-types.ts';
import { Vertex, VertexConfig } from '../vertex.ts';
import { VertexManager } from '../vertex-manager.ts';
import { Invite } from './invite.ts';
import { Note } from './note.ts';
import { Tag } from './tag.ts';
import { User } from './user.ts';
import { Workspace } from './workspace.ts';

export default function vertexBuilder(
  manager: VertexManager,
  record: Record,
  prevVertex: Vertex | undefined,
  config: VertexConfig | undefined
): Vertex {
  switch (record.scheme.namespace) {
    case SchemeNamespace.WORKSPACE:
      return new Workspace(manager, record, prevVertex, config);

    case SchemeNamespace.USERS:
      return new User(manager, record, prevVertex, config);

    case SchemeNamespace.TAGS:
      return new Tag(manager, record, prevVertex, config);

    case SchemeNamespace.NOTES:
      return new Note(manager, record, prevVertex, config);

    case SchemeNamespace.INVITES:
      return new Invite(manager, record, prevVertex, config);

    default:
      return new Vertex(manager, record, prevVertex, config);
  }
}
