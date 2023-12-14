import React, { ChangeEvent, useEffect, useState } from 'react';
import { User } from '../../../../../cfds/client/graph/vertices/index.ts';
import { suggestResults } from '../../../../../cfds/client/suggestions.ts';
import { IconSearch } from '../../../../../styles/components/new-icons/icon-search.tsx';
import { TextSm, Text } from '../../../../../styles/components/typography.tsx';
import { cn, makeStyles } from '../../../../../styles/css-objects/index.ts';

type RowInTableProps = {
  user: User;
  onRowSelect: (user: string) => void;
  isSelected: boolean;
  isEditable: boolean;
};
const RowInTable: React.FC<RowInTableProps> = ({
  user,
  onRowSelect,
  isSelected,
  isEditable,
}) => {
  const useStyles = makeStyles(() => ({
    rowContainer: {
      position: 'relative',
      left: '-71px',
      width: '843px',
    },
    rowRight: {
      display: 'flex',
      position: 'relative',
      left: '71px',
      padding: '12px 16px',
      marginBottom: '1px',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0px 0px 4px 0px rgba(151, 132, 97, 0.25)',
      width: '772px',
      borderRadius: '2px',
      backgroundColor: '#FFF',
    },
    hoverableRow: {
      ':hover': {
        backgroundColor: '#FBF6EF',
      },
    },
    rowLeft: {
      position: 'absolute',
      width: '71px',
      left: '40px',
      top: '9px',
    },
    rowLeftHover: {
      left: '0px',
    },
    selectHover: {
      position: 'absolute',
      width: '71px',
      left: '10px',
      top: '9px',
    },
    selectedRow: {
      backgroundColor: '#F5F9FB',
      border: '1px solid #CCE3ED',
      boxSizing: 'border-box',
      height: '44px',
      width: '805px',
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
      className={cn(styles.rowContainer)}
      onClick={() => onRowSelect(user.key)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isEditable && isRowHovered && (
        <div className={cn(styles.rowLeft, styles.rowLeftHover)}>
          <img
            key="HoveredRowSettings"
            src="/icons/editor/icon/hover-select.svg"
          />
        </div>
      )}
      {isSelected && (
        <div className={cn(styles.rowLeft)}>
          <img
            key="SelectedRowSettings"
            src="/icons/editor/icon/hover-select2.svg"
          />
        </div>
      )}
      <div
        className={cn(
          styles.rowRight,
          isEditable && styles.hoverableRow,
          isSelected && styles.selectedRow
        )}
      >
        <Text className={cn(styles.firstColumnStyle)}>{user.name}</Text>
        <TextSm className={cn(styles.otherColumnStyle)}>{user.email}</TextSm>
        <TextSm className={cn(styles.otherColumnStyle)}>{'ph1'}</TextSm>
        <TextSm className={cn(styles.otherColumnStyle)}>{'ph2'}</TextSm>
        <TextSm className={cn(styles.otherColumnStyle)}>{'ph3'}</TextSm>
      </div>
    </div>
  );
};

type UserTableProps = {
  users: User[];
  onRowSelect: (user: string) => void;
  showSelection: boolean;
  selectedUsers: Set<string>;
  showSearch: boolean;
  isEditable: boolean;
};

const UserTable: React.FC<UserTableProps> = ({
  users,
  onRowSelect,
  showSelection,
  selectedUsers,
  showSearch,
  isEditable,
}) => {
  const useStyles2 = makeStyles(() => ({
    searchRowStyle: {
      display: 'flex',
      padding: '12px 16px',
      marginBottom: '1px',
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
    tableContainer: {
      width: '843px',
      display: 'flex',
      position: 'relative',
    },
    tableContent: {
      flex: 1,
    },
  }));

  const styles = useStyles2();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const userKey = 'SettingUser_';

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
    <div className={isEditable ? cn(styles.tableContainer) : undefined}>
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
        {filteredUsers.map((user: User) => (
          <RowInTable
            key={userKey + user.key}
            user={user}
            onRowSelect={onRowSelect}
            isSelected={showSelection && selectedUsers.has(user.key)}
            isEditable={isEditable && !selectedUsers.has(user.key)}
          />
        ))}
      </div>
    </div>
  );
};

export default UserTable;
