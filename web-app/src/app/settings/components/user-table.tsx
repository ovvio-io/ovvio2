import React, { CSSProperties, ChangeEvent, useEffect, useState } from 'react';
import { User } from '../../../../../cfds/client/graph/vertices/index.ts';
import { suggestResults } from '../../../../../cfds/client/suggestions.ts';
import { IconSearch } from '../../../../../styles/components/new-icons/icon-search.tsx';
import { TextSm, Text } from '../../../../../styles/components/typography.tsx';
import { useSharedQuery } from '../../../core/cfds/react/query.ts';
import { IconSelect } from '../plugins/IconSelect.tsx';

const [searchTerm, setSearchTerm] = useState<string>('');
const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

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
  const usersQuery = useSharedQuery('users');

  const getRowStyle = (user?: User, index?: number) => {
    let style = {
      display: 'flex',
      padding: '12px 16px',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0px 0px 4px 0px rgba(151, 132, 97, 0.25)',
      width: '875px',
      borderRadius: '2px',
      backgroundColor: '#FFF',
    };
    if (user && showSelection && selectedUsers.includes(user)) {
      //Might be too expensive to check the whole User object. might consider check user.id/user.email instead.
      style = {
        ...style,
        backgroundColor: '#F5F9FB',
        border: '1px solid #CCE3ED',
      };
    }
    return style;
  };

  const searchRowStyle: CSSProperties = {
    ...getRowStyle(),
    justifyContent: 'flex-start',
    cursor: 'default',
    backgroundColor: '#FFF',
  };
  const InputTextStyle: CSSProperties = {
    flexGrow: 1,
    border: 'none',
    outline: 'none',
    width: '100%',
    fontSize: '13px',
    letterSpacing: '0.075px',
  };
  const firstColumnStyle = {
    display: 'flex',
    width: '200px',
    height: '20px',
    flexDirection: 'column',
    justifyContent: 'center',
  };
  const otherColumnStyle = {
    display: 'flex',
    width: '176px',
    height: '17px',
    flexDirection: 'column',
    justifyContent: 'center',
  };
  const scrollContainerStyle: CSSProperties = {
    maxHeight: '700px',
  };

  useEffect(() => {
    if (users) {
      const filtered = suggestResults(searchTerm, users, (t) => t.name);
      setFilteredUsers(filtered);
    }
  }, [searchTerm, usersQuery.results]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  return (
    <div>
      {showSearch && (
        <div style={searchRowStyle}>
          <div style={{ marginRight: '4px' }}>
            <IconSearch />
          </div>
          <Text>
            <input
              type="text"
              placeholder="Search member"
              value={searchTerm}
              onChange={handleSearchChange}
              style={InputTextStyle}
            />
          </Text>
        </div>
      )}
      <div style={scrollContainerStyle}>
        {filteredUsers.map((user: User, index: number) => (
          <div
            key={index}
            className={isHoverable ? 'hover-row' : ''}
            style={getRowStyle(user, index)}
            onClick={() => onRowSelect(user)}
          >
            {isHoverable && <IconSelect />}
            <Text style={firstColumnStyle}>{user.name}</Text>
            <TextSm style={otherColumnStyle}>{user.email}</TextSm>
            <TextSm style={otherColumnStyle}>{'placeholder1'}</TextSm>
            <TextSm style={otherColumnStyle}>{'placeholder2'}</TextSm>
            <TextSm style={otherColumnStyle}>{'placeholder3'}</TextSm>
          </div>
        ))}
      </div>
    </div>
  );
};
export default UserTable;
