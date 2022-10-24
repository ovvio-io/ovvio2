import { useState, useRef, useLayoutEffect } from 'react';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { styleguide, layout } from '@ovvio/styles/lib';
import { useFocusOnMount } from 'core/react-utils';
import { TextField } from '@ovvio/styles/lib/components/inputs';
import { Scroller, useScrollParent } from 'core/react-utils/scrolling';
import { useMenuClose } from '@ovvio/styles/lib/components/menu';

const useStyles = makeStyles(theme => ({
  popup: {
    backgroundColor: theme.background[0],
    width: styleguide.gridbase * 32,
    marginBottom: styleguide.gridbase * 2,
  },
  popupContent: {
    backgroundColor: theme.background[0],
    width: '100%',
    boxSizing: 'border-box',
    basedOn: [layout.column],
  },
  list: {
    width: '100%',
    maxHeight: styleguide.gridbase * 6 * 5,
    overflowY: 'auto',
    basedOn: [layout.column],
  },
  input: {
    border: 'none',
    width: '100%',
    borderBottom: '1px solid rgba(156, 178, 205, 0.6)',
    borderRadius: 0,
  },
  mention: {
    flexShrink: 0,
    width: '100%',
    height: styleguide.gridbase * 6,
    padding: [0, styleguide.gridbase],
    boxSizing: 'border-box',
    backgroundColor: theme.background[0],
    alignItems: 'center',
    cursor: 'pointer',
    basedOn: [layout.row],
  },
  selected: {
    backgroundColor: '#f0f3fa',
  },
}));

export function MentionItem({ isSelected = false, children, onClick = null }) {
  const styles = useStyles();
  const ref = useRef();
  const scrollParent = useScrollParent();
  useLayoutEffect(() => {
    if (isSelected && scrollParent && scrollParent.current) {
      const parent = scrollParent.current;
      const el = ref.current;
      const scrollOffset = el.offsetTop - parent.offsetTop;
      const height = el.clientHeight;
      if (scrollOffset < parent.scrollTop) {
        el.scrollIntoView();
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

export function MentionPopup({ trigger, onSelected, getItems, renderItem }) {
  const close = useMenuClose();
  const styles = useStyles();
  const ref = useRef();
  useFocusOnMount(ref);
  const [filter, setFilter] = useState(trigger);
  const onChange = ({ target }) => {
    let { value } = target;

    if (!value.startsWith(trigger)) {
      value = `${trigger}${value}`;
    }
    setFilter(value);
  };

  const [selectedIndex, setSelectedIndex] = useState(0);
  const select = item => {
    onSelected(item, filter);
    close();
  };
  const items = getItems(filter.substring(trigger.length));
  const onKeyDown = e => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(x => (x - 1 < 0 ? items.length - 1 : x - 1));
        break;
      case 'ArrowDown':
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(x => (x + 1) % items.length);
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
      <TextField
        className={cn(styles.input)}
        type="text"
        value={filter}
        onChange={onChange}
        onKeyDown={onKeyDown}
        ref={ref}
      />
      <Scroller>
        {ref => (
          <div className={cn(styles.list)} ref={ref}>
            {items.map((item, i) =>
              renderItem(item, {
                isSelected: i === selectedIndex,
                onClick: () => select(item),
              })
            )}
          </div>
        )}
      </Scroller>
    </div>
  );
}
