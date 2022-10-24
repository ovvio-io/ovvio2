import { uniqueId } from '../../base/common.ts';
import { fromTimestamp } from '../base/orderstamp.ts';
import { NS_NOTES } from '../base/scheme-types.ts';
import { CoreObject } from '../../base/core-types/index.ts';
import { isRefMarker, RefType } from '../richtext/model.ts';
import {
  dfs,
  isRichText,
  isTextNode,
  RichText,
  TextNode,
} from '../richtext/tree.ts';
import { CreateVertexInfo, GraphManager } from './graph/graph-manager.ts';
import { Note } from './graph/vertices/note.ts';
import { ISortable, sortStampCompare } from './sorting.ts';

const DUP_TITLE_SUFFIX = ' (copy)';

interface DuplicateCardOptions {
  suffix?: string;
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

  const outRecords: { [s: string]: CoreObject } = {};
  const newRootKey = deepDuplicateImpl(graph, rootKey, outRecords, undefined);
  fixSorting(outRecords);
  tryAppendText(outRecords[newRootKey], opts.suffix);

  const vInfos: CreateVertexInfo[] = Object.entries(outRecords).map((x) => {
    return {
      namespace: NS_NOTES,
      initialData: x[1],
      key: x[0],
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
  const root = graph.getVertex<Note>(rootKey);

  if (root.isNull) {
    return false;
  }

  for (const refKey of root.getBodyRefs()) {
    if (!checkRecords(graph, refKey)) {
      return false;
    }
  }

  return true;
}

/**
 * The main deep duplicate function. Receives a rootKey and duplicate his children.
 * @param client
 * @param rootKey The old root key
 * @param outRecords
 * @param parentNoteNewKey The New Parent Key
 */
function deepDuplicateImpl(
  graph: GraphManager,
  rootKey: string,
  outRecords: { [s: string]: CoreObject },
  parentNoteNewKey?: string
) {
  const root = graph.getVertex<Note>(rootKey);

  const newKey = uniqueId();

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
        const newTaskKey = deepDuplicateImpl(
          graph,
          oldTaskKey,
          outRecords,
          newKey
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
  const sortedRecords = Object.entries(outRecords).sort((a, b) =>
    sortStampCompare(a[1] as unknown as ISortable, b[1] as unknown as ISortable)
  );

  const timeStamp = new Date();
  timeStamp.setTime(timeStamp.getTime() + sortedRecords.length);

  for (const [key, data] of sortedRecords) {
    data.sortStamp = fromTimestamp(timeStamp, key);
    timeStamp.setTime(timeStamp.getTime() - 1);
  }
}

function lastTextNode(rt: RichText) {
  let textNode: TextNode | undefined;
  for (const [node] of dfs(rt.root)) {
    if (isTextNode(node) && node.text.length > 0) {
      textNode = node;
    }
  }
  return textNode;
}

function tryAppendText(noteData: CoreObject, text: string | undefined) {
  const title = noteData.title;
  if (!title || !text || !isRichText(title)) {
    return;
  }
  const lastNode = lastTextNode(title);
  if (!lastNode) {
    return;
  }
  lastNode.text += text;
  noteData.title = title;
}
