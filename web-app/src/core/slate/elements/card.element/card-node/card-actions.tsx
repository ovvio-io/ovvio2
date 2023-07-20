import { AttachmentData } from '@ovvio/cfds/lib/base/scheme-types';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Note } from '@ovvio/cfds/lib/client/graph/vertices';
import { useDueDate } from 'shared/components/due-date-editor';
import { EventCategory, useEventLogger } from 'core/analytics';
import { usePartialVertex } from 'core/cfds/react/vertex';
import { formatTimeDiff } from 'core/dateutils';
import { useCallback } from 'react';
import { useAttachments } from 'shared/attachments';
import CardMenuView from 'shared/item-menu';
import { CARD_SOURCE } from 'shared/card';
import { useSlateStatic } from 'slate-react';
import { layout, styleguide } from '@ovvio/styles/lib';
import { IconButton } from '@ovvio/styles/lib/components/buttons';
import {
  IconAttachment,
  IconCalendar,
  IconExportPdf,
} from '@ovvio/styles/lib/components/icons';
import Menu, { MenuItem } from '@ovvio/styles/lib/components/menu';
import SpinnerView from '@ovvio/styles/lib/components/spinner-view';
import { Text } from '@ovvio/styles/lib/components/texts';
import { Tooltip } from '@ovvio/styles/lib/components/tooltip';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { useTheme } from '@ovvio/styles/lib/theme';

const useStyles = makeStyles(theme => ({
  actionsContainer: {
    height: styleguide.gridbase * 4,
    alignItems: 'center',
    basedOn: [layout.row],
  },
  uploading: {
    color: theme.background.placeholderText,
  },
}));

export interface CardActionsProps {
  editorRootKey: string;
  card: VertexManager<Note>;
  className?: string;
}

export function CardActions({
  editorRootKey,
  card,
  className,
}: CardActionsProps) {
  const styles = useStyles();
  const editor = useSlateStatic();
  return (
    <div
      contentEditable={false}
      className={cn(styles.actionsContainer, className)}
    >
      <AttachmentsIndicator card={card} />
      <DueDateIndicator card={card} />
      <CardMenuView
        cardManager={card}
        source={CARD_SOURCE.CHILD}
        editorRootKey={editorRootKey}
        allowsEdit={true}
        editor={editor}
      />
    </div>
  );
}

function AttachmentsIndicator({ card }: { card: VertexManager<Note> }) {
  const { attachments, removeAttachment, openAttachment } = useAttachments(
    card,
    CARD_SOURCE.CHILD
  );

  const renderButton = useCallback(() => <IconAttachment />, []);

  if (!attachments.length) {
    return null;
  }

  return (
    <Menu renderButton={renderButton}>
      {attachments.map(attachment => (
        <AttachmentItem
          key={attachment.fileId}
          file={attachment}
          removeAttachment={removeAttachment}
          openAttachment={openAttachment}
        />
      ))}
    </Menu>
  );
}

interface AttachmentItemProps {
  file: AttachmentData;
  removeAttachment: (file: AttachmentData) => void;
  openAttachment: (file: AttachmentData) => void;
}

export function AttachmentItem({
  file,
  removeAttachment,
  openAttachment,
  ...rest
}: AttachmentItemProps) {
  const styles = useStyles();
  const { inProgress } = file;
  const onClick = () => {
    if (inProgress) {
      return false;
    }
    openAttachment(file);
  };
  const theme = useTheme();

  return (
    <MenuItem {...rest} onClick={onClick}>
      {inProgress ? (
        <SpinnerView
          size={styleguide.gridbase * 2}
          color={theme.background.placeholderText}
        />
      ) : (
        <IconExportPdf />
      )}
      <Text className={cn(inProgress && styles.uploading)}>
        {file.filename}
      </Text>
    </MenuItem>
  );
}

function DueDateIndicator({ card }: { card: VertexManager<Note> }) {
  const { dueDate } = usePartialVertex(card, ['dueDate']);
  const dueDateEditor = useDueDate();
  const eventLogger = useEventLogger();

  if (!dueDate) {
    return null;
  }

  const onClick = () => {
    eventLogger.cardAction('CARD_SET_DUE_DATE_STARTED', card, {
      category: EventCategory.EDITOR,
      source: CARD_SOURCE.CHILD,
    });
    dueDateEditor.edit(card.getVertexProxy());
  };

  const isOverdue = dueDate < new Date();

  return (
    <Tooltip text={`Due by ${formatTimeDiff(dueDate)}`}>
      <IconButton onClick={onClick}>
        <IconCalendar fill={isOverdue ? '#fe4a62' : '#9cb2cd'} />
      </IconButton>
    </Tooltip>
  );
}
