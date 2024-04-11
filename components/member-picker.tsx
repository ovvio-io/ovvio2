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
import { VertexManager } from '../cfds/client/graph/vertex-manager.ts';
import { useVertices } from '../web-app/src/core/cfds/react/vertex.ts';

const useStyles = makeStyles(() => ({
  tableContainer: {
    maxHeight: styleguide.gridbase * 21,
    maxWidth: styleguide.gridbase * 21,
    minWidth: styleguide.gridbase * 20,
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
    minWidth: '120px',
    display: 'flex',
    height: '32px',
    minHeight: '32px',
    fontSize: 13,
    lineHeight: '18px',
  },
  searchRowStyle: {
    display: 'flex',
    padding: '0px 0px 0px 8px',
    position: 'absolute',
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

type MemberPickerProps = {
  users: VertexManager<User>[];
  onRowSelect: (user: User) => void;
  showSearch?: boolean;
  onRemove?: () => void;
  onClearAssignees?: () => void;
};

export function MemberPicker({
  users: usersMn,
  onRowSelect,
  showSearch,
  onRemove,
  onClearAssignees,
}: MemberPickerProps) {
  const styles = useStyles();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuCtx = useMenuContext();
  useFocusOnMount(inputRef);
  const users = useVertices(usersMn);
  const componentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (users) {
      const filtered = suggestResults(
        searchTerm,
        users,
        (t) => t.name,
        Number.MAX_SAFE_INTEGER
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

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
    user: User,
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    event.stopPropagation();
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
  const onKeyUp = (e: React.KeyboardEvent) => {
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
          // e.preventDefault();
          // e.stopPropagation();
          // menuCtx.close();
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
    <div ref={componentRef} className={cn(styles.tableContainer)}>
      {showSearch !== false && (
        <div className={cn(styles.searchRowStyle)}>
          <div className={cn(styles.iconContainer)}>
            <IconSearch />
          </div>
          <Input
            ref={inputRef}
            type="text"
            placeholder={'Type name:'}
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyDown={onKeyDown}
            onKeyUp={onKeyUp}
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
            {filteredUsers.map((user: User, index: number) => (
              <React.Fragment key={user.key}>
                <div
                  key={user.key}
                  className={cn(
                    styles.row,
                    styles.hoverableRow,
                    selectedIndex === index && styles.selectedItem
                  )}
                  onClick={(event) => handleRowClick(user, event)}
                >
                  {user ? user.name : null}
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
            {onClearAssignees && (
              <>
                <div style={{ height: '8px', display: 'list-item' }}></div>
                <LineSeparator />
                <div
                  className={cn(styles.row, styles.hoverableRow)}
                  onClick={onClearAssignees}
                >
                  <div className={cn(styles.iconContainer)}>
                    <img
                      className={cn(styles.removeIcon)}
                      src="/icons/design-system/Close.svg"
                    />
                  </div>
                  <div className={cn(styles.row)}>Clear Assignees</div>
                </div>
              </>
            )}
          </div>
        )}
      </Scroller>
    </div>
  );
}
