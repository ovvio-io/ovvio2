import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import React from 'react';
import {
  ElementNode,
  Pointer,
  PointerDirection,
  TextNode,
  dfs,
  initRichText,
  isElementNode,
  isTextNode,
} from '../cfds/richtext/tree.ts';
import { RichTextRenderer } from '../cfds/richtext/react.tsx';
import { docFromRT, docToRT } from '../cfds/richtext/doc-state.ts';
import { Document } from '../cfds/richtext/doc-state.ts';
import { coreValueClone } from '../base/core-types/clone.ts';
import { useTrustPool } from '../auth/react.tsx';
import { makeStyles, cn } from '../styles/css-objects/index.ts';
import { MergeContext } from '../cfds/richtext/merge-context.ts';
import {
  filteredPointersRep,
  flattenRichText,
  IndexedPointerValue,
  projectPointers,
  reconstructRichText,
} from '../cfds/richtext/flat-rep.ts';

const useStyles = makeStyles((theme) => ({
  contentEditable: {
    width: '100%',
    height: '100%',
  },
}));

const DELETE_INPUT_TYPES = [
  'deleteContentBackward',
  'deleteContent',
  'deleteContentForward',
] as const;

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

function handleInsertTextInputEvent(
  document: Document,
  event: InputEvent,
  selectionId: string
): Document {
  if (event.data === '\n') {
    console.log('newline');
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
    textNode.text += event.data;
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
      (event.data || '') +
      text.substring(selection.focus.offset);
    if (
      selection.anchor.node !== selection.focus.node ||
      selection.anchor.offset !== selection.focus.offset
    ) {
      result = deleteCurrentSelection(result, selectionId);
      selection = (result.ranges && result.ranges[selectionId])!;
    }
    selection.anchor.offset += event.data!.length;
    selection.focus.offset += event.data!.length;
  }

  return result;
}

function deleteCurrentSelection(
  document: Document,
  selectionId: string
): Document {
  let selection = document.ranges && document.ranges[selectionId];
  if (!selection) {
    return document;
  }
  const pointers: IndexedPointerValue[] = [];
  const mergeCtx = new MergeContext(
    Array.from(
      filteredPointersRep(
        flattenRichText(docToRT(document), true),
        (ptr) => {
          return true;
        },
        pointers
      )
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
    // if (selection.anchor.node.text.length === selection.anchor.offset) {
    if (start! > 0) {
      mergeCtx.delete(start! - 1);
    }
    // } else {
    //   mergeCtx.delete(start!);
    // }
  } else {
    mergeCtx.deleteRange(start!, end!);
  }
  const rtWithDeletions = reconstructRichText(mergeCtx.finalize());
  const finalRt = projectPointers(
    docToRT(document),
    rtWithDeletions,
    () => true
  );
  return docFromRT(finalRt);
}

function handleTextInputEvent(
  document: Document,
  event: InputEvent,
  selectionId: string
): Document {
  if (event.type === 'textInput') {
    return handleInsertTextInputEvent(document, event, selectionId);
  }
  if ((DELETE_INPUT_TYPES as readonly string[]).includes(event.inputType)) {
    return deleteCurrentSelection(document, selectionId);
  }
  console.log(event.type);
  return document;
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
      if (cfdsRange.dir === PointerDirection.Backward) {
        // if (
        //   anchorNode instanceof Text &&
        //   desiredStartOffset === anchorNode.data.length
        // ) {
        //   const parent = anchorNode.parentNode!;
        //   const indexInParent = Array.from(parent.childNodes).indexOf(
        //     anchorNode
        //   );
        //   anchorNode = parent as unknown as ChildNode;
        //   desiredStartOffset = indexInParent - 1;
        // }
        range.setEnd(anchorNode, desiredStartOffset);
        offsetShift = range.endOffset - desiredStartOffset;
      } else {
        // if (
        //   anchorNode instanceof Text &&
        //   desiredStartOffset === anchorNode.data.length
        // ) {
        //   debugger;
        //   const parent = anchorNode.parentNode!;
        //   const indexInParent = Array.from(parent.childNodes).indexOf(
        //     anchorNode
        //   );
        //   anchorNode = parent as unknown as ChildNode;
        //   desiredStartOffset = indexInParent + 1;
        // }
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
      if (focusNode) {
        if (cfdsRange.dir === PointerDirection.Backward) {
          let offset = state.ranges![selectionId].focus.offset + offsetShift;
          if (focusNode instanceof Text && offset === focusNode.data.length) {
            const parent = focusNode.parentNode!;
            const indexInParent = Array.from(parent.childNodes).indexOf(
              focusNode
            );
            focusNode = parent as unknown as ChildNode;
            offset = indexInParent - 1;
          }
          range.setStart(focusNode, offset);
        } else {
          let offset = state.ranges![selectionId].focus.offset + offsetShift;
          // if (focusNode instanceof Text && offset === focusNode.data.length) {
          //   const parent = focusNode.parentNode!;
          //   const indexInParent = Array.from(parent.childNodes).indexOf(
          //     focusNode
          //   );
          //   focusNode = parent as unknown as ChildNode;
          //   offset = indexInParent + 1;
          // }
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
          (selectionAnchorNode instanceof Text
            ? selectionAnchorNode.parentNode!
            : selectionAnchorNode
          ).dataset.ovvKey
        );
        const selectionFocusNode = selection.focusNode || selection.anchorNode;
        const focusNode = state.nodeKeys.nodeFromKey(
          (selectionFocusNode instanceof Text
            ? selectionFocusNode.parentNode!
            : selectionFocusNode
          ).dataset.ovvKey
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

  return (
    <div
      className={cn(styles.contentEditable)}
      contentEditable
      onBeforeInput={(event) => {
        const inputType = (event.nativeEvent as InputEvent).inputType;
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
      onInput={(event) => {
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
    >
      <RichTextRenderer
        doc={state}
        selectionId={selectionId}
        anchorRef={anchorRef}
        focusRef={focusRef}
      />
    </div>
  );
}
