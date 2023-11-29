import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import React from 'react';
import {
  ElementNode,
  TextNode,
  dfs,
  initRichText,
  isElementNode,
  isTextNode,
} from '../cfds/richtext/tree.ts';
import { RichTextRenderer } from '../cfds/richtext/react.tsx';
import { docFromRT, docToRT } from '../cfds/richtext/doc-state.ts';
import { Document } from '../cfds/richtext/doc-state.ts';
import { assert } from '../base/error.ts';
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
  const result = coreValueClone(document);
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
    };
  } else {
    const textNode = selection.focus.node;
    const text = textNode.text;
    textNode.text =
      text.substring(0, selection.focus.offset) +
      (event.data || '') +
      text.substring(selection.focus.offset);
    selection.anchor.offset += event.data!.length;
    selection.focus.offset += event.data!.length;
  }

  return result;
}

function handleDeleteEvent(
  document: Document,
  event: InputEvent,
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
  debugger;
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
    return handleDeleteEvent(document, event, selectionId);
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
    if (selection) {
      selection.removeAllRanges();
      const range = document.createRange();
      if (anchorRef.current) {
        range.setStart(
          anchorRef.current.childNodes[0],
          state.ranges![selectionId].anchor.offset
        );
      }
      const focusNode =
        focusRef.current ||
        (selection.anchorNode === selection.focusNode
          ? anchorRef.current
          : null);
      if (focusNode) {
        range.setEnd(
          focusNode.childNodes[0],
          state.ranges![selectionId].focus.offset
        );
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
            ? selectionAnchorNode.parentNode
            : selectionAnchorNode
          ).dataset.ovvKey
        );
        const selectionFocusNode = selection.focusNode || selection.anchorNode;
        const focusNode = state.nodeKeys.nodeFromKey(
          (selectionFocusNode instanceof Text
            ? selectionFocusNode.parentNode
            : selectionFocusNode
          ).dataset.ovvKey
        );
        if (anchorNode && focusNode) {
          if (!state.ranges) {
            state.ranges = {};
          }
          state.ranges[selectionId] = {
            anchor: {
              node: anchorNode as TextNode,
              offset: selection.anchorOffset,
            },
            focus: {
              node: focusNode as TextNode,
              offset: selection.focusOffset,
            },
          };
          setState(coreValueClone(state));
        }
      }
    } catch (err: unknown) {
      debugger;
    }
  }, [state]);

  // debugger;
  return (
    <div
      className={cn(styles.contentEditable)}
      contentEditable
      onBeforeInput={(event) => {
        // debugger;
        const inputType = (event.nativeEvent as InputEvent).inputType;
        // console.log(event.nativeEvent);
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
