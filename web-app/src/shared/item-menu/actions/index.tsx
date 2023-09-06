import React, { useCallback, useContext, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Path } from 'slate';
import { duplicateCard } from '../../../../../cfds/client/duplicate.ts';
import { VertexManager } from '../../../../../cfds/client/graph/vertex-manager.ts';
import {
  Note,
  NoteType,
} from '../../../../../cfds/client/graph/vertices/note.ts';
import {
  Button,
  RaisedButton,
} from '../../../../../styles/components/buttons.tsx';
import {
  Dialog,
  DialogActions,
  DialogContent,
} from '../../../../../styles/components/dialog/index.tsx';
import { IconDelete } from '../../../../../styles/components/new-icons/icon-delete.tsx';
import { IconDuplicate } from '../../../../../styles/components/new-icons/icon-duplicate.tsx';
import { IconTask } from '../../../../../styles/components/new-icons/icon-task.tsx';
import { IconNote } from '../../../../../styles/components/new-icons/icon-note.tsx';
import { IconViewNote } from '../../../../../styles/components/new-icons/icon-view-note.tsx';
import { IconOpen } from '../../../../../styles/components/new-icons/icon-open.tsx';
import { IconExportPdf } from '../../../../../styles/components/new-icons/icon-export-pdf.tsx';
import { IconExportMail } from '../../../../../styles/components/new-icons/icon-export-mail.tsx';
import { IconDueDate } from '../../../../../styles/components/new-icons/icon-due-date.tsx';
import { IconColor } from '../../../../../styles/components/new-icons/types.ts';
import { IconLink } from '../../../../../styles/components/icons/index.ts';
import { MenuAction } from '../../../../../styles/components/menu.tsx';
import { H3, Text } from '../../../../../styles/components/texts.tsx';
import {
  toastContext,
  useToastController,
} from '../../../../../styles/components/toast/index.tsx';
import { useGraphManager } from '../../../core/cfds/react/graph.tsx';
import { useDocumentRouter } from '../../../core/react-utils/index.ts';
import { CardElement } from '../../../core/slate/elements/card.element/index.tsx';
import { OvvioEditor } from '../../../core/slate/types.ts';
import { ElementUtils } from '../../../core/slate/utils/element-utils.ts';
import { useDueDate } from '../../components/due-date-editor/index.tsx';
import {
  usePartialVertex,
  useVertex,
} from '../../../core/cfds/react/vertex.ts';
import { useLogger } from '../../../core/cfds/react/logger.tsx';
import { UISource } from '../../../../../logging/client-events.ts';

interface CardActionProps {
  cardManager: VertexManager<Note>;
  source: UISource;
}
interface EditItemActionProps extends CardActionProps {
  editor?: OvvioEditor;
}
export function EditCardAction({
  cardManager,
  source,
  editor,
  ...props
}: EditItemActionProps) {
  const logger = useLogger();
  const docRouter = useDocumentRouter();

  const openItem = () => {
    logger.log({
      severity: 'INFO',
      event: 'Click',
      source: 'menu:note:open',
      destination: 'editor',
      vertex: cardManager.key,
    });
    if (editor) {
      editor.selection = null;
    }
    docRouter.goTo(cardManager);
  };

  return (
    <MenuAction
      {...props}
      onClick={openItem}
      IconComponent={IconOpen}
      text="Open"
    />
  );
}

interface UploadAttachmentActionProps extends CardActionProps {
  close?: () => void;
}

export function EditDueDateAction({
  cardManager,
  source,
  ...props
}: CardActionProps) {
  const dueDateEditor = useDueDate();
  const onClick = () => {
    dueDateEditor.edit(cardManager.getVertexProxy());
  };
  return (
    <MenuAction
      {...props}
      onClick={onClick}
      IconComponent={IconDueDate}
      text="Add Due Date"
    />
  );
}

export function ViewInNoteAction({
  cardManager,
  source,
  ...props
}: CardActionProps) {
  const logger = useLogger();
  const navigate = useNavigate();
  const pCard = usePartialVertex(cardManager, ['workspace', 'parentNote']);

  const openNote = useCallback(() => {
    logger.log({
      severity: 'INFO',
      event: 'Click',
      source: 'menu:note:view-in-parent',
      vertex: pCard.key,
    });
    navigate(`${pCard.workspace.key}/${pCard.parentNote!.key}`);
  }, [pCard, logger, navigate]);

  if (!pCard.parentNote) {
    return null;
  }

  return (
    <MenuAction
      {...props}
      onClick={openNote}
      IconComponent={IconViewNote}
      text="View In Note"
    />
  );
}
export function cardHasChildren(card: Note) {
  try {
    for (const [child] of card.inEdges('parentNote')) {
      if (!child.isDeleted) return true;
    }
  } catch (e) {}
  return false;
}

interface DeleteCardActionProps extends CardActionProps {
  onDeleted?: () => void;
}
export function DeleteCardAction({
  cardManager,
  source,
  onDeleted = () => {},
  ...props
}: DeleteCardActionProps) {
  const [open, setOpen] = useState(false);
  const resolveRef = useRef(() => {});
  const logger = useLogger();
  const card = useVertex(cardManager);
  const navigate = useNavigate();

  const onOpen = useCallback(() => {
    setOpen(true);
    logger.log({
      severity: 'INFO',
      event: 'Start',
      flow: 'delete',
      vertex: card.key,
      source: source || 'menu:note:delete',
    });
    return new Promise<void>((resolve) => {
      resolveRef.current = () => {
        resolve();
        resolveRef.current = () => {};
      };
    });
  }, [setOpen, logger, card, source]);

  const closeDialog = useCallback(
    (isCancelled: boolean) => {
      setOpen(false);
      resolveRef.current();
      if (isCancelled) {
        logger.log({
          severity: 'INFO',
          event: 'Cancel',
          flow: 'delete',
          vertex: card.key,
          source: source || 'menu:note:delete',
        });
      }
    },
    [setOpen, logger, card, source]
  );

  const onDeleteClick = useCallback(() => {
    card.isDeleted = 1;
    logger.log({
      severity: 'INFO',
      event: 'End',
      flow: 'delete',
      vertex: card.key,
      source: source || 'menu:note:delete',
    });
    closeDialog(false);
    onDeleted && onDeleted();
    navigate('/');
    // if (source === 'title' || source === 'editor:title') {
    //   const prevState = history.getRouteInformation(1);
    //   if (prevState === undefined || prevState === null) {
    //     history.replace(LOGIN);
    //   } else {
    //     history.pop();
    //   }
    // }
  }, [card, logger, closeDialog, onDeleted, source, navigate]);
  const hasChildren = cardHasChildren(card);
  const msg = hasChildren
    ? 'Deleting this item is permanent and will include the data it contains; including text and items'
    : 'Deleting this item is permanent';
  const deleteText = hasChildren ? 'Delete Items' : 'Delete';
  return (
    <React.Fragment>
      <MenuAction
        {...props}
        onClick={onOpen}
        IconComponent={IconDelete}
        text="Delete"
      />
      <Dialog
        open={open}
        onClickOutside={() => closeDialog(true)}
        onClose={() => closeDialog(true)}
      >
        <DialogContent>
          <H3>Are you sure?</H3>
          <Text>{msg}</Text>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => closeDialog(true)}>Cancel</Button>
          <RaisedButton onClick={onDeleteClick}>{deleteText}</RaisedButton>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}

interface DuplicateCardActionProps extends CardActionProps {
  editorRootKey?: string;
  source: UISource;
  editor?: OvvioEditor;
}
export function DuplicateCardAction({
  editorRootKey,
  cardManager,
  source,
  editor,
  ...props
}: DuplicateCardActionProps) {
  const graph = useGraphManager();
  const logger = useLogger();
  const navigate = useNavigate();

  const onDuplicate = () => {
    const newCard = duplicateCard(graph, cardManager.key)!;
    logger.log({
      severity: 'INFO',
      event: 'Duplicate',
      vertex: cardManager.key,
      target: newCard?.key,
      source,
    });

    if (!editor || editorRootKey === cardManager.key) {
      navigate(`${newCard?.workspace.key}/${newCard?.key}`);
      return;
    }
    const cardEntry = ElementUtils.findNode(
      editor,
      (n) => CardElement.isCard(n) && n.ref === cardManager.key
    );
    if (!cardEntry) {
      return;
    }
    const [, path] = cardEntry;
    CardElement.insertNote(editor, newCard, Path.next(path!));
  };

  return (
    <MenuAction
      {...props}
      onClick={onDuplicate}
      IconComponent={IconDuplicate}
      text="Duplicate"
    />
  );
}

export function ConvertNoteAction({ cardManager, source }: CardActionProps) {
  const logger = useLogger();
  const toastController = useToastController();
  const { type } = usePartialVertex(cardManager, ['type']);
  const text = type === NoteType.Note ? 'Convert To Task' : 'Convert To Note';
  const onClick = () => {
    const p = cardManager.getVertexProxy();
    const newType = type === NoteType.Note ? NoteType.Task : NoteType.Note;
    p.type = newType;
    logger.log({
      severity: 'INFO',
      event: 'MetadataChanged',
      source: 'menu:note:convert',
      vertex: cardManager.key,
    });

    toastController.displayToast({
      text: `${type} converted to ${newType}`,
      action: {
        text: 'Undo',
        fn: (dismiss) => {
          cardManager.getVertexProxy().type = type;
          dismiss();
        },
      },
      duration: 3000,
    });
  };
  return (
    <MenuAction
      IconComponent={type === NoteType.Note ? IconTask : IconNote}
      text={text}
      onClick={onClick}
      color={IconColor.Mono}
    />
  );
}

// export function CopyUrlAction({
//   cardManager,
//   source,
//   ...props
// }: CardActionProps) {
//   const history = useHistoryStatic();
//   const eventLogger = useEventLogger();
//   const toastController = useToastController();

//   return (
//     <MenuAction
//       {...props}
//       IconComponent={IconLink}
//       iconHeight="25"
//       iconWidth="20"
//       onClick={() => {
//         const currentRoute = history.currentRoute;
//         const cardUrl = path.join(config.origin, currentRoute.url);

//         navigator.clipboard.writeText(cardUrl);

//         eventLogger.cardAction('CARD_URL_COPIED', cardManager, {
//           category: EventCategory.MENU_ITEM,
//           source,
//         });

//         toastController.displayToast({
//           text: 'Link copied to clipboard',
//           duration: 3000,
//         });
//       }}
//       text="Copy Link"
//     />
//   );
// }
