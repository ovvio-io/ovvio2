import React from 'react';
import { wordDist } from '../../../../cfds/client/suggestions.ts';
import { styleguide } from '../../../../styles/styleguide.ts';
import Menu, { MenuRenderButton } from '../../../../styles/components/menu.tsx';
import { makeStyles, cn } from '../../../../styles/css-objects/index.ts';
import { MentionPopup, MentionPopupRenderItemOpts } from '../card/mention.tsx';
import { CoreObject } from '../../../../base/core-types/base.ts';

const useStyles = makeStyles((theme) => ({
  popup: {
    backgroundColor: theme.background[0],
    // width: "100%",
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

interface RenderItemFunctionProps<T> {
  item: T;
  key?: string;
}

type RenderItemFunction<
  T,
  PT extends RenderItemFunctionProps<T> = RenderItemFunctionProps<T>
> = (props: PT) => React.ReactNode;

interface SelectionPopupProps<T> {
  onSelected: (item: T) => void;
  trigger?: string;
  getItems: (filter: string) => SelectionItem<T>[];
  renderItem: RenderItemFunction<T>;
}

interface SelectionPopupItemInternal<T> {
  value: T;
  key: string;
  dist: number;
  isFixed: boolean;
}
export function SelectionPopup<T>({
  onSelected,
  trigger,
  getItems,
  renderItem,
}: SelectionPopupProps<T>) {
  const getItemsImpl = (filter: string) =>
    getItems(filter)
      .map(
        (item) =>
          ({
            value: item.value,
            key:
              (item.value as any).key ||
              (item.value as any).id ||
              item.sortValue,
            dist: calculateDist(item.sortValue, filter),
            isFixed:
              item.sortValue === SORT_VALUES.BOTTOM ||
              item.sortValue === SORT_VALUES.TOP,
          } as SelectionPopupItemInternal<T>)
      )
      .filter((x) => !filter || x.dist > filter.length * 0.1 || x.isFixed)
      .sort((a, b) => b.dist - a.dist);
  // debugger;
  const onSelectedImpl = (item: SelectionPopupItemInternal<T>) => {
    const { value } = item;

    onSelected(value);
  };
  const renderItemImpl = (
    item: SelectionPopupItemInternal<T>,
    opts: MentionPopupRenderItemOpts
  ) => renderItem({ ...opts, item: item.value, key: item.key });

  return (
    <MentionPopup
      getItems={getItemsImpl}
      trigger={trigger || ''}
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
  children: MenuRenderButton;
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
      position="bottom"
      align="end"
      direction="out"
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
