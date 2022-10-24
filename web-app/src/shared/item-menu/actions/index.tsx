import Utils from '@ovvio/base/lib/utils';
import { AttachmentData } from '@ovvio/cfds/lib/base/scheme-types';
import { duplicateCard } from '@ovvio/cfds/lib/client/duplicate';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Note } from '@ovvio/cfds/lib/client/graph/vertices';
import { NoteType } from '@ovvio/cfds/lib/client/graph/vertices/note';
import { Button, RaisedButton } from '@ovvio/styles/lib/components/buttons';
import {
  Dialog,
  DialogActions,
  DialogContent,
} from '@ovvio/styles/lib/components/dialog';
import { IconAttachment } from '@ovvio/styles/lib/components/new-icons/icon-attachment';
import { IconDelete } from '@ovvio/styles/lib/components/new-icons/icon-delete';
import { IconDuplicate } from '@ovvio/styles/lib/components/new-icons/icon-duplicate';
import { IconTask } from '@ovvio/styles/lib/components/new-icons/icon-task';
import { IconNote } from '@ovvio/styles/lib/components/new-icons/icon-note';
import { IconViewNote } from '@ovvio/styles/lib/components/new-icons/icon-view-note';
import { IconOpen } from '@ovvio/styles/lib/components/new-icons/icon-open';
import { IconExportPdf } from '@ovvio/styles/lib/components/new-icons/icon-export-pdf';
import { IconExportMail } from '@ovvio/styles/lib/components/new-icons/icon-export-mail';
import { IconLink } from '@ovvio/styles/lib/components/icons';
import { MenuAction } from '@ovvio/styles/lib/components/menu';
import { H3, Text } from '@ovvio/styles/lib/components/texts';
import {
  toastContext,
  useToastController,
} from '@ovvio/styles/lib/components/toast';
import { EventCategory, useEventLogger } from 'core/analytics';
import { useGraphManager } from 'core/cfds/react/graph';
import { useDocumentRouter } from 'core/react-utils';
import {
  LOGIN,
  NOTE,
  useHistory,
  useHistoryStatic,
} from 'core/react-utils/history';
import { CardElement } from 'core/slate/elements/card.element';
import { OvvioEditor } from 'core/slate/types';
import { ElementUtils } from 'core/slate/utils/element-utils';
import { useScopedObservable } from 'core/state';
import path from 'path';
import React, { useContext, useRef, useState } from 'react';
import { CARD_SOURCE } from 'shared/card';
import { useDueDate } from 'shared/components/due-date-editor';
import { useFileUploader } from 'shared/components/file-uploader';
import { electronConstants } from 'shared/constants/electron-constants';
import { downloadBlob, generateMailtoLink, generatePdf } from 'shared/export';
import {
  renderBody,
  renderSubject,
} from 'shared/export/rendering/outlook-email-renderer';
import { Path } from 'slate';
import User from 'stores/user';
import { usePartialVertex, useVertex } from '../../../core/cfds/react/vertex';
import config from '../../../core/config';
import { isElectron, isElectronWindows } from '../../../electronUtils';
import { IconDueDate } from '@ovvio/styles/lib/components/new-icons/icon-due-date';
import { IconColor } from '@ovvio/styles/lib/components/new-icons/types';

interface CardActionProps {
  cardManager: VertexManager<Note>;
  source: string;
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
  const eventLogger = useEventLogger();
  const docRouter = useDocumentRouter();

  const openItem = () => {
    //TODO
    eventLogger.cardAction('CARD_OPENED', cardManager, {
      category: EventCategory.MENU_ITEM,
      source,
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
export function UploadAttachmentAction({
  cardManager,
  source,
  close,
  ...props
}: UploadAttachmentActionProps) {
  const currentUser = useScopedObservable(User);
  const uploader = useFileUploader();
  const eventLogger = useEventLogger();
  usePartialVertex(cardManager, ['workspace', 'attachments']);

  const uploadAttachment = async () => {
    eventLogger.cardAction('CARD_ADD_ATTACHMENT_STARTED', cardManager, {
      category: EventCategory.MENU_ITEM,
      source,
    });

    let inProgressInfo: AttachmentData | undefined;
    try {
      const doneInfo = await uploader.upload(
        cardManager.getVertexProxy().workspaceKey,
        currentUser,
        file => {
          inProgressInfo = {
            user: currentUser.id,
            inProgress: true,
            filename: file.name,
            fileId: file.name,
          };

          const tempCard = cardManager.getVertexProxy();

          tempCard.attachments = Utils.Set.addByValue(
            tempCard.attachments,
            inProgressInfo
          );

          if (close) close();
        }
      );

      if (doneInfo) {
        const tempCard = cardManager.getVertexProxy();
        tempCard.attachments = Utils.Set.addByValue(
          Utils.Set.deleteByValue(tempCard.attachments, inProgressInfo),
          doneInfo
        );

        eventLogger.cardAction('CARD_ADD_ATTACHMENT_COMPLETED', cardManager, {
          category: EventCategory.MENU_ITEM,
          source,
        });
      } else {
        //Cancelled
        const tempCard = cardManager.getVertexProxy();

        tempCard.attachments = Utils.Set.deleteByValue(
          tempCard.attachments,
          inProgressInfo
        );

        eventLogger.cardAction('CARD_ADD_ATTACHMENT_CANCELED', cardManager, {
          category: EventCategory.MENU_ITEM,
          source,
        });

        if (close) close();
      }
    } catch (e) {
      eventLogger.cardError(e, cardManager, {
        origin: 'CARD_ATTACHMENT',
        source,
      });

      if (inProgressInfo) {
        const tempCard = cardManager.getVertexProxy();
        tempCard.attachments = Utils.Set.deleteByValue(
          tempCard.attachments,
          inProgressInfo
        );
      }
    }
  };

  return (
    <MenuAction
      {...props}
      onClick={uploadAttachment}
      IconComponent={IconAttachment}
      text="Add Attachment"
    />
  );
}

export function EditDueDateAction({
  cardManager,
  source,
  ...props
}: CardActionProps) {
  const dueDateEditor = useDueDate();
  const eventLogger = useEventLogger();
  const onClick = () => {
    eventLogger.cardAction('CARD_SET_DUE_DATE_STARTED', cardManager, {
      category: EventCategory.MENU_ITEM,
      source,
    });
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
  const history = useHistory();
  const eventLogger = useEventLogger();
  const pCard = usePartialVertex(cardManager, ['workspace', 'parentNote']);

  const openNote = () => {
    eventLogger.cardAction('PARENT_CARD_OPENED', cardManager, {
      category: EventCategory.MENU_ITEM,
      source,
    });
    history.push(NOTE, {
      workspaceId: pCard.workspace.key,
      noteId: pCard.parentNote.key,
    });
  };

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
  const history = useHistory();
  const resolveRef = useRef(() => {});

  const eventLogger = useEventLogger();
  const card = useVertex(cardManager);

  const onOpen = () => {
    setOpen(true);
    eventLogger.cardAction('CARD_DELETE_STARTED', card, {
      category: EventCategory.MENU_ITEM,
      source,
    });
    return new Promise<void>(resolve => {
      resolveRef.current = () => {
        resolve();
        resolveRef.current = () => {};
      };
    });
  };

  const closeDialog = (isCancelled: boolean) => {
    setOpen(false);
    resolveRef.current();
    if (isCancelled) {
      eventLogger.cardAction('CARD_DELETE_CANCELED', card, {
        category: EventCategory.MENU_ITEM,
        source,
      });
    }
  };

  const onDeleteClick = () => {
    card.isDeleted = 1;
    eventLogger.cardAction('CARD_DELETE_COMPLETED', card, {
      category: EventCategory.MENU_ITEM,
      source,
    });
    closeDialog(false);
    onDeleted && onDeleted();

    if (source === CARD_SOURCE.TITLE) {
      const prevState = history.getRouteInformation(1);
      if (prevState === undefined || prevState === null) {
        history.replace(LOGIN);
      } else {
        history.pop();
      }
    }
  };
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
const delay = (ms: number) => {
  return new Promise(resolve => {
    window.setTimeout(resolve, ms);
  });
};

export function ExportMailAction({
  cardManager,
  source,
  ...props
}: CardActionProps) {
  const eventLogger = useEventLogger();
  const toastController = useContext(toastContext);
  const card = useVertex(cardManager);

  const onExport = () => {
    eventLogger.cardAction('EXPORT_EMAIL_STARTED', card, {
      category: EventCategory.MENU_ITEM,
      source,
    });
    if (isElectronWindows()) {
      const { ipcRenderer } = window.require('electron');
      const ws = card.workspace;
      const subject = renderSubject(card);
      const body = renderBody(card, ws);
      ipcRenderer.once(`outlook_export_done_${card.key}`, (event, arg) => {
        let needFailedEvent = true;
        switch (arg.result) {
          case electronConstants.OUTLOOK_EXPORT_RESULT.ALREADY_RUNNING:
            //DO nothing
            break;
          case electronConstants.OUTLOOK_EXPORT_RESULT.DIALOG_OPEN:
            toastController.displayToast({
              text: 'Outlook Dialog is open. please close and try again.',
              duration: 3000,
            });
            break;
          case electronConstants.OUTLOOK_EXPORT_RESULT.SUCCESS:
            needFailedEvent = false;
            eventLogger.cardAction('EXPORT_EMAIL_SUCCESS', card, {
              category: EventCategory.MENU_ITEM,
              source,
              data: {
                exportType: 'windows-outlook',
              },
            });
            break;
          case electronConstants.OUTLOOK_EXPORT_RESULT.NOT_INSTALLED:
          case electronConstants.OUTLOOK_EXPORT_RESULT.NOT_WINDOWS:
            needFailedEvent = false;
            const mailto = generateMailtoLink(card);
            ipcRenderer.send('shell_open_ext', { url: mailto });
            eventLogger.cardAction('EXPORT_EMAIL_SUCCESS', card, {
              category: EventCategory.MENU_ITEM,
              source,
              data: {
                exportType: 'mailto',
                exportError: arg.result,
              },
            });
            break;
          default:
            toastController.displayToast({
              text: 'Failed to Open Outlook. please contact support',
              duration: 3000,
            });
            break;
        }
        if (needFailedEvent) {
          eventLogger.cardError(
            `Error ${arg.result}, Export Type: windows-outlook`,
            card,
            {
              origin: 'EXPORT_EMAIL',
              category: EventCategory.MENU_ITEM,
              source,
            }
          );
        }
      });
      ipcRenderer.send('outlook_export', {
        key: card.key,
        subject: subject,
        body: body,
      });
    } else {
      //MAILTO
      const mailto = generateMailtoLink(card);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = mailto;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
      eventLogger.cardAction('EXPORT_EMAIL_SUCCESS', card, {
        category: EventCategory.MENU_ITEM,
        data: {
          exportType: 'mailto',
        },
      });
    }
  };
  return (
    <MenuAction
      {...props}
      onClick={onExport}
      IconComponent={IconExportMail}
      text="Export to Mail"
    />
  );
}

export function ExportPdfAction({
  cardManager,
  source,
  ...props
}: CardActionProps) {
  const toastController = useContext(toastContext);
  const eventLogger = useEventLogger();
  const card = useVertex(cardManager);

  const onAsyncExport = async () => {
    let cancelled = false;

    eventLogger.cardAction('EXPORT_PDF_STARTED', cardManager, {
      category: EventCategory.MENU_ITEM,
      source,
    });

    const dismiss = toastController.displayToast({
      text: 'Generating PDF...',
      action: {
        text: 'Cancel',
        fn: d => {
          eventLogger.cardAction('EXPORT_PDF_CANCELED', cardManager, {
            category: EventCategory.MENU_ITEM,
            source,
          });
          cancelled = true;
          d();
        },
      },
    });
    try {
      if (isElectron()) {
        const { ipcRenderer } = window.require('electron');

        ipcRenderer.once('download-error', (event, args) => {
          if (args.result === 'failed-to-open') {
            toastController.displayToast({
              text: 'Failed to open downloaded PDF',
              duration: 3000,
            });
          } else if (args.result === 'failed-to-download') {
            toastController.displayToast({
              text: 'Failed to download PDF',
              duration: 3000,
            });
          }

          eventLogger.cardError(args.result, cardManager, {
            origin: 'EXPORT_PDF',
            source,
          });
        });
      }

      const p = delay(1500);
      const pdfInfo = await generatePdf(card);
      await p;
      dismiss();
      if (cancelled) {
        return;
      }

      downloadBlob(pdfInfo.blob, pdfInfo.filename);

      if (!isElectron()) {
        toastController.displayToast({
          text: `Downloaded ${pdfInfo.filename}`,
          duration: 3000,
        });
      }

      eventLogger.cardAction('EXPORT_PDF_COMPLETED', card, {
        category: EventCategory.MENU_ITEM,
      });
    } catch (e) {
      eventLogger.cardError(e, card, {
        origin: 'EXPORT_PDF',
        source,
      });

      dismiss();
      if (cancelled) {
        return;
      }
      toastController.displayToast({
        text: 'An error occurred while generating pdf, please try again',
      });
    }
  };
  const onExport = () => {
    onAsyncExport();
  };
  return (
    <MenuAction
      {...props}
      onClick={onExport}
      IconComponent={IconExportPdf}
      text="Export to PDF"
    />
  );
}

interface DuplicateCardActionProps extends CardActionProps {
  editorRootKey?: string;
  source: CARD_SOURCE;
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
  const eventLogger = useEventLogger();
  const docRouter = useDocumentRouter();

  const onDuplicate = () => {
    const newCard = duplicateCard(graph, cardManager.key);
    eventLogger.cardAction('CARD_DUPLICATED', cardManager, {
      category: EventCategory.MENU_ITEM,
      source,
      data: {
        newCardId: newCard.key,
      },
    });

    if (!editor || editorRootKey === cardManager.key) {
      docRouter.goTo(newCard);
      return;
    }
    const cardEntry = ElementUtils.findNode(
      editor,
      n => CardElement.isCard(n) && n.ref === cardManager.key
    );
    if (!cardEntry) {
      return;
    }
    const [, path] = cardEntry;
    CardElement.insertNote(editor, newCard, Path.next(path));
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
  const eventLogger = useEventLogger();
  const toastController = useToastController();
  const { type } = usePartialVertex(cardManager, ['type']);
  const text = type === NoteType.Note ? 'Convert To Task' : 'Convert To Note';
  const onClick = () => {
    const p = cardManager.getVertexProxy();
    const newType = type === NoteType.Note ? NoteType.Task : NoteType.Note;
    p.type = newType;
    eventLogger.cardAction('CARD_TYPE_CONVERTED', cardManager, {
      category: EventCategory.MENU_ITEM,
      source,
    });

    toastController.displayToast({
      text: `${type} converted to ${newType}`,
      action: {
        text: 'Undo',
        fn: dismiss => {
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

export function CopyUrlAction({
  cardManager,
  source,
  ...props
}: CardActionProps) {
  const history = useHistoryStatic();
  const eventLogger = useEventLogger();
  const toastController = useToastController();

  return (
    <MenuAction
      {...props}
      IconComponent={IconLink}
      iconHeight="25"
      iconWidth="20"
      onClick={() => {
        const currentRoute = history.currentRoute;
        const cardUrl = path.join(config.origin, currentRoute.url);

        navigator.clipboard.writeText(cardUrl);

        eventLogger.cardAction('CARD_URL_COPIED', cardManager, {
          category: EventCategory.MENU_ITEM,
          source,
        });

        toastController.displayToast({
          text: 'Link copied to clipboard',
          duration: 3000,
        });
      }}
      text="Copy Link"
    />
  );
}
