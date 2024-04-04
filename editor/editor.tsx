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
} from './renderer.tsx';
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
import { kSecondMs } from '../base/date.ts';
import { coreValueEquals } from '../base/core-types/equals.ts';
import { uniqueId } from '../base/common.ts';
import { EditorHeader, HEADER_HEIGHT } from './header.tsx';
import { useUndoContext } from './undo.ts';
import { moveCaretToEnd, onKeyboardArrow } from './caret.ts';
import { expirationForSelection, SELECTION_TTL_MS } from './utils.ts';
import { onMouseUp } from './mouse.ts';
import { useCaret } from './caret.ts';
import { SimpleTimer } from '../base/timer.ts';

export const CONTENTEDITABLE_PADDING = styleguide.gridbase * 11;

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
    fontFamily: 'Heebo-SemiBold, Poppins-SemiBold',
    fontSize: '30px',
    // fontWeight: '600',
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
    padding: CONTENTEDITABLE_PADDING,
    outline: 'none',
    cursor: 'text',
    boxSizing: 'border-box',
    overflowY: 'scroll',
    // scrollBehavior: 'instant',
    caretColor: 'transparent',
    '::selection': {
      background: 'transparent',
    },
  },
}));

const DELETE_INPUT_TYPES = [
  'deleteContentBackward',
  'deleteContent',
  'deleteContentForward',
] as const;

function handleTextInputEvent(
  document: Document,
  event: InputEvent | KeyboardEvent | ClipboardEvent,
  selectionId: string,
): Document {
  if (event instanceof InputEvent) {
    if (event.inputType === 'insertParagraph') {
      return handleInsertTextInputEvent(document, event, selectionId);
    }
    return handleInsertTextInputEvent(document, event, selectionId);
  }
  if (event instanceof KeyboardEvent) {
    if (event.code === 'Space') {
      return handleInsertTextInputEvent(document, event, selectionId);
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      return deleteCurrentSelection(document, selectionId);
    }
  }
  if (event instanceof ClipboardEvent) {
    return handleInsertTextInputEvent(document, event, selectionId);
  }
  // } else {
  //   if (event.type === 'textInput') {
  //     return handleInsertTextInputEvent(document, event, selectionId);
  //   }
  //   if ((DELETE_INPUT_TYPES as readonly string[]).includes(event.inputType)) {
  //     return deleteCurrentSelection(document, selectionId);
  //   }
  // }
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
  }, [partialNote, selectionId, editorId, baseDirection]);
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

  const onBeforeInput = useCallback(
    (event: InputEvent) => {
      const state = note.getVertexProxy().body;
      event.stopPropagation();
      event.preventDefault();
      const updatedBody = handleTextInputEvent(state, event, selectionId);
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
      if (event.key === 'z' && (event.ctrlKey || event.metaKey)) {
        event.stopPropagation();
        event.preventDefault();
        if (event.shiftKey) {
          undoContext.redo();
        } else {
          undoContext.undo();
        }
      }
      if (
        event.key === 'ArrowUp' ||
        event.key === 'ArrowDown' ||
        event.key === 'ArrowLeft' ||
        event.key === 'ArrowRight'
      ) {
        const doc = onKeyboardArrow(
          state,
          selectionId,
          event.key,
          ctx.baseDirection || 'auto',
        );
        if (doc) {
          event.stopPropagation();
          event.preventDefault();
          note.getVertexProxy().body = doc;
        }
      }
    },
    [note, undoContext, ctx],
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

  const onBlur = useCallback(() => {
    const body = docClone(partialNote.body);
    if (body.ranges) {
      delete body.ranges[selectionId];
      partialNote.body = body;
    }
  }, [partialNote, selectionId]);
  useCaret(ctx);

  useEffect(() => {
    if (!editorDivRef.current) {
      return;
    }
    const div = editorDivRef.current;
    div.addEventListener('beforeinput', onBeforeInput);
    return () => {
      div.removeEventListener('beforeinput', onBeforeInput);
    };
  }, [editorDivRef.current]);

  useEffect(() => {
    if (!editorDivRef.current) {
      return;
    }
    const doc = partialNote.body;
    if (doc.ranges && doc.ranges[selectionId] !== undefined) {
      document.getSelection()?.collapse(editorDivRef.current);
    } else {
      editorDivRef.current.blur();
    }
  }, [editorDivRef.current, partialNote]);
  return (
    <div
      id={editorId}
      ref={editorDivRef}
      className={cn(className, styles.contentEditable)}
      contentEditable={true}
      suppressContentEditableWarning={true}
      dir={baseDirection === 'rtl' ? 'rtl' : undefined}
      // onBeforeInput={onBeforeInput}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      onSelect={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onMouseUp={(e) => onMouseUp(e, note, selectionId)}
      onBlur={onBlur}
      onClick={() => {
        if (!partialNote.body.ranges || !partialNote.body.ranges[selectionId]) {
          partialNote.body = moveCaretToEnd(partialNote.body, selectionId);
        }
      }}
    >
      <RichTextRenderer
        ctx={ctx}
        onChange={(doc) => (partialNote.body = doc)}
      />
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
    note.getVertexProxy().body = moveCaretToEnd(
      note.getVertexProxy().body,
      note.graph.selectionId,
    );
  }, [editorRef.current?.contenteditable]);

  return (
    <div className={cn(styles.mainContainer)} key="EditorContainer">
      <EditorHeader
        key="EditorHeader"
        note={note}
        onFocusOnEditor={onFocusOnEditor}
      />
      <RichTextEditor key="EditorBody" ref={editorRef} note={note} />
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
