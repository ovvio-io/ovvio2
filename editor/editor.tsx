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
import { docFromRT } from '../cfds/richtext/doc-state.ts';
import { Document } from '../cfds/richtext/doc-state.ts';
import { assert } from '../base/error.ts';
import { coreValueClone } from '../base/core-types/clone.ts';
import { useTrustPool } from '../auth/react.tsx';

type InputType = 'textInput';

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
  const result = coreValueClone(document);
  let selection = result.ranges && result.ranges[selectionId];
  debugger;
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
    selection.focus.offset += event.data!.length + 1;
  }

  return result;
}

function handleTextInputEvent(
  document: Document,
  event: InputEvent,
  selectionId: string
): Document {
  switch (event.type as InputType) {
    case 'textInput':
      return handleInsertTextInputEvent(document, event, selectionId);

    default:
      return document;
  }
}

export function Editor() {
  const [state, setState] = useState(docFromRT(initRichText()));
  const trustPool = useTrustPool();
  const selectionId = trustPool.currentSession.id;
  const anchorRef = useRef<HTMLElement>(null);
  const focusRef = useRef<HTMLElement>(null);

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
      if (focusRef.current) {
        range.setEnd(
          focusRef.current.childNodes[0],
          state.ranges![selectionId].focus.offset
        );
      }
      selection.addRange(range);
    }
  }, [anchorRef, focusRef, selectionId, state]);

  const onSelectionChanged = useCallback(() => {
    const selection = getSelection();
    // debugger;
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
      contentEditable
      onBeforeInput={(event) => {
        // debugger;
        const inputType = (event.nativeEvent as InputEvent).inputType;
        console.log(event.nativeEvent);
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
