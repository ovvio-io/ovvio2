import { Document } from '../cfds/richtext/doc-state.ts';
import { coreValueEquals } from '../base/core-types/equals.ts';
import { assert } from '../base/error.ts';
import { docToRT, docFromRT } from '../cfds/richtext/doc-state.ts';
import {
  IndexedPointerValue,
  filteredPointersRep,
  flattenRichText,
  isDepthMarker,
  kElementSpacer,
  reconstructRichText,
  projectPointers,
} from '../cfds/richtext/flat-rep.ts';
import { MergeContext } from '../cfds/richtext/merge-context.ts';
import { normalizeRichText } from '../cfds/richtext/normalize/index.ts';
import { initRichTextRoot, pathToNode } from '../cfds/richtext/tree.ts';
import { PointerDirection } from '../cfds/richtext/tree.ts';
import { expirationForSelection } from './utils.ts';

const EMPTY_DOCUMENT_ROOT = initRichTextRoot();
export function deleteCurrentSelection(
  document: Document,
  selectionId: string,
): Document {
  if (coreValueEquals(EMPTY_DOCUMENT_ROOT, document.root)) {
    return document;
  }
  const selection = document.ranges && document.ranges[selectionId];
  if (!selection) {
    return document;
  }
  const pointers: IndexedPointerValue[] = [];
  const mergeCtx = new MergeContext(
    filteredPointersRep(
      flattenRichText(docToRT(document), true),
      (ptr) => {
        return true;
      },
      pointers,
    ),
  );
  let start, end: number | undefined;
  for (const [idx, ptr] of pointers) {
    if (ptr.key === selectionId) {
      if (ptr.type === 'anchor') {
        start = idx;
      } else {
        end = idx;
      }
    }
  }
  if (start === undefined) {
    start = end;
  }
  if (end === undefined) {
    end = start;
  }
  if (start === undefined && end === undefined) {
    return document;
  }
  if (start! > end!) {
    const tmp = start;
    start = end;
    end = tmp;
  }
  if (start === end) {
    start = start!;
    const prevAtom = mergeCtx.at(start - 1);
    if (isDepthMarker(prevAtom)) {
      mergeCtx.deleteRange(start - 4, start);

      const path = pathToNode(document.root, selection.anchor.node);
      assert(path !== undefined);
      if (path.length > 1) {
        const parent = path[path.length - 2];
        const childIndex = parent.children.indexOf(path[path.length - 1]);
        const newDepth = prevAtom.depthMarker - 1;
        if (childIndex === 0) {
          mergeCtx.deleteRange(start - 5, start - 3);
          mergeCtx.insert(start - 4, [
            { tagName: 'p', children: [] },
            { depthMarker: newDepth },
          ]);
          if (parent.tagName !== 'ref') {
            mergeCtx.insert(start + 1, [
              { depthMarker: newDepth - 1 },
              kElementSpacer,
              { ...parent, children: [] },
              { depthMarker: newDepth },
            ]);
          }
        }
      }
    } else {
      mergeCtx.delete(start - 1);
    }
  } else {
    mergeCtx.deleteRange(start!, end!);
  }
  mergeCtx.insert(start! + 1, [
    {
      key: selectionId,
      type: 'anchor',
      dir: PointerDirection.None,
      expiration: expirationForSelection(),
    },
    {
      key: selectionId,
      type: 'focus',
      dir: PointerDirection.None,
      expiration: expirationForSelection(),
    },
  ]);
  const rtWithDeletions = reconstructRichText(mergeCtx.finalize());
  const finalRt = projectPointers(
    docToRT(document),
    rtWithDeletions,
    (ptr) => ptr.key !== selectionId,
  );
  return docFromRT(finalRt);
}
