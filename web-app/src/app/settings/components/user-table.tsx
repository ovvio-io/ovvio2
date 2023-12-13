import React, { ChangeEvent, useEffect, useState } from 'react';
import { User } from '../../../../../cfds/client/graph/vertices/index.ts';
import { suggestResults } from '../../../../../cfds/client/suggestions.ts';
import { IconSearch } from '../../../../../styles/components/new-icons/icon-search.tsx';
import { TextSm, Text } from '../../../../../styles/components/typography.tsx';
import { cn, makeStyles } from '../../../../../styles/css-objects/index.ts';

export const useStyles = makeStyles(() => ({
  row: {
    display: 'flex',
    padding: '12px 16px',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0px 0px 4px 0px rgba(151, 132, 97, 0.25)',
    width: '772px',
    borderRadius: '2px',
    backgroundColor: '#FFF',
    zIndex: '10',
  },
  hoverableRow: {
    ':hover': {
      backgroundColor: '#FBF6EF',
    },
  },
  selectedRow: {
    backgroundColor: '#F5F9FB',
    border: '1px solid #CCE3ED',
    hover: 'none',
  },
  firstColumnStyle: {
    display: 'flex',
    width: '200px',
    height: '20px',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  otherColumnStyle: {
    display: 'flex',
    width: '176px',
    height: '17px',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'absolute',
    left: '-71px',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: '-10',
  },
}));
type UserTableProps = {
  users: User[];
  onRowSelect: (user: User) => void;
  showSelection: boolean;
  selectedUsers: User[];
  showSearch: boolean;
  isHoverable: boolean;
};

const UserTable: React.FC<UserTableProps> = ({
  users,
  onRowSelect,
  showSelection,
  selectedUsers,
  showSearch,
  isHoverable,
}) => {
  type RowInTableProps = {
    user: User;
    isSelected: boolean;
    isHoverable: boolean;
  };
  const RowInTable: React.FC<RowInTableProps> = ({
    user,
    isSelected,
    isHoverable,
  }) => {
    const styles = useStyles();
    const [isRowHovered, setIsRowHovered] = useState(false);

    const handleMouseEnter = () => {
      setIsRowHovered(true);
    };
    const handleMouseLeave = () => {
      setIsRowHovered(false);
    };

    return (
      <div
        className={cn(
          styles.row,
          isHoverable && styles.hoverableRow,
          isSelected && styles.selectedRow
        )}
        onClick={() => onRowSelect(user)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className={styles.iconContainer}>
          {isHoverable && isRowHovered && (
            <img
              key="HoveredRowSettings"
              src="/icons/editor/icon/hover-select.svg"
            />
          )}
        </div>
        <Text className={cn(styles.firstColumnStyle)}>{user.name}</Text>
        <TextSm className={cn(styles.otherColumnStyle)}>{user.email}</TextSm>
        <TextSm className={cn(styles.otherColumnStyle)}>{'ph1'}</TextSm>
        <TextSm className={cn(styles.otherColumnStyle)}>{'ph2'}</TextSm>
        <TextSm className={cn(styles.otherColumnStyle)}>{'ph3'}</TextSm>
      </div>
    );
  };

  const useStyles2 = makeStyles(() => ({
    searchRowStyle: {
      display: 'flex',
      padding: '12px 16px',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0px 0px 4px 0px rgba(151, 132, 97, 0.25)',
      width: '772px',
      borderRadius: '2px',
      backgroundColor: '#FFF',
      justifyContent: 'flex-start',
      cursor: 'default',
    },
    InputTextStyle: {
      flexGrow: 1,
      border: 'none',
      outline: 'none',
      width: '100%',
      fontSize: '13px',
      letterSpacing: '0.075px',
    },
    scrollContainerStyle: {
      maxHeight: '700px',
    },
    tableContainer: {
      width: '843px',
      display: 'flex',
      position: 'relative',
      // right: '71px',
    },
    tableContent: {
      flex: 1,
    },
    iconSelectOutside: {
      position: 'absolute',
      left: '-30px',
      width: '71px',
    },
    rowContainer: {
      display: 'flex',
      alignItems: 'center',
      position: 'relative',
      width: '843px',
    },
  }));

  const styles = useStyles2();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  useEffect(() => {
    if (users) {
      const filtered = suggestResults(searchTerm, users, (t) => t.name);
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  return (
    <div className={isHoverable ? cn(styles.tableContainer) : undefined}>
      <div className={cn(styles.tableContent)}>
        {showSearch && (
          <div className={cn(styles.searchRowStyle)}>
            <div style={{ marginRight: '4px' }}>
              <IconSearch />
            </div>
            <Text>
              <input
                type="text"
                placeholder="Search member"
                value={searchTerm}
                onChange={handleSearchChange}
                className={styles.InputTextStyle}
              />
            </Text>
          </div>
        )}
        <div className={cn(styles.scrollContainerStyle)}>
          {filteredUsers.map((user: User) => (
            <div key={user.key} className={cn(styles.rowContainer)}>
              {selectedUsers.includes(user) && (
                <div className={cn(styles.iconSelectOutside)}>
                  <img
                    key="SelectedRowSettings"
                    src="/icons/editor/icon/hover-select2.svg"
                  />
                </div>
              )}
              <RowInTable
                user={user}
                isSelected={showSelection && selectedUsers.includes(user)}
                isHoverable={isHoverable && !selectedUsers.includes(user)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserTable;
