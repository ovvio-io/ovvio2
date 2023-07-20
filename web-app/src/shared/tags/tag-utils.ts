import { Note, Tag } from '@ovvio/cfds/lib/client/graph/vertices';
import { ITagItem, TagItem } from './tags.query';
import { NoteType } from '@ovvio/cfds/lib/client/graph/vertices/note';

export function tagSortValueBase(
  tagName: string | undefined,
  hasParent: boolean,
  hasChildren: boolean
) {
  if (!hasParent) {
    const tName = tagName || '';
    if (tName.toLowerCase() === 'type') {
      return 0;
    }
    if (tName.toLowerCase() === 'status') {
      return 1;
    }

    if (hasChildren) {
      return 3;
    }
  }

  return 4;
}

export function getFullTagName(tag: Tag) {
  let tagName = tag.name;
  const parentTag = tag.parentTag;
  if (parentTag) {
    tagName = `${parentTag.name}/${tagName}`;
  }

  return tagName;
}

export function sortTags(a: Tag, b: Tag) {
  const aTag = a.parentTag || a;
  const bTag = b.parentTag || b;

  const aVal = tagSortValueBase(
    aTag.name,
    aTag.parentTag !== undefined,
    a.parentTag !== undefined
  );
  const bVal = tagSortValueBase(
    bTag.name,
    bTag.parentTag !== undefined,
    b.parentTag !== undefined
  );

  return aVal - bVal;
}

export function getTagsFromCard(card: Note): ITagItem[] {
  const tags: ITagItem[] = [];
  const tagKeys = card.tags;
  for (const [pTag, cTag] of tagKeys) {
    if (pTag.isLoading || cTag.isLoading) {
      continue;
    }
    if (pTag.key === cTag.key) {
      if (!pTag.isDeleted) {
        tags.push(new TagItem(pTag));
      }
    } else {
      if (!pTag.isDeleted && !pTag.isDeleted) {
        tags.push(new TagItem(cTag));
      }
    }
  }

  return tags;
}

// export function isCardDone(card: Pick<Note, 'tags' | 'childCards' | 'type'>) {
//   for (const [pTag, cTag] of card.tags) {
//     if (pTag.isLoading || cTag.isLoading) {
//       continue;
//     }
//     if (pTag.key === cTag.key) {
//       continue;
//     }

//     if (pTag.isDeleted || cTag.isDeleted) {
//       continue;
//     }

//     if (
//       pTag.name?.toLowerCase() === 'status' &&
//       cTag.name?.toLowerCase() === 'done'
//     ) {
//       return true;
//     }
//   }

//   if (card.type === NoteType.Note && card.childCards.length > 0) {
//     for (const child of card.childCards) {
//       if (!isCardDone(child)) {
//         return false;
//       }
//     }
//     return true;
//   }

//   return false;
// }

export function isCardActionable(card: Pick<Note, 'type'>): boolean {
  return card.type === NoteType.Task;
}
