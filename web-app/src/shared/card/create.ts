import { NS_NOTES, TypeOfScheme } from '../../../../cfds/base/scheme-types.ts';
import { NOTE_SCHEME } from '../../../../cfds/base/scheme-versions.ts';
import { GraphManager } from '../../../../cfds/client/graph/graph-manager.ts';
import {
  Note,
  Workspace,
} from '../../../../cfds/client/graph/vertices/index.ts';
import { NoteType } from '../../../../cfds/client/graph/vertices/note.ts';

type PartialCardData = Partial<TypeOfScheme<typeof NOTE_SCHEME>>;
export type CardData = Omit<PartialCardData, 'type'> & { type: NoteType };

export const emptyDoc = () => ({
  root: { children: [{ tagName: 'p', children: [{ text: '' }] }] },
});

export function createNewNote(
  graph: GraphManager,
  ws: Workspace,
  data: CardData
): Note {
  const { type } = data;
  const tagsMap = new Map(
    Array.from(type === NoteType.Note ? ws.noteTags : ws.taskTags).map(
      ([p, t]) => [p.key, t.key]
    )
  );

  const baseData: CardData = {
    workspace: ws.key,
    createdBy: graph.rootKey,
    title: emptyDoc(),
    body: emptyDoc(),
    type: type,
    assignees: new Set<string>([graph.rootKey]),
    tags: tagsMap,
    creationDate: new Date(),
  };
  const card = graph.createVertex<Note>(NS_NOTES, {
    ...baseData,
    ...data,
  });
  return card;
}
