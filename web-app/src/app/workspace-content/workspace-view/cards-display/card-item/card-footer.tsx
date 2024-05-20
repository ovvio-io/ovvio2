import React, { MouseEvent, useCallback } from 'react';
import { formatTimeDiff } from '../../../../../../../base/date.ts';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import { Note } from '../../../../../../../cfds/client/graph/vertices/note.ts';
import { usePartialVertex } from '../../../../../core/cfds/react/vertex.ts';
import { useDueDate } from '../../../../../shared/components/due-date-editor/index.tsx';
import { layout, styleguide } from '../../../../../../../styles/index.ts';
import { Button } from '../../../../../../../styles/components/buttons.tsx';
import { IconDueDate } from '../../../../../../../styles/components/icons/index.ts';
import { IconContent } from '../../../../../../../styles/components/new-icons/icon-content.tsx';
import { Text } from '../../../../../../../styles/components/texts.tsx';
import {
  makeStyles,
  cn,
} from '../../../../../../../styles/css-objects/index.ts';
import { CardSize } from './index.tsx';
// import localization from './card.strings.json' assert { type: 'json' };
import { UISource } from '../../../../../../../logging/client-events.ts';
import { DueDateState } from '../../../../../../../styles/components/new-icons/icon-due-date.tsx';

export const FOOTER_HEIGHT = styleguide.gridbase * 2;

const useStyles = makeStyles((theme) => ({
  footer: {
    minHeight: styleguide.gridbase,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  footerItem: {
    display: 'flex',
    width: '89px',
    height: FOOTER_HEIGHT,
    paddingLeft: styleguide.gridbase * 0.5,
    gap: styleguide.gridbase * 0.5,
    justifyContent: 'flex-start',
  },
  footerItemBoard: {
    justifyContent: 'flex-end',
  },
  tagsAndAssignees: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '8px',
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
  isMouseOver?: boolean;
  multiIsActive?: boolean;
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

export function DueDateIndicator({
  card,
  source,
  className,
  isMouseOver,
}: CardFooterProps) {
  const styles = useStyles();
  const { dueDate } = usePartialVertex(card, ['dueDate']);
  const dueDateEditor = useDueDate();
  const onClick = (e: MouseEvent) => {
    e.stopPropagation();
    dueDateEditor!.edit(card.getVertexProxy());
  };
  if (!dueDate) {
    return (
      <Button
        className={cn(
          styles.footerItem,
          className,
          source === 'board' ? styles.footerItemBoard : ''
        )}
        onClick={onClick}>
        {isMouseOver ? (
          <img src="/icons/design-system/dueDate/addDueDateHovered.svg" />
        ) : (
          <img src="/icons/design-system/dueDate/addDueDate.svg" />
        )}
      </Button>
    );
  }

  const today = new Date();
  const isDueDateToday =
    dueDate.getDate() === today.getDate() &&
    dueDate.getMonth() === today.getMonth() &&
    dueDate.getFullYear() === today.getFullYear();

  const isOverdue = dueDate < today && !isDueDateToday;

  const color = isOverdue ? '#C25A3E' : isDueDateToday ? '#F9B55A' : '#3f3f3f';
  const fontSize = '10px';

  return (
    <Button
      className={cn(
        styles.footerItem,
        className,
        source === 'board' ? styles.footerItemBoard : ''
      )}
      onClick={onClick}>
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
