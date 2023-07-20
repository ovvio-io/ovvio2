import React from 'react';
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
} from './actions/index.tsx';
import { Note } from '../../../../cfds/client/graph/vertices/note.ts';
import { VertexManager } from '../../../../cfds/client/graph/vertex-manager.ts';
import { OvvioEditor } from '../../core/slate/types.ts';
import { UISource } from '../../../../logging/client-events.ts';
import { useLogger } from '../../core/cfds/react/logger.tsx';
import { usePartialVertex } from '../../core/cfds/react/vertex.ts';

export interface CardMenuViewProps {
  cardManager: VertexManager<Note>;
  allowsEdit?: boolean;
  onDeleted?: () => void;
  className?: any;
  source: UISource;
  editorRootKey?: string;
  direction?: 'in' | 'out';
  position?: 'top' | 'bottom' | 'left' | 'right';
  editor?: OvvioEditor;
}

export default function CardMenuView({
  cardManager,
  allowsEdit,
  onDeleted,
  className,
  source,
  editorRootKey,
  direction,
  position,
  editor,
}: CardMenuViewProps) {
  const logger = useLogger();
  const partialNote = usePartialVertex(cardManager, ['parentNote']);
  if (!cardManager) {
    return null;
  }

  return (
    <Menu
      renderButton={() => <IconOverflow />}
      align="end"
      direction={direction}
      position={position}
      className={className}
    >
      {allowsEdit && (
        <EditCardAction
          cardManager={cardManager}
          source={source}
          editor={editor}
        />
      )}
      <EditDueDateAction cardManager={cardManager} source={source} />

      {/* <UploadAttachmentAction cardManager={cardManager} source={source} /> */}
      {partialNote.parentNote && (
        <ViewInNoteAction cardManager={cardManager} source={source} />
      )}
      <DuplicateCardAction
        cardManager={cardManager}
        source={source}
        editorRootKey={editorRootKey}
        editor={editor}
      />
      {/* <ExportMailAction cardManager={cardManager} source={source} />
      <ExportPdfAction cardManager={cardManager} source={source} /> */}
      <ConvertNoteAction cardManager={cardManager} source={source} />
      <DeleteCardAction
        cardManager={cardManager}
        source={source}
        onDeleted={onDeleted}
      />
      {/* <CopyUrlAction cardManager={cardManager} source={source} /> */}
    </Menu>
  );
}
