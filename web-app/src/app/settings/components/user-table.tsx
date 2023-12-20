import React, { ChangeEvent, useEffect, useRef, useState } from 'react';
import { User } from '../../../../../cfds/client/graph/vertices/index.ts';
import { suggestResults } from '../../../../../cfds/client/suggestions.ts';
import { IconSearch } from '../../../../../styles/components/new-icons/icon-search.tsx';
import { cn, makeStyles } from '../../../../../styles/css-objects/index.ts';
import { brandLightTheme as theme } from '../../../../../styles/theme.tsx';
import { IconMore } from '../../../../../styles/components/new-icons/icon-more.tsx';

type EditableColumnProps = {
  index: number;
  placeholder: string;
  setCurrState: (s: string) => void;
  value: string | null;
};
const EditableColumn: React.FC<EditableColumnProps> = ({
  index,
  placeholder,
  setCurrState,
  value,
}) => {
  const size = index === 1 ? '200px' : index === 2 ? '160px' : '176px';
  const useStyles = makeStyles(() => ({
    columnStyle: {
      display: 'flex',
      width: size,
      height: '20px',
      flexDirection: 'column',
      justifyContent: 'center',
      border: 'none',
      outline: 'none',
      background: 'none',
      color: theme.colors.text,
      fontSize: 13,
      lineHeight: '18px',
      letterSpacing: 0.06,
    },
    editLine: {
      width: size,
      height: '1px',
      background: theme.primary.p8,
      margin: '5px 0px 0px 0px',
    },
  }));
  const styles = useStyles();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (index === 1 && inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  return (
    <div>
      <input
        className={cn(styles.columnStyle)}
        placeholder={placeholder}
        value={value || ''}
        ref={inputRef}
        onChange={(event) => {
          setCurrState(event.target.value);
        }}
      ></input>
      <div className={cn(styles.editLine)}></div>
    </div>
  );
};
// ============================================================================================================
type TableRowProps = {
  user?: User;
  onRowSelect: (user: string) => void;
  isSelected: boolean;
  isEditable: boolean;
  addNewMember: boolean;
  setName?: (s: string) => void;
  setEmail?: (s: string) => void;
  setTeam?: (s: string) => void;
  setRole?: (s: string) => void;
  name?: string | null;
  email?: string | null;
  team?: string | null;
  role?: string | null;
};
const TableRow: React.FC<TableRowProps> = ({
  user,
  onRowSelect,
  isSelected,
  isEditable,
  addNewMember,
  setName,
  setEmail,
  setTeam,
  setRole,
  name,
  email,
  team,
  role,
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
      color: theme.colors.text,
      fontSize: 13,
      lineHeight: '18px',
      letterSpacing: '0.0.75px',
      fontWeight: '400',
    },
    otherColumnStyle: {
      display: 'flex',
      width: '176px',
      height: '17px',
      flexDirection: 'column',
      justifyContent: 'center',
      fontSize: 10,
      color: theme.colors.text,
      lineHeight: '14px',
      fontWeight: '400',
    },
    editLine: {
      width: '480px',
      height: '1px',
      background: theme.primary.p8,
      margin: '5px 0px 0px 0px',
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
      onClick={() => {
        user && onRowSelect(user.key);
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isEditable && isRowHovered && (
        <div className={cn(styles.rowLeft, styles.rowLeftHover)}>
          <img
            key="HoveredRowSettings"
            src="/icons/settings/hover-select.svg"
          />
        </div>
      )}
      {isSelected && (
        <div className={cn(styles.rowLeft)}>
          <img
            key="SelectedRowSettings"
            src="/icons/settings/hover-select2.svg"
          />
        </div>
      )}
      {!addNewMember && user && (
        <div
          id={`setting/org/<${user.key}>`}
          className={cn(
            styles.rowRight,
            styles.hoverableRow,
            isSelected && styles.selectedRow
          )}
        >
          <div className={cn(styles.firstColumnStyle)}>{user.name}</div>
          <div className={cn(styles.otherColumnStyle)}>{user.email}</div>
          <div className={cn(styles.otherColumnStyle)}>{'Team'}</div>
          <div className={cn(styles.otherColumnStyle)}>{'Role'}</div>
          <div className={cn(styles.otherColumnStyle)}>{'Content'}</div>
        </div>
      )}
      {addNewMember && setName && setEmail && setTeam && setRole && (
        <div
          id={`setting/org/<undefined>`}
          className={cn(
            styles.selectedRow,
            styles.rowRight,
            styles.hoverableRow
          )}
        >
          <EditableColumn
            index={1}
            placeholder={'Full name'}
            setCurrState={setName}
            value={name || ''}
          />
          <EditableColumn
            index={2}
            placeholder={'Email'}
            setCurrState={setEmail}
            value={email || ''}
          />
          <EditableColumn
            index={3}
            placeholder={'Team'}
            setCurrState={setTeam}
            value={team || ''}
          />
          <EditableColumn
            index={4}
            placeholder={'Role'}
            setCurrState={setRole}
            value={role || ''}
          />
          <IconMore />
        </div> //iconMore will be changed to img
      )}
    </div>
  );
};
//============================================+++++++=====================================================
type UserTableProps = {
  users: User[];
  onRowSelect: (user: string) => void;
  showSelection: boolean;
  selectedUsers: Set<string>;
  showSearch: boolean;
  isEditable: boolean;
  editMode?: boolean;
  setName?: (s: string) => void;
  setEmail?: (s: string) => void;
  setTeam?: (s: string) => void;
  setRole?: (s: string) => void;
  name?: string | null;
  email?: string | null;
  team?: string | null;
  role?: string | null;
};

const UserTable: React.FC<UserTableProps> = ({
  users,
  onRowSelect,
  showSelection,
  selectedUsers,
  showSearch,
  isEditable,
  editMode,
  setName,
  setEmail,
  setTeam,
  setRole,
  name,
  email,
  team,
  role,
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
    rowRight: {
      padding: '12px 23px 12px 16px',
      marginBottom: '1px',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0px 0px 4px 0px rgba(151, 132, 97, 0.25)',
      width: '115px',
      borderRadius: '2px',
      backgroundColor: '#FFF',
    },
    firstColumnStyle: {
      display: 'flex',
      width: '200px',
      height: '20px',
      flexDirection: 'column',
      justifyContent: 'center',
      color: theme.colors.text,
      fontSize: 13,
      lineHeight: '18px',
      letterSpacing: '0.0.75px',
      fontWeight: '400',
    },
    selectedRow: {
      backgroundColor: '#F5F9FB',
      border: '1px solid #CCE3ED',
      boxSizing: 'border-box',
      height: '44px',
      width: '805px',
      hover: 'none',
    },
    hoverableRow: {
      ':hover': {
        backgroundColor: '#FBF6EF',
      },
    },
    addMemberButton: {
      display: 'flex',
      gap: '8px',
    },
    scrollTable: {
      maxHeight: '100px',
      overflowY: 'scroll',
      overflowX: 'visible',
    },
  }));

  const styles = useStyles2();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

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

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  const [newUser, setNewUser] = useState<boolean>();

  const handleNewMember = () => {
    setNewUser(true);
  };

  return (
    <div className={isEditable ? cn(styles.tableContainer) : undefined}>
      <div className={cn(styles.tableContent)}>
        {showSearch && (
          <div className={cn(styles.searchRowStyle)}>
            <div style={{ marginRight: '4px' }}>
              <IconSearch />
            </div>
            <input
              type="text"
              placeholder="Search member"
              value={searchTerm}
              onChange={handleSearchChange}
              className={styles.InputTextStyle}
            />
          </div>
        )}
        {editMode && (
          <div
            className={cn(styles.rowRight, styles.hoverableRow)}
            onClick={handleNewMember}
          >
            <div className={cn(styles.addMemberButton)}>
              <img key="AddMemberSettings" src="/icons/settings/Add.svg" />
              <div className={cn(styles.firstColumnStyle)}>New Member</div>
            </div>
          </div>
        )}
        {newUser && (
          <TableRow
            onRowSelect={() => {}}
            isSelected={false}
            isEditable={false}
            addNewMember={true}
            setName={setName}
            setEmail={setEmail}
            setTeam={setTeam}
            setRole={setRole}
            name={name}
            email={email}
            team={team}
            role={role}
          />
        )}
        {/* <div className={styles.scrollTable}> */}
        {filteredUsers.map((user: User) => (
          <TableRow
            key={user.key}
            user={user}
            onRowSelect={onRowSelect}
            isSelected={showSelection && selectedUsers.has(user.key)}
            isEditable={isEditable && !selectedUsers.has(user.key)}
            addNewMember={false}
          />
        ))}
      </div>
    </div>
    // </div>
  );
};
export default UserTable;
