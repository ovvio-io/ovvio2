import { NS_NOTES } from '@ovvio/cfds';
import { TypeOfScheme } from '@ovvio/cfds/lib/base/scheme-types';
import { NOTE_SCHEME } from '@ovvio/cfds/lib/base/scheme-versions';
import { GraphManager } from '@ovvio/cfds/lib/client/graph/graph-manager';
import { Note, Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { NoteType } from '@ovvio/cfds/lib/client/graph/vertices/note';
import { COWMap } from '@ovvio/cfds/lib/collections/cow-map';

type PartialCardData = Partial<TypeOfScheme<typeof NOTE_SCHEME>>;
export type CardData = Omit<PartialCardData, 'type'> & { type: NoteType };

export const emptyDoc = () => ({
  root: { children: [{ tagName: 'p', children: [{ text: '' }] }] },
});

export function createNewCard(
  graph: GraphManager,
  ws: Workspace,
  data: CardData
): Note {
  const { type } = data;
  const tagsMap = new COWMap(
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
