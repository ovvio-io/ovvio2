import { assert } from '@ovvio/base/lib/utils';
import { encodeTagId } from '@ovvio/cfds/lib/base/scheme-types';
import { duplicateCard } from '@ovvio/cfds/lib/client/duplicate';
import { GraphManager } from '@ovvio/cfds/lib/client/graph/graph-manager';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Note, Tag, Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { EventLogger } from 'core/analytics';
import { CARD_SOURCE } from 'shared/card';

/**
 * This function recursively for this card down, looks for tags that are not
 * in the card's workspace, and either matches them with the correct tags or
 * removes them.
 *
 * @param card The root card.
 */
function fixupCardTagsToWorkspace(card: Note): void {
  const workspace = card.workspace;
  for (const [parent, child] of Array.from(card.tags.entries())) {
    // Skip tags that are in our card's workspace
    if (parent.workspace === workspace) {
      assert(child.workspace === workspace); // Sanity check
      continue;
    }

    // Found a parent that's not a part of our workspace. Try to match it with
    // a tag that is
    const matchingTags = matchTagsToWorkspace(parent, child, workspace);
    const newTags = card.tags;
    newTags.delete(parent);
    if (matchingTags !== undefined) {
      newTags.set(matchingTags[0], matchingTags[1]);
    }
    card.tags = newTags;
  }
  for (const childCard of card.childCards) {
    fixupCardTagsToWorkspace(childCard);
  }
}

/**
 * Given a parent / child tags pair, this method looks  for a matching pair
 * in the given workspace.
 *
 * @returns A [parent, child] pair or undefined if no match is found.
 */
function matchTagsToWorkspace(
  parentTag: Tag,
  childTag: Tag,
  workspace: Workspace
): [Tag, Tag] | undefined {
  const tagId = encodeTagId(parentTag.name, childTag.name);
  for (const parent of workspace.parentTags) {
    for (const child of parent.childTags) {
      if (tagId === encodeTagId(parent.name, child.name)) {
        return [parent, child];
      }
    }
  }
  return undefined;
}

function stripAssigneesNotInWorkspace(card: Note): void {
  const wsUsers = card.workspace.users;
  const newAssignees = new Set(card.assignees);
  for (const u of card.assignees) {
    if (!wsUsers.has(u)) {
      newAssignees.delete(u);
    }
  }
  card.assignees = newAssignees;
  for (const child of card.childCards) {
    stripAssigneesNotInWorkspace(child);
  }
}

export function moveCard(
  cardManager: VertexManager<Note>,
  destinationMng: VertexManager<Workspace>,
  graph: GraphManager,
  eventLogger: EventLogger,
  cardSource: CARD_SOURCE
): Note {
  const result = duplicateCard(graph, cardManager.key, {
    suffix: '',
  });

  if (result !== undefined) {
    result.workspace = destinationMng.getVertexProxy();
    fixupCardTagsToWorkspace(result);
    stripAssigneesNotInWorkspace(result);
    cardManager.getVertexProxy().isDeleted = 1;
    eventLogger.cardAction('CARD_MOVED', cardManager, {
      source: cardSource,
      data: {
        newWorkspaceId: destinationMng.key,
        newCardId: result.key,
      },
    });
  } else {
    eventLogger.cardAction('CARD_MOVE_FAILED', cardManager, {
      source: cardSource,
      data: {
        cardId: cardManager.key,
      },
    });
  }
  return result;
}
