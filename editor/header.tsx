import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { resolveWritingDirection } from '../base/string.ts';
import { VertexManager } from '../cfds/client/graph/vertex-manager.ts';
import { Note } from '../cfds/client/graph/vertices/note.ts';
import { usePartialVertex } from '../web-app/src/core/cfds/react/vertex.ts';
import { makeStyles, cn } from '../styles/css-objects/index.ts';
import { brandLightTheme as theme } from '../styles/theme.tsx';
import { styleguide } from '../styles/styleguide.ts';

export const HEADER_HEIGHT = styleguide.gridbase * 24;

const useStyles = makeStyles(() => ({
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
    paddingBottom: styleguide.gridbase,
    textOverflow: 'ellipsis',
  },
}));

export interface HeaderTitleProps {
  note: VertexManager<Note>;
  onEnter: () => void;
}

export const HeaderTitle = forwardRef<HTMLInputElement, HeaderTitleProps>(
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
        placeholder={'Name your note'}
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

export interface EditorHeaderProps {
  note: VertexManager<Note>;
  onFocusOnEditor: () => void;
}

export function EditorHeader({ note, onFocusOnEditor }: EditorHeaderProps) {
  const styles = useStyles();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [didFocus, setDidFocus] = useState(false);
  const navigate = useNavigate();

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

  return (
    <div className={cn(styles.header)} key="EditorHeaderDiv">
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
        onEnter={onFocusOnEditor}
      />
    </div>
  );
}
