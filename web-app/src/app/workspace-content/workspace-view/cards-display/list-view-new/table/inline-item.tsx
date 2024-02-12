import React from 'react';
import {
  makeStyles,
  cn,
} from '../../../../../../../../styles/css-objects/index.ts';
import { GridColumns } from './grid.tsx';
import { useRowStyles, Cell } from './item.tsx';

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
