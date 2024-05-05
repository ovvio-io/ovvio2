import React, { useCallback, useEffect, useState } from 'react';
import Menu from '../../../../styles/components/menu.tsx';
import {
  EditCardAction,
  EditDueDateAction,
  ViewInNoteAction,
  DeleteCardAction,
  ConvertNoteAction,
  ToggleSubTasksAction,
  ClearDueDateAction,
  DuplicateCardAction,
} from './actions/index.tsx';
import { Note, NoteType } from '../../../../cfds/client/graph/vertices/note.ts';
import { VertexManager } from '../../../../cfds/client/graph/vertex-manager.ts';
import { UISource } from '../../../../logging/client-events.ts';
import { useLogger } from '../../core/cfds/react/logger.tsx';
import { usePartialVertex } from '../../core/cfds/react/vertex.ts';
import { cn, makeStyles } from '../../../../styles/css-objects/index.ts';
// import { CopyIntoCardAction } from './actions/index.tsx';

const useStyles = makeStyles(() => ({
  item: {
    borderBottom: `2px solid #f5ecdc`,
  },
  lastItem: {
    borderBottom: 'none',
  },
}));

export interface CardMenuViewProps {
  cardManager: VertexManager<Note>;
  allowsEdit?: boolean;
  onDeleted?: () => void;
  className?: any;
  source: UISource;
  editorRootKey?: string;
  direction?: 'in' | 'out';
  position?: 'top' | 'bottom' | 'left' | 'right';
  visible?: boolean;
  isOpen?: boolean;
  toggleMenu?: () => void;
  isTask?: boolean;
  renderButton?: any;
}
export default function CardMenuView({
  cardManager,
  allowsEdit,
  onDeleted,
  source,
  editorRootKey,
  isOpen,
  toggleMenu,
  isTask,
  renderButton,
}: CardMenuViewProps) {
  const styles = useStyles();
  const [showConfirmation, setShowConfirmation] = useState(false);

  const partialNote = usePartialVertex(cardManager, [
    'dueDate',
    'type',
    'isChecked',
    'childCards',
    'parentNote',
    'type',
  ]);

  if (!cardManager) {
    return null;
  }
  const menuItems = [
    partialNote.dueDate && (
      <ClearDueDateAction
        key="clearDueDate"
        cardManager={cardManager}
        source={source}
      />
    ),
    partialNote.childCards.length > 0 && (
      <ToggleSubTasksAction
        key="toggleSubTasks"
        cardManager={cardManager}
        source={source}
      />
    ),
    allowsEdit && (
      <EditCardAction
        key="editCard"
        cardManager={cardManager}
        source={source}
      />
    ),
    partialNote.parentNote && (
      <ViewInNoteAction
        key="viewInNote"
        cardManager={cardManager}
        source={source}
      />
    ),
    // partialNote.type === NoteType.Note && (
    //   <CopyIntoCardAction
    //     key="copyIntoCard"
    //     cardManager={cardManager}
    //     source={source}
    //     editorRootKey={editorRootKey}
    //   />
    // ),
    <DuplicateCardAction
      cardManager={cardManager}
      source={source}
      editorRootKey={editorRootKey}
    />,
    <DeleteCardAction
      key="deleteCard"
      cardManager={cardManager}
      source={source}
      onDeleted={onDeleted}
      showConfirmation={showConfirmation}
      setShowConfirmation={setShowConfirmation}
    />,
  ].filter(Boolean);

  return (
    <React.Fragment>
      <Menu
        isOpen={showConfirmation ? true : isOpen}
        toggleMenu={toggleMenu}
        renderButton={renderButton}
        direction="out"
        position={source === 'list' ? 'left' : 'right'}
        align="start"
      >
        {showConfirmation ? (
          <DeleteCardAction
            key="deleteConfirmation"
            cardManager={cardManager}
            source={source}
            onDeleted={onDeleted}
            showConfirmation={showConfirmation}
            setShowConfirmation={setShowConfirmation}
          />
        ) : (
          menuItems
        )}
      </Menu>
    </React.Fragment>
  );
}
