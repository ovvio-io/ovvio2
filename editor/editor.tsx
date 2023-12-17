import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  dfs,
  isElementNode,
  isTextNode,
  pathToNode,
  PointerDirection,
  TextNode,
} from '../cfds/richtext/tree.ts';
import {
  domIdFromNodeKey,
  RenderContext,
  RichTextRenderer,
} from '../cfds/richtext/react.tsx';
import {
  docClone,
  docFromRT,
  docToRT,
  findEndOfDocument,
} from '../cfds/richtext/doc-state.ts';
import { Document } from '../cfds/richtext/doc-state.ts';
import { cn, makeStyles } from '../styles/css-objects/index.ts';
import { resolveWritingDirection } from '../base/string.ts';
import { Note } from '../cfds/client/graph/vertices/note.ts';
import { usePartialVertex } from '../web-app/src/core/cfds/react/vertex.ts';
import { brandLightTheme as theme } from '../styles/theme.tsx';
import { styleguide } from '../styles/styleguide.ts';
import { Repository } from '../repo/repo.ts';
import { useGraphManager } from '../web-app/src/core/cfds/react/graph.tsx';
import LoadingView from '../web-app/src/app/loading-view.tsx';
import { handleInsertTextInputEvent } from './insert.ts';
import { deleteCurrentSelection } from './delete.ts';
import { notReached } from '../base/error.ts';
import { VertexManager } from '../cfds/client/graph/vertex-manager.ts';
import { findFirstTextNode } from '../cfds/richtext/utils.ts';
import { kMinuteMs, kSecondMs } from '../base/date.ts';
import { coreValueEquals } from '../base/core-types/equals.ts';
import { prettyJSON, uniqueId } from '../base/common.ts';
import { EditorHeader, HEADER_HEIGHT } from './header.tsx';
import { useUndoContext } from './undo.ts';

const useStyles = makeStyles(() => ({
  mainContainer: {
    height: '100%',
    width: '100%',
  },
  header: {
    height: HEADER_HEIGHT,
    width: '100%',
    borderBottom: '1px solid',
    borderColor: theme.mono.m1,
    overflow: 'hidden',
  },
  headerMainActions: {
    position: 'absolute',
    right: styleguide.gridbase * 3,
    top: styleguide.gridbase * 3,
    display: 'flex',
    justifyContent: 'flex-end',
    width: styleguide.gridbase * 7,
  },
  headerMainActionButton: {
    cursor: 'pointer',
  },
  titleInput: {
    display: 'block',
    marginLeft: 'auto',
    marginRight: 'auto',
    marginTop: styleguide.gridbase * 14,
    height: styleguide.gridbase * 3,
    width: styleguide.gridbase * 40,
    outline: 'none',
    fontFamily: 'Poppins',
    fontSize: '30px',
    fontWeight: '600',
    lineHeight: styleguide.gridbase * 3,
    textAlign: 'center',
    border: 'none',
    cursor: 'text',
    whiteSpace: 'pre-wrap',
  },
  contentEditable: {
    width: '100%',
    height: `calc(100% - ${HEADER_HEIGHT}px)`,
    whiteSpace: 'pre-wrap',
    padding: styleguide.gridbase * 11,
    outline: 'none',
    cursor: 'text',
    boxSizing: 'border-box',
    overflowY: 'scroll',
    scrollBehavior: 'instant',
  },
}));

const DELETE_INPUT_TYPES = [
  'deleteContentBackward',
  'deleteContent',
  'deleteContentForward',
] as const;

export const SELECTION_TTL_MS = 10 * kSecondMs;
export function expirationForSelection(): Date {
  const d = new Date();
  d.setTime(d.getTime() + SELECTION_TTL_MS);
  return d;
}

function handleTextInputEvent(
  document: Document,
  event: InputEvent | KeyboardEvent | ClipboardEvent,
  selectionId: string,
): Document {
  if (event instanceof KeyboardEvent) {
    if (event.code === 'Space') {
      return handleInsertTextInputEvent(document, event, selectionId);
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      return deleteCurrentSelection(document, selectionId);
    }
  } else if (event instanceof ClipboardEvent) {
    return handleInsertTextInputEvent(document, event, selectionId);
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
  selectionId: string,
): Document | undefined {
  const selection = doc.ranges && doc.ranges[selectionId];
  if (!selection || selection.anchor.node !== selection.focus.node) {
    return;
  }
  const path = pathToNode(doc.root, selection.anchor.node);
  if (!path || path.length < 2) {
    return;
  }
  // const parent = path[path.length - 1];
  // if (parent.tagName === 'li') {
  //   const grandParent = path[path.length - 2];
  //   const liIndex = grandParent.children.indexOf(parent);
  //   if (event.shiftKey) {
  //     if (path.length === 2) {
  //       const idx = doc.root.children.indexOf(grandParent);
  //       doc.root.children[idx] = {
  //         tagName: 'p',
  //         children: parent.children,
  //       };
  //     } else {
  //       // const grandGrandParent = path[path.length - 3];
  //       // const idx = grandGrandParent.children.indexOf(grandParent);
  //       // grandGrandParent.children[idx]
  //       const mergeCtx = new MergeContext(flattenRichText(docToRT(doc), true));
  //       debugger;
  //     }
  //   } else {
  //     grandParent.children[liIndex] = {
  //       ...grandParent,
  //       children: [parent],
  //     };
  //   }
  //   return coreValueClone(doc);
  // }
}
function setBrowserSelectionToDocument(
  ctx: RenderContext,
  editorDivNode: HTMLDivElement | undefined | null,
): void {
  const selection = getSelection();
  if (!editorDivNode || document.activeElement !== editorDivNode) {
    return;
  }
  // try {
  //   if (
  //     state.ranges![selectionId].focus.offset !=
  //     state.ranges![selectionId].anchor.offset
  //   )
  //     debugger;
  // } catch (_: unknown) {}
  if (selection) {
    const state = ctx.doc;
    const selectionId = ctx.selectionId;
    if (!state.ranges || !state.ranges[selectionId]) {
      if (selection.type !== 'None') {
        selection.removeAllRanges();
      }
      return;
    }
    const cfdsRange = state.ranges[selectionId];
    const range = document.createRange();
    let offsetShift = 0;
    let desiredStartOffset = cfdsRange.anchor.offset;
    const origAnchorNode: HTMLElement | null | undefined = document
      .getElementById(domIdFromNodeKey(ctx, cfdsRange.anchor.node));
    if (!origAnchorNode) {
      return;
    }
    let anchorNode = origAnchorNode;
    if (anchorNode instanceof Text && anchorNode.data.length === 0) {
      const newAnchor = anchorNode.parentNode as unknown as ChildNode;
      const origAnchorIdx = Array.from(newAnchor.childNodes).indexOf(
        anchorNode,
      );
      if (cfdsRange.dir === PointerDirection.Backward) {
        desiredStartOffset = origAnchorIdx + 1;
      } else {
        desiredStartOffset = origAnchorIdx - 1;
      }
      anchorNode = newAnchor as HTMLElement;
    }
    const realAnchorNode = anchorNode.childNodes.length > 0
      ? anchorNode.childNodes[0]
      : anchorNode;
    if (cfdsRange.dir === PointerDirection.Backward) {
      range.setEnd(realAnchorNode, desiredStartOffset);
      offsetShift = range.endOffset - desiredStartOffset;
    } else {
      range.setStart(realAnchorNode, desiredStartOffset);
      offsetShift = range.startOffset - desiredStartOffset;
    }

    let focusNode: ChildNode | null = document.getElementById(
      domIdFromNodeKey(ctx, cfdsRange.focus.node),
    );
    if (!focusNode) {
      focusNode = origAnchorNode;
    }
    if (focusNode instanceof Text && focusNode.data.length === 0) {
      focusNode = focusNode.parentNode as unknown as ChildNode;
    }
    if (focusNode) {
      const realFocusNode = focusNode.childNodes.length > 0
        ? focusNode.childNodes[0]
        : focusNode;
      if (cfdsRange.dir === PointerDirection.Backward) {
        const offset = state.ranges![selectionId].focus.offset + offsetShift;
        if (focusNode instanceof Text && offset === focusNode.data.length) {
          const parent = focusNode.parentNode!;
          const indexInParent = Array.from(parent.childNodes).indexOf(
            focusNode,
          );
          focusNode = parent as unknown as ChildNode;
          if (cfdsRange.dir === PointerDirection.Backward) {
            desiredStartOffset = indexInParent - 1;
          } else {
            desiredStartOffset = indexInParent + 1;
          }
        }
        range.setStart(realFocusNode, offset);
      } else {
        const offset = state.ranges![selectionId].focus.offset + offsetShift;
        range.setEnd(realFocusNode, offset);
      }
    }
    if (
      selection.anchorNode !== range.startContainer ||
      selection.focusNode !== range.endContainer ||
      selection.anchorOffset !== range.startOffset ||
      selection.focusOffset !== range.endOffset
    ) {
      selection.removeAllRanges();
      selection.addRange(range);
      (
        selection.focusNode?.parentElement as Element | undefined
      )?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }
  }
}

export interface RichTextEditorProps {
  note: VertexManager<Note>;
  className?: string;
  ref?: React.RefObject<HTMLDivElement>;
}

export interface RichTextEditorRef {
  readonly contenteditable: HTMLDivElement | null;
}

export const RichTextEditor = forwardRef<
  RichTextEditorRef,
  RichTextEditorProps
>(function RichTextEditor({ note, className }: RichTextEditorProps, ref) {
  const partialNote = usePartialVertex(note, ['body', 'titlePlaintext']);
  const selectionId = note.graph.selectionId;
  const styles = useStyles();
  const baseDirection = resolveWritingDirection(partialNote.titlePlaintext);
  const editorDivRef = useRef<HTMLDivElement>(null);
  const [editorId] = useState(uniqueId());
  const ctx: RenderContext = useMemo<RenderContext>(() => {
    return {
      doc: partialNote.body,
      selectionId,
      editorId,
      baseDirection,
    };
  }, [partialNote, partialNote.body, selectionId, editorId, baseDirection]);
  const undoContext = useUndoContext(note, 'body', true);

  useImperativeHandle(
    ref,
    () => {
      return {
        get contenteditable() {
          return editorDivRef.current;
        },
      };
    },
    [editorDivRef.current],
  );

  useLayoutEffect(
    () => setBrowserSelectionToDocument(ctx, editorDivRef.current),
    [partialNote, selectionId, editorDivRef.current, ctx],
  );

  const onSelectionChanged = useCallback(
    (event: Event) => {
      const editorDivNode = editorDivRef.current;
      if (!editorDivNode || document.activeElement !== editorDivNode) {
        return;
      }
      const selection = getSelection();
      const state = docClone(note.getVertexProxy().body);
      if (!selection) {
        if (state.ranges && state.ranges[selectionId]) {
          delete state.ranges[selectionId];
          partialNote.body = state;
        }
        return;
      }
      try {
        const selectionAnchorNode = selection.anchorNode;
        if (!selectionAnchorNode) {
          setBrowserSelectionToDocument(ctx, editorDivRef.current);
          return;
        }
        let anchorNode = state.nodeKeys.nodeFromKey(
          (
            (selectionAnchorNode instanceof Text
              ? selectionAnchorNode.parentNode!
              : selectionAnchorNode) as HTMLElement
          ).dataset.ovvKey!,
        );
        if (!anchorNode) {
          setBrowserSelectionToDocument(ctx, editorDivRef.current);
          return;
        }
        const selectionFocusNode = selection.focusNode || selection.anchorNode;
        let focusNode = state.nodeKeys.nodeFromKey(
          (
            (selectionFocusNode instanceof Text
              ? selectionFocusNode.parentNode!
              : selectionFocusNode) as HTMLElement
          ).dataset.ovvKey!,
        );
        if (anchorNode || focusNode) {
          if (!state.ranges) {
            state.ranges = {};
          }
          let { anchorOffset, focusOffset } = selection;
          if (isElementNode(anchorNode)) {
            for (const [node] of dfs(anchorNode)) {
              if (isTextNode(node)) {
                if (focusNode === anchorNode) {
                  focusNode = node;
                  focusOffset = 0;
                }
                anchorNode = node;
                anchorOffset = 0;
                break;
              }
            }
          }
          if (isElementNode(focusNode)) {
            for (const [node] of dfs(focusNode)) {
              if (isTextNode(node)) {
                focusNode = node;
                focusOffset = 0;
                break;
              }
            }
          }
          if (!isTextNode(anchorNode)) {
            setBrowserSelectionToDocument(ctx, editorDivRef.current);
            return;
          }
          if (!isTextNode(focusNode)) {
            focusNode = anchorNode;
            focusOffset = anchorOffset;
          }
          state.ranges[selectionId] = {
            anchor: {
              node: anchorNode as TextNode,
              offset: anchorOffset,
            },
            focus: {
              node: focusNode as TextNode,
              offset: focusOffset,
            },
            dir: PointerDirection.None,
            expiration: expirationForSelection(),
          };
          const result = docFromRT(docToRT(state));
          if (coreValueEquals(note.getVertexProxy().body, result)) {
            setBrowserSelectionToDocument(ctx, editorDivRef.current);
          } else {
            note.getVertexProxy().body = result;
          }
        }
      } catch (err: unknown) {
        debugger;
      }
    },
    [note, ctx],
  );

  const onBeforeInput = useCallback(
    (event: React.FormEvent<HTMLDivElement>) => {
      const state = note.getVertexProxy().body;
      event.stopPropagation();
      event.preventDefault();
      const updatedBody = handleTextInputEvent(
        state,
        event.nativeEvent as InputEvent,
        selectionId,
      );
      note.getVertexProxy().body = updatedBody;
    },
    [note],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const state = note.getVertexProxy().body;
      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.stopPropagation();
        event.preventDefault();
        note.getVertexProxy().body = handleTextInputEvent(
          state,
          event.nativeEvent,
          selectionId,
        );
      }
      if (event.key === 'Tab') {
        const doc = handleTabPressed(state, event.nativeEvent, selectionId);
        if (doc) {
          event.stopPropagation();
          event.preventDefault();
          note.getVertexProxy().body = doc;
        }
      }
      if (
        event.key === 'z' &&
        (event.ctrlKey || event.metaKey)
      ) {
        event.stopPropagation();
        event.preventDefault();
        if (event.shiftKey) {
          undoContext.redo();
        } else {
          undoContext.undo();
        }
      }
    },
    [note, undoContext],
  );

  const onPaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      event.stopPropagation();
      event.preventDefault();
      const state = note.getVertexProxy().body;
      note.getVertexProxy().body = handleTextInputEvent(
        state,
        event.nativeEvent,
        selectionId,
      );
    },
    [note],
  );

  useEffect(() => {
    const editorDivNode = editorDivRef.current;
    if (!editorDivNode || document.activeElement !== editorDivNode) {
      return;
    }
    const timeoutId = setTimeout(() => {
      const proxy = note.getVertexProxy();
      const body = docClone(proxy.body);
      if (!body.ranges || !body.ranges[selectionId]) {
        return;
      }
      const selection = body.ranges[selectionId];
      selection.expiration = expirationForSelection();
      proxy.body = body;
    }, SELECTION_TTL_MS * 0.9);
    return () => clearTimeout(timeoutId);
  }, [editorDivRef.current]);

  useEffect(() => {
    document.addEventListener('selectionchange', onSelectionChanged);
    return () =>
      document.removeEventListener('selectionchange', onSelectionChanged);
  }, [onSelectionChanged]);

  return (
    <div
      id={editorId}
      ref={editorDivRef}
      className={cn(className, styles.contentEditable)}
      contentEditable={true}
      suppressContentEditableWarning={true}
      dir={baseDirection === 'rtl' ? 'rtl' : undefined}
      onBeforeInput={onBeforeInput}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
    >
      <RichTextRenderer ctx={ctx} onChange={(doc) => partialNote.body = doc} />
    </div>
  );
});

export interface NoteEditorProps {
  note?: VertexManager<Note>;
}

export interface NoteEditorURLParams
  extends Record<string, string | undefined> {
  workspaceId: string | undefined;
  noteId: string | undefined;
}

function NoteEditorInternal({ note }: Required<NoteEditorProps>) {
  const styles = useStyles();
  const editorRef = useRef<RichTextEditorRef>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const proxy = note.getVertexProxy();
    const selectionId = note.graph.selectionId;
    let body = proxy.body;
    if (body.ranges && body.ranges[selectionId]) {
      body = docClone(body);
      delete body.ranges![selectionId];
      proxy.body = body;
    }
  }, []);

  const onFocusOnEditor = useCallback(() => {
    const doc = docClone(note.getVertexProxy().body);
    const node = findEndOfDocument(doc);
    if (isTextNode(node)) {
      const selectionId = note.graph.selectionId;
      if (!doc.ranges) {
        doc.ranges = {};
      }
      doc.ranges[selectionId] = {
        anchor: {
          node,
          offset: node.text.length,
        },
        focus: {
          node,
          offset: node.text.length,
        },
        dir: PointerDirection.None,
        expiration: expirationForSelection(),
      };
      note.getVertexProxy().body = doc;
    }
    editorRef.current?.contenteditable?.focus();
  }, [editorRef.current?.contenteditable]);

  return (
    <div className={cn(styles.mainContainer)} key='EditorContainer'>
      <EditorHeader
        key='EditorHeader'
        note={note}
        onFocusOnEditor={onFocusOnEditor}
      />
      <RichTextEditor key='EditorBody' ref={editorRef} note={note} />
    </div>
  );
}

export function NoteEditor({ note }: NoteEditorProps) {
  const styles = useStyles();
  const params = useParams<NoteEditorURLParams>();
  const repoId = note
    ? note.repositoryId
    : params.workspaceId
    ? Repository.id('data', params.workspaceId)
    : undefined;
  const graph = useGraphManager();
  const [repoLoaded, setRepoLoaded] = useState(
    repoId ? graph.repositoryFinishedLoading(repoId) : false,
  );
  const navigate = useNavigate();

  useEffect(() => {
    if (!repoLoaded && repoId) {
      graph.prepareRepositoryForUI(repoId).then(() => {
        setRepoLoaded(graph.repositoryFinishedLoading(repoId));
      });
    }
  }, [repoLoaded, repoId]);
  if (!repoId || !params.noteId) {
    navigate('/');
    notReached();
  }

  if (!repoLoaded) {
    return <LoadingView />;
  }

  return (
    <NoteEditorInternal
      note={note || graph.getVertexManager<Note>(params.noteId)}
    />
  );
}
