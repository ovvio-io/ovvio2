import React, { ChangeEvent, useEffect, useRef, useState } from 'react';
import { User } from '../cfds/client/graph/vertices/user.ts';
import { cn, makeStyles } from '../styles/css-objects/index.ts';
import { suggestResults } from '../cfds/client/suggestions.ts';
import { styleguide } from '../styles/styleguide.ts';
import { useFocusOnMount } from '../web-app/src/core/react-utils/index.ts';
import { Scroller } from '../styles/utils/scrolling/index.tsx';
import { IconSearch } from '../styles/components/new-icons/icon-search.tsx';
import { LineSeparator, useMenuContext } from '../styles/components/menu.tsx';
import Input from './input.tsx';
import { Tag } from '../cfds/client/graph/vertices/tag.ts';

const useStyles = makeStyles(() => ({
  tableContainer: {
    maxHeight: styleguide.gridbase * 21,
    maxWidth: styleguide.gridbase * 21,
  },
  tableContent: {
    width: '100%',
    overflowY: 'auto',
    overflowX: 'clip',
    flexDirection: 'column',
    maxHeight: styleguide.gridbase * 16,
  },
  hoverableRow: {
    cursor: 'pointer',
    ':hover': {
      backgroundColor: '#FBF6EF',
    },
  },
  row: {
    paddingLeft: '8px',
    alignItems: 'center',
    width: '100%',
    height: '32px',
    minHeight: '32px',
    minWidth: '120px',
    display: 'flex',
    fontSize: 13,
    lineHeight: '18px',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  },
  searchRowStyle: {
    display: 'flex',
    padding: '0px 0px 0px 8px',
    marginBottom: 'none',
    alignItems: 'center',
    boxShadow: 'none',
    width: 'none',
    height: '32px',
    borderRadius: 'none',
    backgroundColor: '#FFFBF5',
    justifyContent: 'flex-start',
    cursor: 'default',
    borderBottom: '2px solid var(--Secondary-S2, #F5ECDC)',
  },
  InputTextStyle: {
    flexGrow: 1,
    border: 'none',
    outline: 'none',
    width: '100%',
    fontSize: '13px',
    letterSpacing: '0.075px',
    backgroundColor: '#FFFBF5',
  },
  iconContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeIcon: {
    marginTop: 2,
  },
  selectedItem: {
    backgroundColor: '#FBF6EF',
  },
}));

type TagPickerProps = {
  tags: Tag[];
  onRowSelect: (tag: Tag) => void;
  showSearch?: boolean;
  onRemove?: () => void;
  onClearTags?: () => void;
  closeAfterClick?: boolean;
};

export default function TagPicker({
  tags,
  onRowSelect,
  showSearch,
  onRemove,
  onClearTags,
  closeAfterClick,
}: TagPickerProps) {
  const styles = useStyles();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuCtx = useMenuContext();
  useFocusOnMount(inputRef);
  const componentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tags) {
      const filtered = suggestResults(
        searchTerm,
        tags,
        (t) => t.name,
        Number.MAX_SAFE_INTEGER
      );
      setFilteredTags(filtered);
    }
  }, [searchTerm, tags]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        componentRef.current &&
        !componentRef.current.contains(event.target as Node)
      ) {
        menuCtx.close();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuCtx]);
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value || '');
  };

  const handleRowClick = (
    tag: Tag,
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    event.stopPropagation();
    onRowSelect(tag);
    if (closeAfterClick) menuCtx.close();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((x) => (x - 1 < 0 ? filteredTags.length - 1 : x - 1));
        break;
      case 'ArrowDown':
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((x) => (x + 1) % filteredTags.length);
        break;
      case 'Backspace':
        if (!searchTerm) {
          e.preventDefault();
          e.stopPropagation();
          menuCtx.close();
        }
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        if (!searchTerm) {
          menuCtx.close();
        }
        break;
      case 'Enter':
        e.preventDefault();
        e.stopPropagation();
        onRowSelect(filteredTags[selectedIndex]);
        break;
      default:
        return;
    }
  };

  return (
    <div ref={componentRef} className={cn(styles.tableContainer)}>
      {showSearch !== false && (
        <div className={cn(styles.searchRowStyle)}>
          <div className={cn(styles.iconContainer)}>
            <IconSearch />
          </div>
          <Input
            ref={inputRef}
            type="text"
            placeholder={'Search tag:'}
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyDown={onKeyDown}
            className={styles.InputTextStyle}
          />
        </div>
      )}
      <Scroller>
        {(inputRef) => (
          <div
            className={cn(styles.tableContent)}
            ref={inputRef}
            onKeyDown={onKeyDown}
          >
            {filteredTags.map((tag: Tag, index: number) => (
              <React.Fragment key={tag.key}>
                <div
                  key={tag.key}
                  className={cn(
                    styles.hoverableRow,
                    selectedIndex === index && styles.selectedItem,
                    styles.row
                  )}
                  onClick={(event) => handleRowClick(tag, event)}
                >
                  #&nbsp;
                  <span style={{ marginLeft: '8px' }}>{tag.name}</span>
                </div>
                <LineSeparator />
              </React.Fragment>
            ))}

            {onRemove && (
              <>
                <div style={{ height: '8px', display: 'list-item' }}></div>
                <LineSeparator />
                <div
                  className={cn(styles.row, styles.hoverableRow)}
                  onClick={onRemove}
                >
                  <div className={cn(styles.iconContainer)}>
                    <img
                      className={cn(styles.removeIcon)}
                      src="/icons/design-system/Close.svg"
                    />
                  </div>
                  <div className={cn(styles.row)}>Remove</div>
                </div>
              </>
            )}
            {onClearTags && (
              <>
                <div style={{ height: '8px', display: 'list-item' }}></div>
                <LineSeparator />
                <div
                  className={cn(styles.row, styles.hoverableRow)}
                  onClick={onClearTags}
                >
                  <div className={cn(styles.iconContainer)}>
                    <img
                      className={cn(styles.removeIcon)}
                      src="/icons/design-system/Close.svg"
                    />
                  </div>
                  <div className={cn(styles.row)}>Clear Tags</div>
                </div>
              </>
            )}
          </div>
        )}
      </Scroller>
    </div>
  );
}
