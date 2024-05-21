import { uniqueId } from '../../base/common.ts';
import { CoreObject } from '../../base/core-types/base.ts';
import { coreValueCompare } from '../../base/core-types/comparable.ts';
import { createNewNote } from '../../web-app/src/shared/card/create.ts';
import { fromTimestamp } from '../base/orderstamp.ts';
import { NS_NOTES } from '../base/scheme-types.ts';
import { isRefMarker, RefType } from '../richtext/model.ts';
import { dfs, findLastTextNode, isRichText } from '../richtext/tree.ts';
import { CreateVertexInfo, GraphManager } from './graph/graph-manager.ts';
import { VertexManager } from './graph/vertex-manager.ts';
import { Tag, User, Workspace } from './graph/vertices/index.ts';
import { Note } from './graph/vertices/note.ts';

const COPY_TITLE_SUFFIX = ' (copy)';

export interface CopyIntoCardOptions {
  suffix?: string;
  wsCopyTo?: VertexManager<Workspace>;
}

const DEFAULT_COPYINTO_OPTS: CopyIntoCardOptions = {
  suffix: COPY_TITLE_SUFFIX,
};

/**
 * Duplicates a card by 'rootKey'.
 * If the card or any of the child cards is not in a ready state (has error or loading),
 * The duplicate will fail and will return 'undefined'
 * Returns the duplicated root record state
 * @param client
 * @param rootKey The card key you want to duplicate
 */
export function copyIntoCard(
  graph: GraphManager,
  rootKey: string,
  opts: CopyIntoCardOptions = {},
): Note | undefined {
  if (!opts.wsCopyTo) {
    throw new Error('Workspace must be provided');
  }
  opts = {
    ...DEFAULT_COPYINTO_OPTS,
    ...opts,
  };
  if (!checkRecords(graph, rootKey)) return;
  const outRecords: { [s: string]: CoreObject } = {};
  const newRootKey = deepCopyImpl(
    graph,
    rootKey,
    outRecords,
    opts.wsCopyTo!,
    undefined,
  );
  fixSorting(outRecords);
  tryAppendText(outRecords[newRootKey], opts.suffix);

  const vInfos: CreateVertexInfo[] = Object.entries(outRecords).map((x) => {
    const key = x[0];
    const initialData = {
      ...x[1],
    };
    return {
      namespace: NS_NOTES,
      initialData: initialData,
      key: key,
    };
  });

  vInfos.forEach((info) =>
    graph.createVertex(info.namespace, info.initialData!, info.key),
  );
  return graph.getVertex<Note>(newRootKey);
}

/**
 * Checks that all the records are not with an error or loading
 * @returns true means that duplicate process can proceed
 */
function checkRecords(graph: GraphManager, rootKey: string) {
  if (!graph.hasVertex(rootKey)) {
    return false;
  }

  const root = graph.getVertex<Note>(rootKey);
  for (const refKey of root.getBodyRefs()) {
    if (!checkRecords(graph, refKey)) {
      return false;
    }
  }

  return true;
}

/**
 * The main deep copyInto function. Receives a rootKey and copy its children to a given workspace (wsCopyTo).
 * @param client
 * @param rootKey The old root key
 * @param outRecords
 * @param parentNoteNewKey The New Parent Key
 */
function deepCopyImpl(
  graph: GraphManager,
  rootKey: string,
  outRecords: { [s: string]: CoreObject },
  wsCopyTo: VertexManager<Workspace>,
  parentNoteNewKey?: string,
) {
  const root = graph.getVertex<Note>(rootKey);
  const tagsToCopy = findMutualTags(Array.from(root.tags.values()), wsCopyTo);
  // const assigneesToCopy = findMutualAssignees(root.assignees, wsCopyTo);
  const newKey = uniqueId();
  const newData: CoreObject = {
    ...root.cloneData(),
    creationDate: new Date(),
    sortStamp: root.sortStamp,
    workspace: wsCopyTo?.getVertexProxy().key,
    tags: tagsToCopy,
    // assignees: assigneesToCopy,
  };
  delete newData.pinnedBy;
  delete newData.status;
  delete newData.dueDate;
  delete newData.assignees;
  const newBody = newData.body;

  if (newBody && isRichText(newBody)) {
    for (const [node] of dfs(newBody.root)) {
      if (isRefMarker(node) && node.type === RefType.InternalDoc) {
        const oldTaskKey = node.ref;
        const newTaskKey = deepCopyImpl(
          graph,
          oldTaskKey,
          outRecords,
          wsCopyTo,
          newKey,
        );
        node.ref = newTaskKey;
      }
    }
  }

  if (parentNoteNewKey) {
    newData.parentNote = parentNoteNewKey;
  } else if (root.parentNote) {
    delete newData.parentNote;
  }

  outRecords[newKey] = newData;

  return newKey;
}

/**
 * Goes over all duplicated cards and fixes the sortStamp.
 * sort stamp will be relative to the sorting today
 */
function fixSorting(outRecords: { [s: string]: CoreObject }) {
  const sortedRecords = Object.entries(outRecords).sort(coreValueCompare);

  let timeStamp = new Date();
  timeStamp.setTime(timeStamp.getTime() + sortedRecords.length);

  for (const [key, data] of sortedRecords) {
    data.sortStamp = fromTimestamp(timeStamp, key);
    timeStamp.setTime(timeStamp.getTime() - 1);
  }
}

function tryAppendText(noteData: CoreObject, text: string | undefined) {
  const title = noteData.title;
  if (!title || !text || !isRichText(title)) {
    return;
  }
  const lastNode = findLastTextNode(title.root);
  if (!lastNode) {
    return;
  }
  lastNode.text += text;
  noteData.title = title;
}

function findMutualTags(
  tagsFrom: Tag[],
  wsCopyTo: VertexManager<Workspace>,
): Map<string, string> {
  const mutualTags: Map<string, string> = new Map();
  for (const tag of tagsFrom) {
    const mutualTag: Tag | undefined = tag.isTagInWorkspace(wsCopyTo);
    if (mutualTag !== undefined) {
      mutualTags.set(mutualTag.parentTag?.key!, mutualTag.key);
    }
  }
  return mutualTags;
}
function findMutualAssignees(
  assigneesFrom: Set<User>,
  wsCopyTo: VertexManager<Workspace>,
): Set<string> {
  const usersInWs: Set<User> = wsCopyTo.getVertexProxy().users;
  const usersKeysInWs = new Set<string>();
  usersInWs.forEach((user: User) => usersKeysInWs.add(user.key));
  const mutualAssignees: Set<string> = new Set();
  assigneesFrom.forEach((assignee) => {
    if (usersKeysInWs.has(assignee.key)) {
      mutualAssignees.add(assignee.key);
    }
  });
  return mutualAssignees;
}
