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
  DuplicateCardAction,
  // CopyUrlAction,
  ConvertNoteAction,
  ToggleSubTasksAction,
  ClearDueDateAction,
} from './actions/index.tsx';
import { Note } from '../../../../cfds/client/graph/vertices/note.ts';
import { VertexManager } from '../../../../cfds/client/graph/vertex-manager.ts';
import { UISource } from '../../../../logging/client-events.ts';
import { useLogger } from '../../core/cfds/react/logger.tsx';
import { usePartialVertex } from '../../core/cfds/react/vertex.ts';
import { IconMore } from '../../../../styles/components/new-icons/icon-more.tsx';
import { makeStyles } from '../../../../styles/css-objects/index.ts';
import { styleguide } from '../../../../styles/styleguide.ts';
import { notFound } from '../../../../cfds/base/errors.ts';

const useStyles = makeStyles(() => ({}));

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
  ]);

  if (!cardManager) {
    return null;
  }

  return (
    <React.Fragment>
      {!showConfirmation ? (
        <Menu
          isOpen={isOpen}
          toggleMenu={toggleMenu}
          renderButton={renderButton}
          direction="out"
          position={source === 'list' ? 'left' : 'right'}
          align="start"
        >
          {allowsEdit && (
            <EditCardAction cardManager={cardManager} source={source} />
          )}
          {partialNote.dueDate && (
            <ClearDueDateAction cardManager={cardManager} source={source} />
          )}
          {partialNote.parentNote && (
            <ViewInNoteAction cardManager={cardManager} source={source} />
          )}
          <DuplicateCardAction
            cardManager={cardManager}
            source={source}
            editorRootKey={editorRootKey}
          />
          {partialNote.childCards.length > 0 && (
            <ToggleSubTasksAction cardManager={cardManager} source={source} />
          )}
          <DeleteCardAction
            cardManager={cardManager}
            source={source}
            onDeleted={onDeleted}
            showConfirmation={showConfirmation}
            setShowConfirmation={setShowConfirmation}
          />
        </Menu>
      ) : (
        <Menu
          isOpen={true}
          // toggleMenu={toggleMenu}
          renderButton={renderButton}
          direction="out"
          position={source === 'list' ? 'left' : 'right'}
          align="start"
        >
          <DeleteCardAction
            cardManager={cardManager}
            source={source}
            onDeleted={onDeleted}
            showConfirmation={showConfirmation}
            setShowConfirmation={setShowConfirmation}
          />
        </Menu>
      )}
    </React.Fragment>
  );
}
