import React, { useCallback, useEffect, useState } from 'react';
import Menu from '../../../../styles/components/menu.tsx';
import { IconOverflow } from '../../../../styles/components/icons/index.ts';
import {
  EditCardAction,
  // UploadAttachmentAction,
  EditDueDateAction,
  ViewInNoteAction,
  DeleteCardAction,
  // ExportMailAction,
  // ExportPdfAction,
  // DuplicateCardAction,
  // CopyUrlAction,
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
import { CopyIntoCardAction } from './actions/index.tsx';

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
    allowsEdit && <EditCardAction cardManager={cardManager} source={source} />,
    partialNote.dueDate && (
      <ClearDueDateAction cardManager={cardManager} source={source} />
    ),
    partialNote.parentNote && (
      <ViewInNoteAction cardManager={cardManager} source={source} />
    ),
    partialNote.type === NoteType.Note && (
      <DuplicateCardAction
        cardManager={cardManager}
        source={source}
        editorRootKey={editorRootKey}
      />
    ),
    partialNote.childCards.length > 0 && (
      <ToggleSubTasksAction cardManager={cardManager} source={source} />
    ),
    partialNote.type === NoteType.Note && (
      <CopyIntoCardAction
        cardManager={cardManager}
        source={source}
        editorRootKey={editorRootKey}
      />
    ),
    <DeleteCardAction
      cardManager={cardManager}
      source={source}
      onDeleted={onDeleted}
      showConfirmation={showConfirmation}
      setShowConfirmation={setShowConfirmation}
    />,
  ].filter(Boolean);

  // const menuItemsS = menuItems.map((action, index) => {
  //   const isLastItem = index === actions.length - 1;
  //   const actionClasses = cn(isLastItem ? styles.item : styles.item);

  //   return React.cloneElement(action, {
  //     key: index,
  //     className: actionClasses,
  //   });
  // });

  return (
    <React.Fragment>
      <Menu
        isOpen={isOpen}
        toggleMenu={toggleMenu}
        renderButton={renderButton}
        direction="out"
        position={source === 'list' ? 'left' : 'right'}
        align="start"
      >
        {menuItems}
      </Menu>
    </React.Fragment>
  );
}
