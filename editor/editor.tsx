import React, {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useEffect,
} from 'react';
import {
  ElementNode,
  PointerDirection,
  TextNode,
  dfs,
  initRichText,
  initRichTextRoot,
  isElementNode,
  isTextNode,
  pathForNode,
} from '../cfds/richtext/tree.ts';
import { renderRichText } from '../cfds/richtext/react.tsx';
import { docFromRT, docToRT } from '../cfds/richtext/doc-state.ts';
import { Document } from '../cfds/richtext/doc-state.ts';
import { coreValueClone } from '../base/core-types/clone.ts';
import { useTrustPool } from '../auth/react.tsx';
import { makeStyles, cn } from '../styles/css-objects/index.ts';
import { MergeContext } from '../cfds/richtext/merge-context.ts';
import {
  DepthMarker,
  filteredPointersRep,
  FlatRepAtom,
  flattenRichText,
  IndexedPointerValue,
  isDepthMarker,
  kElementSpacer,
  PointerValue,
  projectPointers,
  reconstructRichText,
} from '../cfds/richtext/flat-rep.ts';
import { applyShortcuts } from '../cfds/richtext/shortcuts.ts';
import { normalizeRichText } from '../cfds/richtext/normalize/index.ts';
import { STICKY_ELEMENT_TAGS } from '../cfds/richtext/model.ts';
import { assert } from '../base/error.ts';
import { coreValueEquals } from '../base/core-types/equals.ts';

const useStyles = makeStyles((theme) => ({
  contentEditable: {
    width: '100%',
    height: '100%',
    whiteSpace: 'pre-wrap',
    padding: '10px',
  },
}));

const DELETE_INPUT_TYPES = [
  'deleteContentBackward',
  'deleteContent',
  'deleteContentForward',
] as const;

const EMPTY_DOCUMENT_ROOT = initRichTextRoot();

function findEndOfDocument(document: Document): TextNode | ElementNode {
  let lastTextNode: TextNode | undefined;
  let lastParent: ElementNode = document.root;
  for (const [node] of dfs(document.root)) {
    if (isTextNode(node)) {
      lastTextNode = node;
    } else if (isElementNode(node)) {
      lastParent = node;
    }
  }
  return lastTextNode || lastParent;
}

function handleNewline(document: Document, selectionId: string): Document {
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

  const isAtEndOfElement = isDepthMarker(mergeCtx.origValues[end! + 1]);
  const isEmptyElement =
    isAtEndOfElement && isDepthMarker(mergeCtx.at(end! - 1));
  debugger;
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
  const prevElementIsSticky =
    prevElement && STICKY_ELEMENT_TAGS.includes(prevElement.tagName as string);

  const focusPath = pathForNode(document.root, selection.focus.node);
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
    const atomsToInsert: FlatRepAtom[] = [
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
    mergeCtx.insert(end!, atomsToInsert);
  }

  const rtWithDeletions = reconstructRichText(mergeCtx.finalize());
  const finalRt = projectPointers(
    docToRT(document),
    rtWithDeletions,
    (ptr) => ptr.key !== selectionId
  );
  return docFromRT(finalRt);
}

function handleInsertTextInputEvent(
  document: Document,
  event: InputEvent | KeyboardEvent,
  selectionId: string
): Document {
  let insertData = '';
  if (event instanceof KeyboardEvent) {
    insertData = event.key;
  } else {
    insertData = event.data || '';
  }
  if (!insertData.length) {
    return document;
  }
  if (insertData === '\n') {
    return handleNewline(document, selectionId);
  }
  let result = coreValueClone(document);
  let selection = result.ranges && result.ranges[selectionId];
  if (!selection) {
    const lastNode = findEndOfDocument(result);
    let textNode: TextNode;
    if (isElementNode(lastNode)) {
      textNode = { text: '' };
      lastNode.children.push(textNode);
    } else {
      textNode = lastNode;
    }
    textNode.text += insertData;
    if (!result.ranges) {
      result.ranges = {};
    }
    result.ranges[selectionId] = {
      anchor: {
        node: textNode,
        offset: textNode.text.length,
      },
      focus: {
        node: textNode,
        offset: textNode.text.length,
      },
      dir: PointerDirection.None,
    };
  } else {
    const textNode = selection.focus.node;
    const text = textNode.text;
    textNode.text =
      text.substring(0, selection.focus.offset) +
      insertData +
      text.substring(selection.focus.offset);
    if (
      selection.anchor.node !== selection.focus.node ||
      selection.anchor.offset !== selection.focus.offset
    ) {
      result = deleteCurrentSelection(result, selectionId);
      selection = (result.ranges && result.ranges[selectionId])!;
    }
    selection.anchor.offset += insertData.length;
    selection.focus.offset += insertData.length;
  }

  // Run any shortcuts
  result = docFromRT(
    reconstructRichText(applyShortcuts(flattenRichText(docToRT(result), true)))
  );
  return result;
}

function deleteCurrentSelection(
  document: Document,
  selectionId: string
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
  if (start === end) {
    start = start!;
    const prevAtom = mergeCtx.at(start - 1);
    if (isDepthMarker(prevAtom)) {
      mergeCtx.deleteRange(start - 4, start);

      const path = pathForNode(document.root, selection.anchor.node);
      assert(path !== undefined);
      if (path.length > 1) {
        const parent = path[path.length - 2];
        const childIndex = parent.children.indexOf(path[path.length - 1]);
        const newDepth = prevAtom.depthMarker - 1;
        if (childIndex === 0) {
          mergeCtx.delete(start - 5);
          mergeCtx.insert(start - 5, [
            { tagName: 'p', children: [] },
            { depthMarker: newDepth },
          ]);
          mergeCtx.insert(start + 1, [
            { depthMarker: newDepth - 1 },
            kElementSpacer,
            { ...parent, children: [] },
            { depthMarker: newDepth },
          ]);
        }
      }
    } else {
      mergeCtx.delete(start - 1);
    }
  } else {
    mergeCtx.deleteRange(start!, end!);
  }
  const rtWithDeletions = normalizeRichText(
    reconstructRichText(mergeCtx.finalize())
  );
  const finalRt = projectPointers(
    docToRT(document),
    rtWithDeletions,
    () => true
  );
  return docFromRT(finalRt);
}

function handleTextInputEvent(
  document: Document,
  event: InputEvent | KeyboardEvent,
  selectionId: string
): Document {
  if (event instanceof KeyboardEvent) {
    if (event.code === 'Space') {
      return handleInsertTextInputEvent(document, event, selectionId);
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      return deleteCurrentSelection(document, selectionId);
    }
  } else {
    if (event.type === 'textInput') {
      return handleInsertTextInputEvent(document, event, selectionId);
    }
    if ((DELETE_INPUT_TYPES as readonly string[]).includes(event.inputType)) {
      return deleteCurrentSelection(document, selectionId);
    }
  }
  console.log(event.type);
  debugger;
  return document;
}

function handleTabPressed(
  doc: Document,
  event: KeyboardEvent,
  selectionId: string
): Document | undefined {
  const selection = doc.ranges && doc.ranges[selectionId];
  if (!selection || selection.anchor.node !== selection.focus.node) {
    return;
  }
  const path = pathForNode(doc.root, selection.anchor.node);
  if (!path || path.length < 2) {
    return;
  }
  const parent = path[path.length - 1];
  if (parent.tagName === 'li') {
    const grandParent = path[path.length - 2];
    const liIndex = grandParent.children.indexOf(parent);
    if (event.shiftKey) {
      if (path.length === 2) {
        const idx = doc.root.children.indexOf(grandParent);
        doc.root.children[idx] = {
          tagName: 'p',
          children: parent.children,
        };
      } else {
        // const grandGrandParent = path[path.length - 3];
        // const idx = grandGrandParent.children.indexOf(grandParent);
        // grandGrandParent.children[idx]
        const mergeCtx = new MergeContext(flattenRichText(docToRT(doc), true));
        debugger;
      }
    } else {
      grandParent.children[liIndex] = {
        ...grandParent,
        children: [parent],
      };
    }
    return coreValueClone(doc);
  }
}

export function Editor() {
  const [state, setState] = useState(docFromRT(initRichText()));
  const trustPool = useTrustPool();
  const selectionId = trustPool.currentSession.id;
  const anchorRef = useRef<HTMLElement>(null);
  const focusRef = useRef<HTMLElement>(null);
  const styles = useStyles();

  useLayoutEffect(() => {
    const selection = getSelection();
    // try {
    //   if (
    //     state.ranges![selectionId].focus.offset !=
    //     state.ranges![selectionId].anchor.offset
    //   )
    //     debugger;
    // } catch (_: unknown) {}
    if (selection) {
      selection.removeAllRanges();
      if (!state.ranges || !state.ranges[selectionId]) {
        return;
      }
      const cfdsRange = state.ranges[selectionId];
      const range = document.createRange();
      let offsetShift = 0;
      let desiredStartOffset = cfdsRange.anchor.offset;
      const origAnchorNode =
        anchorRef.current?.childNodes[0] ||
        anchorRef.current ||
        focusRef.current?.childNodes[0] ||
        focusRef.current;
      if (!origAnchorNode) {
        return;
      }
      let anchorNode = origAnchorNode;
      if (anchorNode instanceof Text && anchorNode.data.length === 0) {
        const newAnchor = anchorNode.parentNode as unknown as ChildNode;
        const origAnchorIdx = Array.from(newAnchor.childNodes).indexOf(
          anchorNode
        );
        if (cfdsRange.dir === PointerDirection.Backward) {
          desiredStartOffset = origAnchorIdx + 1;
        } else {
          desiredStartOffset = origAnchorIdx - 1;
        }
        anchorNode = newAnchor;
      }
      if (cfdsRange.dir === PointerDirection.Backward) {
        range.setEnd(anchorNode, desiredStartOffset);
        offsetShift = range.endOffset - desiredStartOffset;
      } else {
        range.setStart(anchorNode, desiredStartOffset);
        offsetShift = range.startOffset - desiredStartOffset;
      }

      let focusNode: ChildNode | null = null;
      if (focusRef.current) {
        focusNode = focusRef.current.childNodes[0] || focusRef.current;
      }
      if (!focusNode) {
        focusNode = origAnchorNode;
      }
      if (focusNode instanceof Text && focusNode.data.length === 0) {
        focusNode = focusNode.parentNode as unknown as ChildNode;
      }
      if (focusNode) {
        if (cfdsRange.dir === PointerDirection.Backward) {
          const offset = state.ranges![selectionId].focus.offset + offsetShift;
          if (focusNode instanceof Text && offset === focusNode.data.length) {
            const parent = focusNode.parentNode!;
            const indexInParent = Array.from(parent.childNodes).indexOf(
              focusNode
            );
            focusNode = parent as unknown as ChildNode;
            if (cfdsRange.dir === PointerDirection.Backward) {
              desiredStartOffset = indexInParent - 1;
            } else {
              desiredStartOffset = indexInParent + 1;
            }
          }
          range.setStart(focusNode, offset);
        } else {
          const offset = state.ranges![selectionId].focus.offset + offsetShift;
          range.setEnd(focusNode, offset);
        }
      }
      selection.addRange(range);
    }
  }, [anchorRef, focusRef, selectionId, state]);

  const onSelectionChanged = useCallback(() => {
    const selection = getSelection();
    if (!selection) {
      const doc = coreValueClone(state);
      if (doc.ranges && doc.ranges[selectionId]) {
        delete doc.ranges[selectionId];
        setState(doc);
      }
      return;
    }
    try {
      const selectionAnchorNode = selection.anchorNode;
      if (selectionAnchorNode) {
        const anchorNode = state.nodeKeys.nodeFromKey(
          (
            (selectionAnchorNode instanceof Text
              ? selectionAnchorNode.parentNode!
              : selectionAnchorNode) as HTMLElement
          ).dataset.ovvKey!
        );
        const selectionFocusNode = selection.focusNode || selection.anchorNode;
        const focusNode = state.nodeKeys.nodeFromKey(
          (
            (selectionFocusNode instanceof Text
              ? selectionFocusNode.parentNode!
              : selectionFocusNode) as HTMLElement
          ).dataset.ovvKey!
        );
        if (anchorNode || focusNode) {
          if (!state.ranges) {
            state.ranges = {};
          }
          state.ranges[selectionId] = {
            anchor: {
              node: (anchorNode || focusNode) as TextNode,
              offset: selection.anchorOffset,
            },
            focus: {
              node: (focusNode || anchorNode) as TextNode,
              offset: selection.focusOffset,
            },
            dir: PointerDirection.None,
          };
          const result = docFromRT(docToRT(state));
          setState(result);
        }
      }
    } catch (err: unknown) {
      debugger;
    }
  }, [state]);

  const contents = renderRichText({
    doc: state,
    selectionId: selectionId,
    anchorRef: anchorRef,
    focusRef: focusRef,
  });

  return (
    <div
      className={cn(styles.contentEditable)}
      contentEditable={true}
      suppressContentEditableWarning={true}
      onBeforeInput={(event) => {
        event.stopPropagation();
        event.preventDefault();
        setState(
          handleTextInputEvent(
            state,
            event.nativeEvent as InputEvent,
            selectionId
          )
        );
        return false;
      }}
      onSelect={onSelectionChanged}
      onKeyDown={(event) => {
        if (event.key === 'Backspace' || event.key === 'Delete') {
          event.stopPropagation();
          event.preventDefault();
          setState(handleTextInputEvent(state, event.nativeEvent, selectionId));
          return false;
        }
        if (event.key === 'Tab') {
          const doc = handleTabPressed(state, event.nativeEvent, selectionId);
          if (doc) {
            event.stopPropagation();
            event.preventDefault();
            setState(doc);
          }
          return false;
        }
      }}
    >
      {contents}
    </div>
  );
}
