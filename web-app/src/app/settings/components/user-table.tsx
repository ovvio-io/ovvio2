import React, { ChangeEvent, useEffect, useState } from 'react';
import { User } from '../../../../../cfds/client/graph/vertices/index.ts';
import { suggestResults } from '../../../../../cfds/client/suggestions.ts';
import { IconSearch } from '../../../../../styles/components/new-icons/icon-search.tsx';
import { TextSm, Text } from '../../../../../styles/components/typography.tsx';
import { IconSelect } from '../plugins/IconSelect.tsx';
import { cn, makeStyles } from '../../../../../styles/css-objects/index.ts';

export const useStyles = makeStyles(() => ({
  row: {
    display: 'flex',
    padding: '12px 16px',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0px 0px 4px 0px rgba(151, 132, 97, 0.25)',
    width: '875px',
    borderRadius: '2px',
    backgroundColor: '#FFF',
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
    return (
      <div
        className={cn(
          styles.row,
          isHoverable && styles.hoverableRow,
          isSelected && styles.selectedRow
        )}
        onClick={() => onRowSelect(user)}
      >
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
      width: '875px',
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
    <div>
      <div>{isHoverable && <IconSelect />}</div>
      <div>
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
            <RowInTable
              user={user}
              isSelected={showSelection && selectedUsers.includes(user)}
              isHoverable={isHoverable && !selectedUsers.includes(user)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
export default UserTable;
