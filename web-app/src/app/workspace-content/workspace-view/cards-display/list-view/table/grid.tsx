import { styleguide } from '@ovvio/styles';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import React from 'react';
export enum GridColumns {
  DragAnchor = 'dragAnchor',
  Type = 'icon',
  Title = 'title',
  Expander = 'expander',
  ContentIndicator = 'contentIndicator',
  Workspace = 'workspace',
  Assignees = 'assignees',
  Tags = 'tags',
  Extra = 'extra',
  DueDate = 'dueDate',
  Pin = 'pin',
  Menu = 'menu',
}

export const useGridStyles = makeStyles(
  () => ({
    container: {
      display: 'grid',
      gridTemplateColumns: [
        // [`[${GridColumns.DragAnchor}]`, styleguide.gridbase * 3],
        [`[${GridColumns.Type}]`, styleguide.gridbase * 4],
        [`[${GridColumns.Title}]`, 'minmax(min-content, auto)'],
        [`[${GridColumns.Expander}]`, styleguide.gridbase * 4],
        [`[${GridColumns.ContentIndicator}]`, styleguide.gridbase * 4],
        [`[${GridColumns.Workspace}]`, styleguide.gridbase * 10],
        [`[${GridColumns.Assignees}]`, 'max-content'],
        [`[${GridColumns.Tags}]`, 'max-content'],
        [
          `[${GridColumns.Extra}]`,
          `minmax(max-content, ${styleguide.gridbase * 20}px)`,
        ],
        [`[${GridColumns.DueDate}]`, 'max-content'],
        [`[${GridColumns.Pin}]`, styleguide.gridbase * 3],
        [`[${GridColumns.Menu}]`, styleguide.gridbase * 4],
      ],
      gridAutoRows: 'min-content',
      alignItems: 'stretch',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
    },
  }),
  'table_01387e'
);

export interface ItemsTableProps {
  className?: string;
}

export const _ItemsTable: React.FC<ItemsTableProps> = ({
  children,
  className,
}) => {
  const styles = useGridStyles();
  return <div className={cn(styles.container)}>{children}</div>;
};

export const ItemsTable: React.FC<ItemsTableProps> = ({
  children,
  className,
}) => {
  const styles = useGridStyles();
  return (
    <table className={cn(styles.table)}>
      <tbody>{children}</tbody>
    </table>
  );
};
