import React, { MouseEvent, useCallback } from 'react';
import { formatTimeDiff } from '../../../../../../../base/date.ts';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import { Note } from '../../../../../../../cfds/client/graph/vertices/note.ts';
import { usePartialVertex } from '../../../../../core/cfds/react/vertex.ts';
import { useDueDate } from '../../../../../shared/components/due-date-editor/index.tsx';
import { layout, styleguide } from '../../../../../../../styles/index.ts';
import { Button } from '../../../../../../../styles/components/buttons.tsx';
import {
  IconAttachment,
  IconDueDate,
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
import { DueDateState } from '../../../../../../../styles/components/new-icons/icon-due-date.tsx';
import AssigneesView from '../../../../../shared/card/assignees-view.tsx';
import CardMenuView from '../../../../../shared/item-menu/index.tsx';
import { CardTags } from './card-tag-view.tsx';
import { CardTagsNew } from './card-tag-view-new.tsx';

export const FOOTER_HEIGHT = styleguide.gridbase * 2;

const useStyles = makeStyles((theme) => ({
  footer: {
    minHeight: styleguide.gridbase,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  footerItem: {
    marginTop: styleguide.gridbase * 0.5,
    height: FOOTER_HEIGHT,
    gap: styleguide.gridbase * 0.5,
  },
  tagsAndAssignees: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  attachments: {
    alignItems: 'center',
    basedOn: [layout.row],
  },

  margin: {
    marginRight: styleguide.gridbase,
  },
  menu: {
    opacity: 0,
    transition: `${styleguide.transition.duration.short}ms linear opacity`,
  },
  menuVisible: {
    opacity: 1,
  },
  tagsContainer: {
    display: 'flex',
    maxWidth: '168px',
    flexDirection: 'row',
  },
}));

// const useStrings = createUseStrings(localization);

export interface CardFooterProps {
  card: VertexManager<Note>;
  source: UISource;
  size?: CardSize;
  className?: string;
  isExpanded?: boolean;
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

export function DueDateIndicator({ card, source }: CardFooterProps) {
  const styles = useStyles();
  const { dueDate } = usePartialVertex(card, ['dueDate']);
  const dueDateEditor = useDueDate();
  const logger = useLogger();
  if (!dueDate) {
    return null;
  }
  const onClick = (e: MouseEvent) => {
    e.stopPropagation();
    dueDateEditor!.edit(card.getVertexProxy());
  };

  const today = new Date();
  const isDueDateToday =
    dueDate.getDate() === today.getDate() &&
    dueDate.getMonth() === today.getMonth() &&
    dueDate.getFullYear() === today.getFullYear();

  const isOverdue = dueDate < today && !isDueDateToday;

  const color = isOverdue ? '#C25A3E' : isDueDateToday ? '#F9B55A' : '#3f3f3f';
  const fontSize = '10px';

  return (
    <Button className={cn(styles.footerItem)} onClick={onClick}>
      <IconDueDate
        state={
          isOverdue
            ? DueDateState.Late
            : isDueDateToday
            ? DueDateState.Today
            : DueDateState.None
        }
      />
      <Text style={{ color, fontSize }}>{formatTimeDiff(dueDate)}</Text>
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
  isExpanded,
  className,
  size = CardSize.Regular,
}: CardFooterProps) {
  const styles = useStyles();
  // const { dueDate } = usePartialVertex(card, ['dueDate']);
  return (
    <div className={cn(styles.footer, className)}>
      <div className={cn(styles.tagsAndAssignees)}>
        <AssigneesView
          cardManager={card}
          cardType="small"
          source={source}
          isExpanded={isExpanded}
        />
        <div className={cn(styles.tagsContainer)}>
          <CardTagsNew size={size} card={card} isExpanded={isExpanded} />
        </div>
      </div>
      {/* <div className={cn(layout.flexSpacer)} /> */}
      {/* {dueDate && <DueDateIndicator card={card} source={source} />} */}
    </div>
  );
}
