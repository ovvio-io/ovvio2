import { notReached } from '@ovvio/base/lib/utils/error';
import { Record } from '../../../base/record';
import { SchemeNamespace } from '../../../base/scheme-types';
import { Vertex, VertexConfig } from '../vertex';
import { VertexManager } from '../vertex-manager';
import { Invite } from './invite';
import { Note } from './note';
import { Tag } from './tag';
import { User } from './user';
import { Workspace } from './workspace';

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
