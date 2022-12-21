import { Note, Tag } from '../../../../cfds/client/graph/vertices/index.ts';
import { StatusTags } from '../tags/use-status-tags.ts';

export interface ToggleResult {
  newChildTag: Tag;
  newParentTag: Tag;
  newState: boolean;
}

export function toggleDone(
  card: Pick<Note, 'tags'>,
  statusTags: StatusTags,
  newState: boolean
): ToggleResult {
  const tags = !newState ? statusTags.notDone : statusTags.done;
  if (!tags) {
    return;
  }
  const [pTag, cTag] = tags.map((x) => x.getVertexProxy());

  const newTags = card.tags;
  newTags.set(pTag, cTag);
  card.tags = newTags;
  return {
    newChildTag: cTag,
    newParentTag: pTag,
    newState: newState,
  };
}
