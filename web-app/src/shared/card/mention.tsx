import React, { useState, useRef, useLayoutEffect } from 'react';
import { makeStyles, cn } from '../../../../styles/css-objects/index.ts';
import { styleguide, layout } from '../../../../styles/index.ts';
import { TextField } from '../../../../styles/components/inputs/index.ts';
import {
  LineSeparator,
  useMenuClose,
} from '../../../../styles/components/menu.tsx';
import { useFocusOnMount } from '../../core/react-utils/index.ts';
import {
  Scroller,
  useScrollParent,
} from '../../core/react-utils/scrolling.tsx';
import { IconSearch } from '../../../../styles/components/new-icons/icon-search.tsx';
import { brandLightTheme } from '../../../../styles/theme.tsx';

const useStyles = makeStyles((theme) => ({
  popup: {
    backgroundColor: theme.background[0],
    // width: styleguide.gridbase * 16.5,
    marginBottom: styleguide.gridbase * 2,
  },
  popupContent: {
    backgroundColor: theme.background[0],
    boxSizing: 'border-box',
    basedOn: [layout.column],
  },
  list: {
    width: '100%',
    maxHeight: styleguide.gridbase * 6 * 5,
    overflowY: 'auto',
    basedOn: [layout.column],
  },

  searchContainer: {
    display: 'flex',
    padding: '6px 8px 6px 10px',
    alignItems: 'center',
    flexShrink: 0,
    background: 'var(--secondary-secondary-s-0, #FFFBF5)',
  },

  iconContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  input: {
    display: 'flex',
    height: '20px',
    flexDirection: 'column',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
    background: 'var(--secondary-secondary-s-0, #FFFBF5)',
    color: 'var(--monochrom-m-10, #262626)',
    fontFeatureSettings: "'clig' off, 'liga' off",
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontFamily: 'Poppins',
    fontSize: '13px',
    fontStyle: 'normal',
    fontWeight: 400,
    lineHeight: 'normal',
    letterSpacing: '0.075px',
    border: 'none',
    borderRadius: 0,
    width: '140px',
  },
  mention: {
    flexShrink: 0,
    width: '100%',
    height: styleguide.gridbase * 4,
    padding: [0, styleguide.gridbase],
    boxSizing: 'border-box',
    backgroundColor: theme.background[0],
    alignItems: 'center',
    cursor: 'pointer',
    basedOn: [layout.row],
    borderBottom: `2px solid ${brandLightTheme.secondary.s2}`,

    ':hover': {
      backgroundColor: brandLightTheme.secondary.s3,
    },
    transition: 'background-color 0.15s linear',
  },
  selected: {
    // backgroundColor: "#f0f3fa",
  },
}));

export type MentionItemProps = React.PropsWithChildren<{
  isSelected?: boolean;
  onClick?: React.MouseEventHandler;
}>;

export function MentionItem({
  isSelected = false,
  children,
  onClick,
}: MentionItemProps) {
  const styles = useStyles();
  const ref = useRef<HTMLDivElement>(null);
  const scrollParent = useScrollParent();
  useLayoutEffect(() => {
    if (isSelected && scrollParent /*&& scrollParent.current*/) {
      const parent = scrollParent; //.current;
      const el = ref.current;
      const scrollOffset = el!.offsetTop - parent.offsetTop;
      const height = el!.clientHeight;
      if (scrollOffset < parent.scrollTop) {
        el!.scrollIntoView();
      } else if (
        scrollOffset + height >
        parent.scrollTop + parent.clientHeight
      ) {
        parent.scrollTop = scrollOffset + height - parent.clientHeight;
      }
      // const needsScroll =
      //   ((scrollOffset + height) > (parent.scrollTop + parent.clientHeight)) ||
      //   scrollOffset < parent.scrollTop;

      // if (needsScroll) {
      //   parent.scrollTop = scrollOffset;
      // }
    }
  }, [scrollParent, isSelected]);
  return (
    <div
      onClick={onClick}
      className={cn(styles.mention, isSelected && styles.selected)}
      ref={ref}
    >
      {children}
    </div>
  );
}

export interface MentionPopupRenderItemOpts {
  isSelected: boolean;
  onClick: () => void;
}

export type MentionPopupRenderItem<T> = (
  item: T,
  opts: MentionPopupRenderItemOpts
) => React.ReactNode;

export interface MentionPopupProps<T> {
  trigger: string;
  onSelected: (item: T, filter: string) => void;
  getItems: (filter: string) => T[];
  renderItem: MentionPopupRenderItem<T>;
}

export function MentionPopup<T>({
  trigger,
  onSelected,
  getItems,
  renderItem,
}: MentionPopupProps<T>) {
  const close = useMenuClose();
  const styles = useStyles();
  const ref = useRef(null);
  useFocusOnMount(ref);
  const [filter, setFilter] = useState(trigger);
  const onChange = ({ target }: React.FormEvent<HTMLInputElement>) => {
    let { value } = target as HTMLInputElement;

    if (!value.startsWith(trigger)) {
      value = `${trigger}${value}`;
    }
    setFilter(value);
  };

  const [selectedIndex, setSelectedIndex] = useState(0);
  const select = (item: T) => {
    onSelected(item, filter);
    close();
  };
  const items = getItems(filter.substring(trigger.length));
  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((x) => (x - 1 < 0 ? items.length - 1 : x - 1));
        break;
      case 'ArrowDown':
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((x) => (x + 1) % items.length);
        break;
      case 'Backspace':
        if (!filter) {
          e.preventDefault();
          e.stopPropagation();
          close();
        }
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        close();
        break;
      case 'Enter':
        e.preventDefault();
        e.stopPropagation();
        select(items[selectedIndex]);
        break;
      default:
        return;
    }
  };
  return (
    <div className={cn(styles.popupContent)}>
      <div className={cn(styles.searchContainer)}>
        <div className={cn(styles.iconContainer)}>
          <IconSearch />
        </div>
        <TextField
          className={cn(styles.input)}
          type="text"
          // value={filter} //puts "#" in the tags dropdown menu
          onChange={onChange}
          onKeyDown={onKeyDown}
          ref={ref}
        />
      </div>
      <LineSeparator />
      <Scroller>
        {(ref) => (
          <div className={cn(styles.list)} ref={ref}>
            {items.map((item, i) => (
              <>
                {renderItem(item, {
                  isSelected: i === selectedIndex,
                  onClick: () => select(item),
                })}
                {i !== items.length - 1 && (
                  <>
                    <LineSeparator />
                    {i != items.length - 2 && <LineSeparator />}
                  </>
                )}
                {i == items.length - 2 ? (
                  <>
                    <div style={{ height: '8px' }}></div>
                    <LineSeparator />
                  </>
                ) : (
                  ''
                )}
              </>
            ))}
          </div>
        )}
      </Scroller>
    </div>
  );
}
