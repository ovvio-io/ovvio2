import React from 'https://esm.sh/react@18.2.0';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import { Note } from '../../../../../../../cfds/client/graph/vertices/note.ts';
import { styleguide } from '../../../../../../../styles/styleguide.ts';
import {
  makeStyles,
  cn,
} from '../../../../../../../styles/css-objects/index.ts';
import { Draggable } from '../../../../../shared/dragndrop/draggable.tsx';
import { CardSize } from '../card-item/index.tsx';
import { DraggableCard } from '../card-item/draggable-card.tsx';

const useStyles = makeStyles((theme) => ({
  item: {
    marginBottom: styleguide.gridbase * 2,
  },
}));

export function BoardCard({
  card,
  index,
}: {
  card: VertexManager<Note>;
  index: number;
}) {
  const styles = useStyles();
  return (
    <Draggable data={card} index={index}>
      {(props, ref) => (
        <DraggableCard
          {...props}
          ref={ref}
          size={CardSize.Small}
          key={card.key}
          card={card}
          className={cn(styles.item)}
        />
      )}
    </Draggable>
  );
}
