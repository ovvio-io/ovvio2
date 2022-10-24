import { wordDist } from '@ovvio/cfds/lib/primitives-old/plaintext';
import React from 'react';
import { MentionPopup } from 'shared/multi-select/drawer/actions/mention';
import { styleguide } from '@ovvio/styles/lib';
import Menu from '@ovvio/styles/lib/components/menu';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';

const useStyles = makeStyles(theme => ({
  popup: {
    backgroundColor: theme.background[0],
    width: styleguide.gridbase * 32,
    marginBottom: styleguide.gridbase * 2,
  },
}));
export enum SORT_VALUES {
  TOP = 'TOP',
  BOTTOM = 'BOTTOM',
}
function calculateDist(sortValue: string | SORT_VALUES, filter: string) {
  switch (sortValue) {
    case SORT_VALUES.TOP: {
      return 100;
    }
    case SORT_VALUES.BOTTOM: {
      return 0;
    }
    default: {
      return wordDist(sortValue.toLowerCase(), filter.toLowerCase());
    }
  }
}

type RenderItemFunction<T> = (props: {
  item: T;
  [key: string]: any;
}) => JSX.Element | null;
interface SelectionPopupProps<T> {
  close?: () => void;
  onSelected: (item: T) => void;
  trigger?: string;
  getItems: (filter: string) => SelectionItem<T>[];
  renderItem: RenderItemFunction<T>;
}
function SelectionPopup<T>({
  close,
  onSelected,
  trigger,
  getItems,
  renderItem,
}: SelectionPopupProps<T>) {
  const getItemsImpl = (filter: string) =>
    getItems(filter)
      .map(item => ({
        value: item.value,
        key:
          (item.value as any).key || (item.value as any).id || item.sortValue,
        dist: calculateDist(item.sortValue, filter),
        isFixed:
          item.sortValue === SORT_VALUES.BOTTOM ||
          item.sortValue === SORT_VALUES.TOP,
      }))
      .filter(x => !filter || x.dist > filter.length * 0.1 || x.isFixed)
      .sort((a, b) => b.dist - a.dist);

  const onSelectedImpl = item => {
    const { value } = item;

    onSelected(value);
  };
  const renderItemImpl = (item, props) =>
    renderItem({ ...props, item: item.value, key: item.key });

  return (
    <MentionPopup
      getItems={getItemsImpl}
      trigger={trigger}
      onSelected={onSelectedImpl}
      renderItem={renderItemImpl}
    />
  );
}

export interface SelectionItem<T> {
  value: T;
  sortValue: string | SORT_VALUES;
}

interface SelectionButtonProps<T> {
  className?: string;
  children: any;
  onSelected: (item: T) => void;
  trigger?: string;
  getItems: (filter: string) => SelectionItem<T>[];
  renderItem: RenderItemFunction<T>;
  style?: {};
}
export default function SelectionButton<T>({
  className,
  children,
  onSelected,
  renderItem,
  getItems,
  trigger = '',
  style = {},
}: SelectionButtonProps<T>) {
  const styles = useStyles();
  return (
    <Menu
      renderButton={children}
      position="top"
      align="center"
      direction="in"
      className={className}
      style={style}
      popupClassName={cn(styles.popup)}
    >
      <SelectionPopup
        onSelected={onSelected}
        trigger={trigger}
        renderItem={renderItem}
        getItems={getItems}
      />
    </Menu>
  );
}
