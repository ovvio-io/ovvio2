import { docToRT, docFromRT } from '../cfds/richtext/doc-state.ts';
import {
  IndexedPointerValue,
  filteredPointersRep,
  flattenRichText,
  DepthMarker,
  isDepthMarker,
  kElementSpacer,
  reconstructRichText,
  projectPointers,
  FlatRepAtom,
  PointerValue,
} from '../cfds/richtext/flat-rep.ts';
import { MergeContext } from '../cfds/richtext/merge-context.ts';
import { STICKY_ELEMENT_TAGS } from '../cfds/richtext/model.ts';
import {
  ElementNode,
  isElementNode,
  pathToNode,
  PointerDirection,
} from '../cfds/richtext/tree.ts';
import { Document } from '../cfds/richtext/doc-state.ts';
import { uniqueId } from '../base/common.ts';

export function handleNewline(
  document: Document,
  selectionId: string
): Document {
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
      pointers
    )
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
  if (start != end) {
    mergeCtx.deleteRange(start!, end!);
  }

  let prevElement: ElementNode | undefined;
  let prevDepthMarker: DepthMarker | undefined;
  let idx = 0;
  for (const atom of mergeCtx.finalize()) {
    if (isElementNode(atom)) {
      prevElement = atom;
    } else if (isDepthMarker(atom)) {
      prevDepthMarker = atom;
    }
    if (++idx === end!) {
      break;
    }
  }

  if (prevElement !== undefined) {
    const taskNode = pathToNode(document.root, prevElement)?.find(
      (node) => node.tagName === 'ref'
    );
    if (taskNode) {
    }
  }

  const isAtEndOfElement = isDepthMarker(mergeCtx.origValues[end! + 1]);
  const isEmptyElement =
    isAtEndOfElement && isDepthMarker(mergeCtx.at(end! - 1));
  // Special case: newline at the beginning of an element.
  if (!isEmptyElement && isDepthMarker(mergeCtx.at(end! - 1))) {
    mergeCtx.insert(end! - 3, [
      kElementSpacer,
      { tagName: 'p', children: [] },
      { depthMarker: 1 },
      { text: '' },
      { depthMarker: 0 },
    ]);
    const rtWithDeletions = reconstructRichText(mergeCtx.finalize());
    const finalRt = projectPointers(
      docToRT(document),
      rtWithDeletions,
      (ptr) => true
    );
    return docFromRT(finalRt);
  }
  let didSetSelection = false;
  const prevElementIsSticky =
    prevElement && STICKY_ELEMENT_TAGS.includes(prevElement.tagName as string);
  const focusPath = pathToNode(document.root, selection.focus.node);
  const isStartOfDocument =
    document.root.children[0] === (focusPath && focusPath[0]);
  let startDepth = prevDepthMarker ? prevDepthMarker.depthMarker - 1 : 0;
  if (isEmptyElement && prevElement?.tagName !== 'p') {
    startDepth = 0;
    // When clearing the beginning of the document, create a paragraph instead

    const origValues = mergeCtx.origValues;
    const emptyElementDepth = mergeCtx.at<DepthMarker>(end! - 1)!.depthMarker;
    mergeCtx.deleteRange(end! - 3, end! + 1);
    for (let idx = end! - 4; idx >= 0; --idx) {
      const atom = origValues[idx];
      if (
        isDepthMarker(atom) &&
        (atom.depthMarker <= 0 || atom.depthMarker >= emptyElementDepth - 1)
      ) {
        break;
      }
      mergeCtx.delete(idx);
    }
  }
  if (isStartOfDocument || !isEmptyElement || prevElement?.tagName === 'p') {
    let atomsToInsert: FlatRepAtom[] = [
      {
        depthMarker: startDepth,
      },
      kElementSpacer,
      ((prevElementIsSticky && !isEmptyElement) || !isAtEndOfElement) &&
      prevElement
        ? prevElement
        : {
            children: [],
            tagName: 'p',
          },
      {
        depthMarker: startDepth + 1,
      },
      {
        key: selectionId,
        type: 'anchor',
        dir: PointerDirection.None,
      } as PointerValue,
      {
        key: selectionId,
        type: 'focus',
        dir: PointerDirection.None,
      } as PointerValue,
    ];
    // If we're dealing with an empty element, we must add an extra empty text
    // node so we don't make it empty (thus causing it to be deleted at a later
    // normalization pass).
    if (isAtEndOfElement && isDepthMarker(mergeCtx.at(end! - 1))) {
      atomsToInsert.splice(0, 0, { text: '' });
    }

    if (prevElement !== undefined) {
      const taskNode = pathToNode(document.root, prevElement)?.find(
        (node) => node.tagName === 'ref'
      );
      if (taskNode) {
        atomsToInsert = (
          [
            { depthMarker: 0 },
            kElementSpacer,
            {
              tagName: 'ref',
              ref: uniqueId(),
              type: 'inter-doc',
            },
          ] as FlatRepAtom[]
        ).concat(atomsToInsert);
      }
    }
    mergeCtx.insert(end!, atomsToInsert);
    didSetSelection = true;
  }

  const rtWithDeletions = reconstructRichText(mergeCtx.finalize());
  const finalRt = projectPointers(
    docToRT(document),
    rtWithDeletions,
    (ptr) => !didSetSelection || ptr.key !== selectionId
  );
  return docFromRT(finalRt);
}
