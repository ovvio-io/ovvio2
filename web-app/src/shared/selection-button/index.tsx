import React from 'https://esm.sh/react@18.2.0';
import { wordDist } from '../../../../cfds/client/suggestions.ts';
import { MentionPopup } from '../../shared/multi-select/drawer/actions/mention.js';
import { styleguide } from '../../../../styles/styleguide.ts';
import Menu from '../../../../styles/components/menu.tsx';
import { makeStyles, cn } from '../../../../styles/css-objects/index.ts';

const useStyles = makeStyles((theme) => ({
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
      .map((item) => ({
        value: item.value,
        key:
          (item.value as any).key || (item.value as any).id || item.sortValue,
        dist: calculateDist(item.sortValue, filter),
        isFixed:
          item.sortValue === SORT_VALUES.BOTTOM ||
          item.sortValue === SORT_VALUES.TOP,
      }))
      .filter((x) => !filter || x.dist > filter.length * 0.1 || x.isFixed)
      .sort((a, b) => b.dist - a.dist);

  const onSelectedImpl = (item: SelectionItem<T>) => {
    const { value } = item;

    onSelected(value);
  };
  const renderItemImpl = (
    item: SelectionItem<T>,
    props: SelectionPopupProps<T>
  ) => renderItem({ ...props, item: item.value, key: item.key });

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
  key?: string;
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
