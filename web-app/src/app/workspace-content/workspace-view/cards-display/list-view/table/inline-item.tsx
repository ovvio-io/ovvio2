import React from 'https://esm.sh/react@18.2.0';
import {
  cn,
  makeStyles,
} from '../../../../../../../../styles/css-objects/index.ts';
import { GridColumns } from './grid.tsx';
import { Cell, useRowStyles } from './item.tsx';

const useStyles = makeStyles(
  (theme) => ({
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
