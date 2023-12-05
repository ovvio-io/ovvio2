import React, {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  PointerDirection,
  TextNode,
  dfs,
  isElementNode,
  isTextNode,
  pathToNode,
} from '../cfds/richtext/tree.ts';
import { RichTextRef, RichTextRenderer } from '../cfds/richtext/react.tsx';
import { docFromRT, docToRT } from '../cfds/richtext/doc-state.ts';
import { Document } from '../cfds/richtext/doc-state.ts';
import { coreValueClone } from '../base/core-types/clone.ts';
import { useTrustPool } from '../auth/react.tsx';
import { makeStyles, cn } from '../styles/css-objects/index.ts';
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

const HEADER_HEIGHT = styleguide.gridbase * 24;

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
  },
}));

const DELETE_INPUT_TYPES = [
  'deleteContentBackward',
  'deleteContent',
  'deleteContentForward',
] as const;

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
  state: Document,
  selectionId: string,
  editorDivNode: HTMLDivElement | undefined | null,
  anchorRefNode: HTMLElement | null | undefined,
  focusRefNode: HTMLElement | null | undefined
): void {
  const selection = getSelection();
  debugger;
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
    selection.removeAllRanges();
    if (!state.ranges || !state.ranges[selectionId]) {
      return;
    }
    const cfdsRange = state.ranges[selectionId];
    const range = document.createRange();
    let offsetShift = 0;
    let desiredStartOffset = cfdsRange.anchor.offset;
    const origAnchorNode =
      anchorRefNode?.childNodes[0] ||
      anchorRefNode ||
      focusRefNode?.childNodes[0] ||
      focusRefNode;
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
    if (focusRefNode) {
      focusNode = focusRefNode.childNodes[0] || focusRefNode;
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
  const trustPool = useTrustPool();
  const selectionId = trustPool.currentSession.id;
  const richTextRef = useRef<RichTextRef>(null);
  const styles = useStyles();
  const baseDirection = resolveWritingDirection(partialNote.titlePlaintext);
  const editorDivRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(
    ref,
    () => {
      return {
        get contenteditable() {
          return editorDivRef.current;
        },
      };
    },
    [editorDivRef.current]
  );

  useLayoutEffect(
    () =>
      setBrowserSelectionToDocument(
        note.getVertexProxy().body,
        selectionId,
        editorDivRef.current,
        richTextRef.current?.anchorNode,
        richTextRef.current?.focusNode
      ),
    [richTextRef.current, selectionId, partialNote]
  );

  const onSelectionChanged = useCallback(() => {
    const selection = getSelection();
    const state = note.getVertexProxy().body;
    if (!selection) {
      const doc = coreValueClone(state);
      if (doc.ranges && doc.ranges[selectionId]) {
        delete doc.ranges[selectionId];
        partialNote.body = doc;
      }
      return;
    }
    try {
      const selectionAnchorNode = selection.anchorNode;
      if (selectionAnchorNode) {
        let anchorNode = state.nodeKeys.nodeFromKey(
          (
            (selectionAnchorNode instanceof Text
              ? selectionAnchorNode.parentNode!
              : selectionAnchorNode) as HTMLElement
          ).dataset.ovvKey!
        );
        if (!anchorNode) {
          setBrowserSelectionToDocument(
            state,
            selectionId,
            editorDivRef.current,
            richTextRef.current?.anchorNode,
            richTextRef.current?.focusNode
          );
          return;
        }
        const selectionFocusNode = selection.focusNode || selection.anchorNode;
        let focusNode = state.nodeKeys.nodeFromKey(
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
          let { anchorOffset, focusOffset } = selection;
          debugger;
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
            setBrowserSelectionToDocument(
              state,
              selectionId,
              editorDivRef.current,
              richTextRef.current?.anchorNode,
              richTextRef.current?.focusNode
            );
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
          };
          const result = docFromRT(docToRT(state));
          note.getVertexProxy().body = result;
        }
      }
    } catch (err: unknown) {
      debugger;
    }
  }, [note]);

  const onBeforeInput = useCallback(
    (event: React.FormEvent<HTMLDivElement>) => {
      const state = note.getVertexProxy().body;
      event.stopPropagation();
      event.preventDefault();
      note.getVertexProxy().body = handleTextInputEvent(
        state,
        event.nativeEvent as InputEvent,
        selectionId
      );
    },
    [note]
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
          selectionId
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
        (event.ctrlKey || event.metaKey || event.shiftKey)
      ) {
        event.stopPropagation();
        event.preventDefault();
      }
    },
    [note]
  );

  const onPaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      event.stopPropagation();
      event.preventDefault();
    },
    [note]
  );

  return (
    <div
      ref={editorDivRef}
      className={cn(className, styles.contentEditable)}
      contentEditable={true}
      suppressContentEditableWarning={true}
      dir={baseDirection === 'rtl' ? 'rtl' : undefined}
      onBeforeInput={onBeforeInput}
      onSelect={onSelectionChanged}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      onFocus={(event) =>
        setBrowserSelectionToDocument(
          note.getVertexProxy().body,
          selectionId,
          editorDivRef.current,
          richTextRef.current?.anchorNode,
          richTextRef.current?.focusNode
        )
      }
    >
      <RichTextRenderer
        doc={partialNote.body}
        selectionId={selectionId}
        baseDirection={baseDirection}
        ref={richTextRef}
      />
    </div>
  );
});

interface HeaderTitleProps {
  note: VertexManager<Note>;
  onEnter: () => void;
}

const HeaderTitle = forwardRef<HTMLInputElement, HeaderTitleProps>(
  function HeaderTitle({ note, onEnter }: HeaderTitleProps, ref) {
    const styles = useStyles();
    const partialVertex = usePartialVertex(note, ['titlePlaintext']);
    const baseDirection = resolveWritingDirection(partialVertex.titlePlaintext);
    return (
      <input
        key="EditorTitle"
        ref={ref}
        className={cn(styles.titleInput)}
        type="text"
        dir={baseDirection === 'rtl' ? 'rtl' : undefined}
        value={partialVertex.titlePlaintext}
        onChange={(e) => {
          partialVertex.titlePlaintext = (e.target as HTMLInputElement).value;
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            onEnter();
          }
        }}
        autoFocus
      />
    );
  }
);

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
  const titleInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<RichTextEditorRef>(null);
  const navigate = useNavigate();

  const [didFocus, setDidFocus] = useState(false);

  useEffect(() => {
    if (didFocus) {
      return;
    }
    let timeout: number | undefined = setTimeout(() => {
      if (titleInputRef.current) {
        titleInputRef.current.focus();
        setDidFocus(true);
      }
      timeout = undefined;
    }, 50);
    return () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
      }
    };
  }, [didFocus, setDidFocus, titleInputRef]);

  const onTitleEnter = useCallback(() => {
    editorRef.current?.contenteditable?.focus();
  }, [editorRef]);

  return (
    <div className={cn(styles.mainContainer)} key="EditorContainer">
      <div className={cn(styles.header)} key="EditorHeader">
        <div className={cn(styles.headerMainActions)} key="EditorHeaderActions">
          <img
            key="ExitEditorAction"
            className={cn(styles.headerMainActionButton)}
            src="/icons/editor/icon/close-circle.svg"
            onClick={() => {
              navigate('/');
            }}
          />
        </div>
        <HeaderTitle
          key="EditorHeader"
          ref={titleInputRef}
          note={note}
          onEnter={onTitleEnter}
        />
      </div>
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
    repoId ? graph.repositoryFinishedLoading(repoId) : false
  );
  const navigate = useNavigate();

  useEffect(() => {
    if (!repoLoaded && repoId) {
      graph.loadRepository(repoId).then(() => {
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
