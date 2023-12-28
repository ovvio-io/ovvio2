import React, { useEffect, useState } from 'react';
import { User } from '../cfds/client/graph/vertices/user.ts';
import { cn, makeStyles } from '../styles/css-objects/index.ts';
import { SearchBar } from './search-bar.tsx';
import { suggestResults } from '../cfds/client/suggestions.ts';
import { Workspace } from '../cfds/client/graph/vertices/index.ts';

const useStyles = makeStyles(() => ({
  tableContainer: {},
  tableContent: {
    flex: 1,
    overflowY: 'scroll',
  },
  firstColumnStyle: {
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
    ':hover': {
      backgroundColor: '#FBF6EF',
    },
  },
  rowRight: {
    padding: '6px 6px 6px 10px',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    borderBottom: '2px solid var(--Secondary-S2, #F5ECDC)',
  },
}));

type MemberOrWsPickerRowProps = {
  user?: User;
  workspace?: Workspace;
  onRowSelect: (user: User) => void;
};
const MemberPickerRow: React.FC<MemberOrWsPickerRowProps> = ({
  user,
  workspace,
  onRowSelect,
}) => {
  const styles = useStyles();

  return (
    <>
      <div
        className={cn()}
        onClick={() => {
          user && onRowSelect(user);
        }}
      />
      <div className={cn(styles.rowRight, styles.hoverableRow)}>
        <div className={cn(styles.firstColumnStyle)}>
          {user ? user.name : workspace ? workspace.name : null}
        </div>
      </div>
      <div />
    </>
  );
};

type MemberPickerProps = {
  users: User[];
  onRowSelect: (user: User) => void;
  isSearching?: boolean;
  setIsSearching?: (b: boolean) => void;
};

export const MemberPicker: React.FC<MemberPickerProps> = ({
  users,
  onRowSelect,
}) => {
  const styles = useStyles();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

  const toggleSelectMode = (user: User) => {
    console.log('reached toggle');
    onRowSelect(user);
    setIsSearching(false);
  };
  return (
    <div className={cn(styles.tableContainer)}>
      <SearchBar
        users={users}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        isPicker={true}
        isSearching={isSearching}
      />
      <div className={cn(styles.tableContent)}>
        {filteredUsers.map((user: User) => (
          <MemberPickerRow
            key={user.key}
            user={user}
            onRowSelect={toggleSelectMode}
          />
        ))}
      </div>
    </div>
  );
};
