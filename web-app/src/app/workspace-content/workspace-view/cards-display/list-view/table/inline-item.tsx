import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { GridColumns } from './grid';
import { Cell, useRowStyles } from './item';

const useStyles = makeStyles(
  theme => ({
    inline: {
      basedOn: [useRowStyles.row, useRowStyles.itemRow],
    },
  }),
  'inline-item_5c03e1'
);
export function InlineItem() {
  const styles = useStyles();
  const itemStyles = useRowStyles();

  return (
    <tr className={cn(styles.inline)}>
      <Cell
        className={cn(itemStyles.iconCell, itemStyles[GridColumns.Type])}
      ></Cell>
    </tr>
  );
}
