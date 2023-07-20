import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Note } from '@ovvio/cfds/lib/client/graph/vertices';
import { Draggable } from 'shared/dragndrop';
import { styleguide } from '@ovvio/styles/lib';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { CardSize } from '../card-item';
import { DraggableCard } from '../card-item/draggable-card';

const useStyles = makeStyles(theme => ({
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
          card={card}
          className={cn(styles.item)}
        />
      )}
    </Draggable>
  );
}
