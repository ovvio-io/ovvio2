import { useContext } from 'https://esm.sh/react@18.2.0';
import { AttachmentData } from '../../../../cfds/base/scheme-types.ts';
import { Note } from '../../../../cfds/client/graph/vertices/note.ts';
import { useFileUploader } from '../components/file-uploader/index.tsx';
import { usePartialVertex } from '../../core/cfds/react/vertex.ts';
import { VertexManager } from '../../../../cfds/client/graph/vertex-manager.ts';
import { toastContext } from '../../../../styles/components/toast/index.tsx';
import { useCurrentUser } from '../../core/cfds/react/vertex.ts';
import * as SetUtils from '../../../../base/set.ts';
import { useLogger } from '../../core/cfds/react/logger.tsx';
import { UI_SOURCE } from '../../../../logging/client-events.ts';

interface UseAttachmentsInfo {
  attachments: AttachmentData[];
  removeAttachment: (att: AttachmentData) => void;
  openAttachment: (att: AttachmentData) => void;
}
export function useAttachments(
  cardManager: VertexManager<Note>,
  source?: UI_SOURCE
): UseAttachmentsInfo {
  const fileUploader = useFileUploader();
  const currentUser = useCurrentUser();
  const logger = useLogger();
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
    removeAttachment: async (attachment) => {
      try {
        const tempCard = cardManager.getVertexProxy();

        tempCard.attachments = SetUtils.deleteByValue(
          tempCard.attachments,
          attachment
        );

        await fileUploader.delete(
          tempCard.workspace.key,
          currentUser,
          attachment
        );

        logger.log({
          severity: 'INFO',
          event: 'AttachmentRemoved',
          vertex: cardManager.key,
          uiSource: source,
        });
      } catch (e) {
        logger.log({
          severity: 'INFO',
          error: 'AttachmentRemovalFailed',
          message: e.message,
          trace: e.stack,
          vertex: cardManager.key,
        });
      }
    },
    openAttachment: (file) => {
      const tempCard = cardManager.getVertexProxy();
      const close = toastProvider.displayToast({
        text: `Downloading ${file.filename}...`,
      });
      fileUploader
        .download(tempCard.workspaceKey, currentUser, file)
        .then(() => {
          close();
          logger.log({
            severity: 'INFO',
            event: 'AttachmentDownloadSuccess',
            uiSource: source,
            vertex: cardManager.key,
          });
        })
        .catch((err: Error) => {
          close();
          toastProvider.displayToast({
            text: 'Failed to download attachment',
            duration: 3000,
          });
          logger.log({
            severity: 'INFO',
            error: 'AttachmentRemovalFailed',
            uiSource: source,
            vertex: cardManager.key,
            message: err.message,
            trace: err.stack,
          });
        });
    },
  };
}
