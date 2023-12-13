import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { resolveWritingDirection } from '../base/string.ts';
import { formatTimeDiff } from '../base/date.ts';
import { VertexManager } from '../cfds/client/graph/vertex-manager.ts';
import { Note } from '../cfds/client/graph/vertices/note.ts';
import { usePartialVertex } from '../web-app/src/core/cfds/react/vertex.ts';
import { cn, makeStyles } from '../styles/css-objects/index.ts';
import { brandLightTheme as theme } from '../styles/theme.tsx';
import { styleguide } from '../styles/styleguide.ts';
import { Text, TextSm } from '../styles/components/typography.tsx';
import { WorkspaceIndicator } from '../components/workspace-indicator.tsx';

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
    fontFamily: '\'Poppins\', \'Heebo\', sans-serif',
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
  breadCrumbsContainer: {
    position: 'absolute',
    top: styleguide.gridbase * 3,
    left: styleguide.gridbase * 3.25,
    display: 'flex',
    alignItems: 'center',
    color: theme.mono.m4,
  },
  breadCrumbsSeparator: {
    width: '1px',
    height: '1em',
    backgroundColor: theme.mono.m4,
    marginLeft: styleguide.gridbase,
    marginRight: styleguide.gridbase,
  },
  breadCrumbsSlash: {
    position: 'relative',
    top: '2px',
    marginRight: styleguide.gridbase,
  },
  breadCrumbsTitle: {
    fontSize: '20px',
    color: theme.mono.m10,
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
        key='EditorTitle'
        ref={ref}
        className={cn(styles.titleInput)}
        type='text'
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
  },
);

export interface EditorBreadCrumbsProps {
  note: VertexManager<Note>;
}

function EditorBreadCrumbs({ note }: EditorBreadCrumbsProps) {
  const styles = useStyles();
  const partialNote = usePartialVertex(note, [
    'creationDate',
    'workspace',
    'titlePlaintext',
  ]);
  return (
    <div className={cn(styles.breadCrumbsContainer)}>
      <TextSm>{formatTimeDiff(partialNote.creationDate)}</TextSm>
      <span className={cn(styles.breadCrumbsSeparator)}></span>
      <WorkspaceIndicator
        workspace={partialNote.workspace.manager}
      />
      <span className={cn(styles.breadCrumbsSlash)}>/</span>
      <Text className={cn(styles.breadCrumbsTitle)}>
        {partialNote.titlePlaintext}
      </Text>
    </div>
  );
}

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
    <div className={cn(styles.header)} key='EditorHeaderDiv'>
      <EditorBreadCrumbs note={note} />
      <div className={cn(styles.headerMainActions)} key='EditorHeaderActions'>
        <img
          key='ExitEditorAction'
          className={cn(styles.headerMainActionButton)}
          src='/icons/editor/icon/close-circle.svg'
          onClick={() => {
            navigate('/');
          }}
        />
      </div>
      <HeaderTitle
        key='EditorHeader'
        ref={titleInputRef}
        note={note}
        onEnter={onFocusOnEditor}
      />
    </div>
  );
}
