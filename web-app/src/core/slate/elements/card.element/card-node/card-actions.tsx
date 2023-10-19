import React, { useCallback } from 'react';
import { useSlateStatic } from 'slate-react';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import { Note } from '../../../../../../../cfds/client/graph/vertices/note.ts';
import { useDueDate } from '../../../../../shared/components/due-date-editor/index.tsx';
import { usePartialVertex } from '../../../../cfds/react/vertex.ts';
import CardMenuView from '../../../../../shared/item-menu/index.tsx';
import { formatTimeDiff } from '../../../../../../../styles/utils/dateutils.ts';
import { layout, styleguide } from '../../../../../../../styles/index.ts';
import { IconButton } from '../../../../../../../styles/components/buttons.tsx';
import { IconCalendar } from '../../../../../../../styles/components/icons/index.ts';
import { Tooltip } from '../../../../../../../styles/components/tooltip/index.tsx';
import {
  makeStyles,
  cn,
} from '../../../../../../../styles/css-objects/index.ts';
import { useLogger } from '../../../../cfds/react/logger.tsx';

const useStyles = makeStyles((theme) => ({
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
      <DueDateIndicator card={card} />
      <CardMenuView
        cardManager={card}
        source={'editor:body:inline-task'}
        editorRootKey={editorRootKey}
        allowsEdit={true}
        editor={editor}
      />
    </div>
  );
}

function DueDateIndicator({ card }: { card: VertexManager<Note> }) {
  const { dueDate } = usePartialVertex(card, ['dueDate']);
  const dueDateEditor = useDueDate();
  const logger = useLogger();

  if (!dueDate) {
    return null;
  }

  const onClick = () => {
    logger.log({
      severity: 'INFO',
      event: 'Start',
      flow: 'edit',
      type: 'due',
      source: 'editor:body:inline-task',
      vertex: card.key,
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
