import { uniqueId } from '../../base/common.ts';
import { CoreObject } from '../../base/core-types/base.ts';
import { coreValueCompare } from '../../base/core-types/comparable.ts';
import { fromTimestamp } from '../base/orderstamp.ts';
import { NS_NOTES } from '../base/scheme-types.ts';
import { isRefMarker, RefType } from '../richtext/model.ts';
import { dfs, findLastTextNode, isRichText } from '../richtext/tree.ts';
import { CreateVertexInfo, GraphManager } from './graph/graph-manager.ts';
import { VertexManager } from './graph/vertex-manager.ts';
import { Workspace } from './graph/vertices/index.ts';
import { Note } from './graph/vertices/note.ts';

const DUP_TITLE_SUFFIX = ' (duplicate)';

export interface DuplicateCardOptions {
  suffix?: string;
  wsCopyTo?: VertexManager<Workspace>; // Workspace to copy the note to.
}

const DEFAULT_DUPLICATE_OPTS: DuplicateCardOptions = {
  suffix: DUP_TITLE_SUFFIX,
};

/**
 * Duplicates a card by 'rootKey'.
 * If the card or any of the child cards is not in a ready state (has error or loading),
 * The duplicate will fail and will return 'undefined'
 * Returns the duplicated root record state
 * @param client
 * @param rootKey The card key you want to duplicate
 */
export function duplicateCard(
  graph: GraphManager,
  rootKey: string,
  opts: DuplicateCardOptions = {}
): Note | undefined {
  opts = {
    ...DEFAULT_DUPLICATE_OPTS,
    ...opts,
  };
  if (!checkRecords(graph, rootKey)) return;
  console.log('opts.wsCopyTo', opts.wsCopyTo);
  const outRecords: { [s: string]: CoreObject } = {};
  const newRootKey = deepCopyIntoImpl(
    graph,
    rootKey,
    outRecords,
    undefined,
    opts.wsCopyTo
  );
  debugger;
  fixSorting(outRecords);
  tryAppendText(outRecords[newRootKey], opts.suffix);

  const workspaceId = opts.wsCopyTo?.getVertexProxy().key;

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

  const vertices = graph.createVertices<Note>(vInfos);

  const vertex = vertices.find((v) => v.key === newRootKey)!;

  return vertex;
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
 * The main deep copyInto function. Receives a rootKey it and copy his children to a given workspace (wsCopyTo).
 * @param client
 * @param rootKey The old root key
 * @param outRecords
 * @param parentNoteNewKey The New Parent Key
 * @param wsCopyTo Workspace to copy to

 */
function deepCopyIntoImpl(
  graph: GraphManager,
  rootKey: string,
  outRecords: { [s: string]: CoreObject },
  parentNoteNewKey?: string,
  wsCopyTo?: VertexManager<Workspace>
) {
  const root = graph.getVertex<Note>(rootKey);

  const newKey = uniqueId();
  debugger;
  const newData: CoreObject = {
    ...root.cloneData(),
    creationDate: new Date(),
    sortStamp: root.sortStamp,
  };
  const newBody = newData.body;
  if (newBody && isRichText(newBody)) {
    for (const [node] of dfs(newBody.root)) {
      if (isRefMarker(node) && node.type === RefType.InternalDoc) {
        const oldTaskKey = node.ref;
        const newTaskKey = deepCopyIntoImpl(
          graph,
          oldTaskKey,
          outRecords,
          newKey,
          wsCopyTo
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
