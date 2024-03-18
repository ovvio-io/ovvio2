import { Record } from '../../../base/record.ts';
import { SchemeNamespace } from '../../../base/scheme-types.ts';
import { Vertex, VertexConfig } from '../vertex.ts';
import { VertexManager } from '../vertex-manager.ts';
import { Note } from './note.ts';
import { Tag } from './tag.ts';
import { User } from './user.ts';
import { Workspace } from './workspace.ts';
import { View } from './view.ts';
import { UserSettings } from './user-settings.ts';

export default function vertexBuilder(
  manager: VertexManager,
  record: Record,
  prevVertex: Vertex | undefined,
  config: VertexConfig | undefined,
): Vertex {
  switch (record.scheme.namespace) {
    case SchemeNamespace.WORKSPACE:
      return new Workspace(manager, prevVertex, config);

    case SchemeNamespace.USERS:
      return new User(manager, prevVertex, config);

    case SchemeNamespace.USER_SETTINGS:
      return new UserSettings(manager, prevVertex, config);

    case SchemeNamespace.TAGS:
      return new Tag(manager, prevVertex, config);

    case SchemeNamespace.NOTES:
      return new Note(manager, prevVertex, config);

    case SchemeNamespace.VIEWS:
      return new View(manager, prevVertex, config);

    default:
      return new Vertex(manager, prevVertex, config);
  }
}
