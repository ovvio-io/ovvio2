import Utils from '@ovvio/base/lib/utils';
import { AttachmentData } from '@ovvio/cfds/lib/base/scheme-types';
import { Note } from '@ovvio/cfds/lib/client/graph/vertices';
import { useFileUploader } from 'shared/components/file-uploader';
import { useScopedObservable } from 'core/state';
import User from 'stores/user';
import { useEventLogger } from 'core/analytics';
import { Logger } from '@ovvio/base';
import { CARD_SOURCE } from 'shared/card';
import { usePartialVertex } from 'core/cfds/react/vertex';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { useContext } from 'react';
import { toastContext } from '@ovvio/styles/lib/components/toast';

interface UseAttachmentsInfo {
  attachments: AttachmentData[];
  removeAttachment: (att: AttachmentData) => void;
  openAttachment: (att: AttachmentData) => void;
}
export function useAttachments(
  cardManager: VertexManager<Note>,
  source?: CARD_SOURCE
): UseAttachmentsInfo {
  const fileUploader = useFileUploader();
  const currentUser = useScopedObservable(User);
  const eventLogger = useEventLogger();
  const toastProvider = useContext(toastContext);

  const pCard = usePartialVertex(cardManager, ['workspace', 'attachments']);

  if (!pCard) {
    return {
      attachments: [],
      removeAttachment: () => {},
      openAttachment: () => {},
    };
  }
  const attachments = Array.from(pCard.attachments).sort((f1, f2) =>
    (f1.filename || '').localeCompare(f2.filename || '')
  );

  return {
    attachments,
    removeAttachment: async attachment => {
      try {
        const tempCard = cardManager.getVertexProxy();

        tempCard.attachments = Utils.Set.deleteByValue(
          tempCard.attachments,
          attachment
        );

        await fileUploader.delete(
          tempCard.workspace.key,
          currentUser,
          attachment
        );

        eventLogger.cardAction('CARD_ATTACHMENT_REMOVED', cardManager, {
          source,
        });
      } catch (e) {
        Logger.error('Card Attachment Removal Failed', e);
      }
    },
    openAttachment: file => {
      const tempCard = cardManager.getVertexProxy();
      const close = toastProvider.displayToast({
        text: `Downloading ${file.filename}...`,
      });
      fileUploader
        .download(tempCard.workspaceKey, currentUser, file)
        .then(() => {
          close();
          eventLogger.cardAction(
            'CARD_ATTACHMENT_DOWNLOAD_SUCCESS',
            cardManager,
            {
              source,
            }
          );
        })
        .catch(err => {
          close();
          toastProvider.displayToast({
            text: 'Failed to download attachment',
            duration: 3000,
          });
          eventLogger.cardError(err, cardManager, {
            origin: 'CARD_ATTACHMENT_DOWNLOAD',
            source,
          });
        });
    },
  };
}
