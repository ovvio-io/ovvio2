import React, { ChangeEvent, useEffect, useRef, useState } from 'react';
import { User } from '../cfds/client/graph/vertices/user.ts';
import { cn, makeStyles } from '../styles/css-objects/index.ts';
import { suggestResults } from '../cfds/client/suggestions.ts';
import { styleguide } from '../styles/styleguide.ts';
import { useFocusOnMount } from '../web-app/src/core/react-utils/index.ts';
import { Scroller } from '../styles/utils/scrolling/index.tsx';
import { IconSearch } from '../styles/components/new-icons/icon-search.tsx';
import { TextField } from '../styles/components/inputs/index.ts';
import { useMenuContext } from '../styles/components/menu.tsx';

const useStyles = makeStyles(() => ({
  tableContainer: {
    maxHeight: styleguide.gridbase * 21,
    maxWidth: styleguide.gridbase * 21,
  },
  tableContent: {
    overflowY: 'scroll',
    overflowX: 'clip',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: styleguide.gridbase * 16,
  },
  rowItem: {
    display: 'flex',
    height: '20px',
    flexDirection: 'column',
    justifyContent: 'center',
    fontSize: 13,
    lineHeight: '18px',
    letterSpacing: '0.0.75px',
    fontWeight: '400',
  },
  hoverableRow: {
    cursor: 'pointer',
    ':hover': {
      backgroundColor: '#FBF6EF',
    },
  },
  row: {
    padding: '6px 6px 6px 10px',
    alignItems: 'start',
    gap: '8px',
    width: '100%',
    borderBottom: '2px solid var(--Secondary-S2, #F5ECDC)',
    display: 'flex',
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
}));

type MemberPickerProps = {
  users: User[];
  onRowSelect: (user: User) => void;
  showSearch?: boolean;
  onRemove?: () => void;
};

export function MemberPicker({
  users,
  onRowSelect,
  showSearch,
  onRemove,
}: MemberPickerProps) {
  const styles = useStyles();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuCtx = useMenuContext();
  useFocusOnMount(inputRef); //CHECK

  useEffect(() => {
    if (users) {
      const filtered = suggestResults(
        searchTerm,
        users,
        (t) => t.name,
        Number.MAX_SAFE_INTEGER,
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value || '');
  };

  const handleRowClick = (user: User) => {
    onRowSelect(user);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((x) => (x - 1 < 0 ? filteredUsers.length - 1 : x - 1));
        break;
      case 'ArrowDown':
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((x) => (x + 1) % filteredUsers.length);
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
        onRowSelect(filteredUsers[selectedIndex]);
        break;
      default:
        return;
    }
  };

  return (
    <div className={cn(styles.tableContainer)}>
      {showSearch !== false && (
        <div className={cn(styles.searchRowStyle)}>
          <div className={cn(styles.iconContainer)}>
            <IconSearch />
          </div>
          <TextField
            ref={inputRef}
            type="text"
            placeholder={'Type name:'}
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyDown={onKeyDown}
            className={styles.InputTextStyle}
          />
        </div>
      )}
      <Scroller>
        {(inputRef) => (
          <div className={cn(styles.tableContent)} ref={inputRef}>
            {filteredUsers.map((user: User, index: number) => (
              <React.Fragment key={user.key}>
                <div
                  key={user.key}
                  className={cn(styles.row, styles.hoverableRow, {
                    [styles.hoverableRow]: selectedIndex === index,
                  })}
                  onClick={() => handleRowClick(user)}
                >
                  <div className={cn(styles.rowItem)}>
                    {user ? user.name : null}
                  </div>
                </div>
              </React.Fragment>
            ))}
            {onRemove && (
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
                <div className={cn(styles.rowItem)}>Remove</div>
              </div>
            )}
          </div>
        )}
      </Scroller>
    </div>
  );
}
