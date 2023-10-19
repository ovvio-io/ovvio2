import React, { MouseEvent, useCallback } from 'react';
import { formatTimeDiff } from '../../../../../../../base/date.ts';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import { Note } from '../../../../../../../cfds/client/graph/vertices/note.ts';
import { usePartialVertex } from '../../../../../core/cfds/react/vertex.ts';
import {
  createUseStrings,
  format,
} from '../../../../../core/localization/index.tsx';
import { useDueDate } from '../../../../../shared/components/due-date-editor/index.tsx';
import { layout, styleguide } from '../../../../../../../styles/index.ts';
import { Button } from '../../../../../../../styles/components/buttons.tsx';
import {
  IconAttachment,
  IconCalendar,
} from '../../../../../../../styles/components/icons/index.ts';
import { IconContent } from '../../../../../../../styles/components/new-icons/icon-content.tsx';
import Menu from '../../../../../../../styles/components/menu.tsx';
import { Text } from '../../../../../../../styles/components/texts.tsx';
import {
  makeStyles,
  cn,
} from '../../../../../../../styles/css-objects/index.ts';
import { useTheme } from '../../../../../../../styles/theme.tsx';
import { CardSize } from './index.tsx';
// import localization from './card.strings.json' assert { type: 'json' };
import { UISource } from '../../../../../../../logging/client-events.ts';
import { useLogger } from '../../../../../core/cfds/react/logger.tsx';

export const FOOTER_HEIGHT = styleguide.gridbase * 2;

const useStyles = makeStyles((theme) => ({
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

// const useStrings = createUseStrings(localization);

export interface CardFooterProps {
  card: VertexManager<Note>;
  source: UISource;
  size?: CardSize;
  className?: string;
}

// function Attachments({ card, source }: CardFooterProps) {
//   const styles = useStyles();
//   const { attachments, openAttachment, removeAttachment } = useAttachments(
//     card,
//     source
//   );
//   const strings = useStrings();

//   const renderButton = useCallback(
//     () => (
//       <div className={cn(styles.attachments)}>
//         <IconAttachment size="small" />
//         <Text className={cn(styles.attachment)}>
//           {attachments.length === 1
//             ? strings.singleAttachment
//             : format(strings.multipleAttachments, {
//                 count: attachments.length,
//               })}
//         </Text>
//       </div>
//     ),
//     [attachments, strings, styles]
//   );

//   if (!attachments?.length) {
//     return null;
//   }

//   return (
//     <Menu renderButton={renderButton} className={cn(styles.footerItem)}>
//       {attachments.map((file) => (
//         <AttachmentItem
//           key={file.fileId}
//           file={file}
//           openAttachment={openAttachment}
//           removeAttachment={removeAttachment}
//         />
//       ))}
//     </Menu>
//   );
// }

function DueDateIndicator({ card, source }: CardFooterProps) {
  const styles = useStyles();
  const { dueDate } = usePartialVertex(card, ['dueDate']);
  const dueDateEditor = useDueDate();
  const logger = useLogger();
  const theme = useTheme();
  if (!dueDate) {
    return null;
  }
  const onClick = (e: MouseEvent) => {
    e.stopPropagation();
    logger.log({
      severity: 'INFO',
      event: 'Start',
      flow: 'edit',
      type: 'due',
      vertex: card.key,
      source,
    });
    dueDateEditor!.edit(card.getVertexProxy());
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
  const { dueDate } = usePartialVertex(card, ['dueDate']);
  return (
    <div className={cn(styles.footer, className)}>
      {size === CardSize.Small && <ContentIndicator card={card} />}
      <div className={cn(layout.flexSpacer)} />
      {dueDate && <DueDateIndicator card={card} source={source} />}
    </div>
  );
}
