import Menu from '@ovvio/styles/lib/components/menu';
import { IconOverflow } from '@ovvio/styles/lib/components/icons';
import {
  EditCardAction,
  UploadAttachmentAction,
  EditDueDateAction,
  ViewInNoteAction,
  DeleteCardAction,
  ExportMailAction,
  ExportPdfAction,
  DuplicateCardAction,
  CopyUrlAction,
  ConvertNoteAction,
  ClearDueDateAction,
  ToggleSubTasksAction,
} from './actions';
import { Note } from '@ovvio/cfds/lib/client/graph/vertices';
import { EventCategory, useEventLogger } from 'core/analytics';
import { CARD_SOURCE } from 'shared/card';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { OvvioEditor } from 'core/slate/types';
import { isElectron } from '../../electronUtils';
import { usePartialVertex } from 'core/cfds/react/vertex';
import { NoteType } from '@ovvio/cfds/lib/client/graph/vertices/note';

export interface CardMenuViewProps {
  cardManager: VertexManager<Note>;
  allowsEdit?: boolean;
  onDeleted?: () => void;
  className?: any;
  source: CARD_SOURCE;
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
  const eventLogger = useEventLogger();
  const note = usePartialVertex(cardManager, [
    'dueDate',
    'type',
    'isChecked',
    'childCards',
  ]);
  if (!cardManager) {
    return null;
  }
  const electron = isElectron();

  return (
    <Menu
      renderButton={() => <IconOverflow />}
      align="end"
      direction={direction}
      position={position}
      onClick={() => {
        eventLogger.cardAction('CARD_OPTIONS_CLICKED', cardManager, {
          category: EventCategory.MENU_ITEM,
          source,
        });
      }}
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
      {note.dueDate && (
        <ClearDueDateAction cardManager={cardManager} source={source} />
      )}

      <UploadAttachmentAction cardManager={cardManager} source={source} />
      {source !== CARD_SOURCE.CHILD && (
        <ViewInNoteAction cardManager={cardManager} source={source} />
      )}
      <DuplicateCardAction
        cardManager={cardManager}
        source={source}
        editorRootKey={editorRootKey}
        editor={editor}
      />
      {source === CARD_SOURCE.TITLE && (
        <ExportMailAction cardManager={cardManager} source={source} />
      )}
      {source === CARD_SOURCE.TITLE && (
        <ExportPdfAction cardManager={cardManager} source={source} />
      )}
      {/* <ConvertNoteAction cardManager={cardManager} source={source} /> */}
      {electron && source === CARD_SOURCE.TITLE && (
        <CopyUrlAction cardManager={cardManager} source={source} />
      )}
      {note.childCards.length > 0 && (
        <ToggleSubTasksAction cardManager={cardManager} source={source} />
      )}
      <DeleteCardAction
        cardManager={cardManager}
        source={source}
        onDeleted={onDeleted}
      />
    </Menu>
  );
}
