import { assert } from '../../../../base/error.ts';
import { copyIntoCard } from '../../../../cfds/client/copyIntoCard.ts';
import { GraphManager } from '../../../../cfds/client/graph/graph-manager.ts';
import { VertexManager } from '../../../../cfds/client/graph/vertex-manager.ts';
import {
  Note,
  Tag,
  Workspace,
} from '../../../../cfds/client/graph/vertices/index.ts';
import { UISource } from '../../../../logging/client-events.ts';
import { Logger } from '../../../../logging/log.ts';

/**
 * This function recursively for this card down, looks for tags that are not
 * in the card's workspace, and either matches them with the correct tags or
 * removes them.
 *
 * @param card The root card.
 */
// function fixupCardTagsToWorkspace(card: Note): void {
//   const workspace = card.workspace;
//   for (const [parent, child] of Array.from(card.tags.entries())) {
//     // Skip tags that are in our card's workspace
//     if (parent.workspace === workspace) {
//       assert(child.workspace === workspace); // Sanity check
//       continue;
//     }

//     // Found a parent that's not a part of our workspace. Try to match it with
//     // a tag that is
//     const matchingTags = matchTagsToWorkspace(parent, child, workspace);
//     const newTags = card.tags;
//     newTags.delete(parent);
//     if (matchingTags !== undefined) {
//       newTags.set(matchingTags[0], matchingTags[1]);
//     }
//     card.tags = newTags;
//   }
//   for (const childCard of card.childCards) {
//     fixupCardTagsToWorkspace(childCard);
//   }
// }

/**
 * Given a parent / child tags pair, this method looks  for a matching pair
 * in the given workspace.
 *
 * @returns A [parent, child] pair or undefined if no match is found.
 */
// function matchTagsToWorkspace(
//   parentTag: Tag,
//   childTag: Tag,
//   workspace: Workspace
// ): [Tag, Tag] | undefined {
//   const crossWsParentKey = crossWorkspaceTagKey(parentTag);
//   const crossWsChildKey = crossWorkspaceTagKey(childTag);
//   for (const parent of workspace.parentTags) {
//     if (crossWsParentKey === crossWorkspaceTagKey(parent)) {
//       for (const child of parent.childTags) {
//         if (crossWsChildKey === crossWorkspaceTagKey(child)) {
//           return [parent, child];
//         }
//       }
//     }
//   }
//   return undefined;
// }

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

// export function moveCard(
//   cardManager: VertexManager<Note>,
//   destinationMng: VertexManager<Workspace>,
//   graph: GraphManager,
//   logger: Logger,
//   source: UISource
// ): Note | undefined {
//   const result = copyIntoCard(graph, cardManager.key, {
//     suffix: '',
//   });

//   if (result !== undefined) {
//     result.workspace = destinationMng.getVertexProxy();
//     // fixupCardTagsToWorkspace(result);
//     stripAssigneesNotInWorkspace(result);
//     cardManager.getVertexProxy().isDeleted = 1;
//     logger.log({
//       severity: 'INFO',
//       event: 'VertexMoved',
//       vertex: result.key,
//       origin: cardManager.key,
//       uiSource: source,
//     });
//   } else {
//     logger.log({
//       severity: 'INFO',
//       error: 'DuplicateFailed',
//       vertex: cardManager.key,
//       uiSource: source,
//     });
//   }
//   return result;
// }
