import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Note } from '@ovvio/cfds/lib/client/graph/vertices';
import { EventCategory, useEventLogger } from 'core/analytics';
import { usePartialVertex } from 'core/cfds/react/vertex';
import { formatTimeDiff } from 'core/dateutils';
import { createUseStrings, format } from 'core/localization';
import { AttachmentItem } from 'core/slate/elements/card.element/card-node/card-actions';
import { MouseEvent, useCallback } from 'react';
import { useAttachments } from 'shared/attachments';
import { CARD_SOURCE } from 'shared/card';
import { useDueDate } from 'shared/components/due-date-editor';
import { layout, styleguide } from '@ovvio/styles/lib';
import { Button } from '@ovvio/styles/lib/components/buttons';
import {
  IconAttachment,
  IconCalendar,
} from '@ovvio/styles/lib/components/icons';
import { IconContent } from '@ovvio/styles/lib/components/new-icons/icon-content';
import Menu from '@ovvio/styles/lib/components/menu';
import { Text } from '@ovvio/styles/lib/components/texts';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { useTheme } from '@ovvio/styles/lib/theme';
import { CardSize } from '.';
import localization from './card.strings.json';

export const FOOTER_HEIGHT = styleguide.gridbase * 2;

const useStyles = makeStyles(theme => ({
  footer: {
    alignItems: 'center',
    minHeight: styleguide.gridbase,
    color: theme.background.textSecondary,
    basedOn: [layout.row],
  },
  footerItem: {
    marginTop: styleguide.gridbase * 0.5,
    height: FOOTER_HEIGHT,
  },
  attachments: {
    alignItems: 'center',
    basedOn: [layout.row],
  },
  attachment: {
    color: theme.background.textSecondary,
  },
  margin: {
    marginRight: styleguide.gridbase,
  },
}));

const useStrings = createUseStrings(localization);

export interface CardFooterProps {
  card: VertexManager<Note>;
  source: CARD_SOURCE;
  size?: CardSize;
  className?: string;
}

function Attachments({ card, source }: CardFooterProps) {
  const styles = useStyles();
  const { attachments, openAttachment, removeAttachment } = useAttachments(
    card,
    source
  );
  const strings = useStrings();

  const renderButton = useCallback(
    () => (
      <div className={cn(styles.attachments)}>
        <IconAttachment size="small" />
        <Text className={cn(styles.attachment)}>
          {attachments.length === 1
            ? strings.singleAttachment
            : format(strings.multipleAttachments, {
                count: attachments.length,
              })}
        </Text>
      </div>
    ),
    [attachments, strings, styles]
  );

  if (!attachments?.length) {
    return null;
  }

  return (
    <Menu renderButton={renderButton} className={cn(styles.footerItem)}>
      {attachments.map(file => (
        <AttachmentItem
          key={file.fileId}
          file={file}
          openAttachment={openAttachment}
          removeAttachment={removeAttachment}
        />
      ))}
    </Menu>
  );
}

function DueDateIndicator({ card, source }: CardFooterProps) {
  const styles = useStyles();
  const { dueDate } = usePartialVertex(card, ['dueDate']);
  const dueDateEditor = useDueDate();
  const eventLogger = useEventLogger();
  const theme = useTheme();
  if (!dueDate) {
    return null;
  }
  const onClick = (e: MouseEvent) => {
    e.stopPropagation();
    eventLogger.cardAction('CARD_SET_DUE_DATE_STARTED', card, {
      category: EventCategory.CARD_LIST,
      source: source,
    });
    dueDateEditor.edit(card.getVertexProxy());
  };

  const isOverdue = dueDate < new Date();
  const color = isOverdue ? theme.primary[400] : theme.background.textSecondary;

  return (
    <Button className={cn(styles.footerItem)} onClick={onClick}>
      <IconCalendar fill={color} />
      <Text style={{ color }}>{formatTimeDiff(dueDate)}</Text>
    </Button>
  );
}

function ContentIndicator({ card }: { card: VertexManager<Note> }) {
  const { bodyPreview } = usePartialVertex(card, ['bodyPreview']);
  const styles = useStyles();
  if (!bodyPreview.trim()) {
    return null;
  }

  return (
    <div className={cn(styles.footerItem, styles.margin)}>
      <IconContent />
    </div>
  );
}

export function CardFooter({
  card,
  source,
  className,
  size = CardSize.Regular,
}: CardFooterProps) {
  const styles = useStyles();
  return (
    <div className={cn(styles.footer, className)}>
      {size === CardSize.Small && <ContentIndicator card={card} />}
      <Attachments card={card} source={source} />
      <div className={cn(layout.flexSpacer)} />
      <DueDateIndicator card={card} source={source} />
    </div>
  );
}
