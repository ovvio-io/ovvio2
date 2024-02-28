import React, { useEffect, useRef, useState } from 'react';
import { User } from '../../../../../cfds/client/graph/vertices/index.ts';
import { suggestResults } from '../../../../../cfds/client/suggestions.ts';
import { cn, makeStyles } from '../../../../../styles/css-objects/index.ts';
import { brandLightTheme as theme } from '../../../../../styles/theme.tsx';
import { IconMore } from '../../../../../styles/components/new-icons/icon-more.tsx';
import { SearchBar } from '../../../../../components/search-bar.tsx';
import { convertDictionaryToObject } from '../../../../../base/collections/dict.ts';
import { UserMetadataKey } from '../../../../../cfds/client/graph/vertices/user.ts';
import Menu, { MenuItem } from '../../../../../styles/components/menu.tsx';
import { IconDuplicate } from '../../../../../styles/components/new-icons/icon-duplicate.tsx';
import { IconDelete } from '../../../../../styles/components/new-icons/icon-delete.tsx';
import { VertexManager } from '../../../../../cfds/client/graph/vertex-manager.ts';

type EditableColumnProps = {
  index: number;
  placeholder: string;
  setCurrState: (s: string) => void;
  value: string | undefined;
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
  const inputValue = value !== undefined ? value : '';

  return (
    <div>
      <input
        className={cn(styles.columnStyle)}
        placeholder={placeholder}
        value={inputValue}
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
  isSelected: boolean;
  addNewMember: boolean;
  onRowSelect: (user: string) => void;
  setName?: (s: string) => void;
  setEmail?: (s: string) => void;
  name?: string | null;
  email?: string | null;
  metadata?: { [key: string]: string };
  setMetadata?: (metadata: { [key: string]: string }) => void;
  editMode: boolean;
  onSaveEdit?: (
    userKey: string,
    name: string,
    email: string,
    metadata: { [key: string]: string },
  ) => void;
};
const TableRow: React.FC<TableRowProps> = ({
  user,
  isSelected,
  addNewMember,
  onRowSelect,
  setName,
  setEmail,
  name,
  email,
  metadata,
  setMetadata,
  editMode,
  onSaveEdit,
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
  const [localName, setLocalName] = useState(name);
  const [localEmail, setLocalEmail] = useState(email);
  const [localMetadata, setLocalMetadata] = useState(metadata);
  const [editNow, setEditNow] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleMouseEnter = () => {
    setIsRowHovered(true);
  };
  const handleMouseLeave = () => {
    setIsRowHovered(false);
  };

  const handleMetadataChange = (key: UserMetadataKey, value: string) => {
    if (editNow) {
      setLocalMetadata({
        ...localMetadata,
        [key]: value,
      });
    } else {
      {
        setMetadata &&
          setMetadata({
            ...metadata,
            [key]: value,
          });
      }
    }
  };

  const handleRowSelect = (user: string) => {
    console.log('row selected for user-', user, 'and editMode is-', editMode);
    if (editMode) {
      // debugger;
      setEditNow(true);
    } else if (user) {
      console.log('row selected for user-', user, 'and editMode is-', editMode);

      onRowSelect(user);
    }
  };

  const saveAndExitEditing = () => {
    if (
      editNow &&
      onSaveEdit &&
      user &&
      localName &&
      localEmail &&
      localMetadata !== undefined
    ) {
      onSaveEdit(user.key, localName, localEmail, localMetadata);
      setEditNow(false);
      setIsEditing(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        editNow &&
        rowRef.current &&
        !rowRef.current.contains(event.target as Node)
      ) {
        saveAndExitEditing();
      }
    };
    if (editNow) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isEditing, editNow, rowRef, saveAndExitEditing]);

  const enableEditing = (event: React.MouseEvent) => {
    // console.log('Editing NOW');
    event.stopPropagation();
    event.preventDefault();
    setIsEditing(true);
  };

  const removeUserFromOrg = () => {
    user && (user.isDeleted = 1);
  };

  const copyToClipboard = () => {
    user &&
      navigator.clipboard
        .writeText(user.key)
        .then(() => {
          console.log('Text copied to clipboard');
        })
        .catch((err) => {
          console.error('Failed to copy: ', err);
        });
  };

  if (editNow) {
    return (
      <div
        ref={rowRef}
        className={cn(styles.rowContainer)}
        onClick={enableEditing}
      >
        {setLocalEmail && setLocalName && (
          <div
            className={cn(
              styles.selectedRow,
              styles.rowRight,
              styles.hoverableRow,
            )}
          >
            <EditableColumn
              index={1}
              placeholder={'Full name'}
              setCurrState={setLocalName}
              value={localName || ''}
            />
            <EditableColumn
              index={2}
              placeholder={'Email'}
              setCurrState={setLocalEmail}
              value={localEmail || ''}
            />
            <EditableColumn
              index={4}
              placeholder="Team"
              value={localMetadata && localMetadata.team}
              setCurrState={(value) => handleMetadataChange('team', value)}
            />
            <EditableColumn
              index={3}
              placeholder="Roles"
              value={localMetadata && localMetadata.companyRoles}
              setCurrState={(value) =>
                handleMetadataChange('companyRoles', value)
              }
            />
            <Menu
              renderButton={() => <IconMore />}
              position="right"
              align="start"
              direction="out"
            >
              <MenuItem
                onClick={() => {
                  copyToClipboard();
                }}
              >
                <IconDuplicate />
                Copy User ID
              </MenuItem>
              <MenuItem
                onClick={() => {
                  removeUserFromOrg();
                }}
              >
                <IconDelete />
                Remove from Org.
              </MenuItem>
            </Menu>
            <IconMore />
          </div>
        )}
      </div>
    );
  } else {
    console.log('ELSE for', user?.name);
    return (
      <div
        className={cn(styles.rowContainer)}
        onClick={() => {
          user && handleRowSelect(user.key);
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {isRowHovered && (
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
              isSelected && styles.selectedRow,
            )}
          >
            <div className={cn(styles.firstColumnStyle)}>{user.name}</div>
            <div className={cn(styles.otherColumnStyle)}>{user.email}</div>
            <div className={cn(styles.otherColumnStyle)}>
              {user.metadata.get('team')}
            </div>
            <div className={cn(styles.otherColumnStyle)}>
              {user.metadata.get('companyRoles')}
            </div>
            <div className={cn(styles.otherColumnStyle)}>
              {' '}
              {user.metadata.get('comments')}
            </div>
          </div>
        )}
        {addNewMember && setName && setEmail && (
          <div
            id={`setting/org/<undefined>`}
            className={cn(
              styles.selectedRow,
              styles.rowRight,
              styles.hoverableRow,
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
              index={4}
              placeholder="Team"
              value={metadata && metadata.team}
              setCurrState={(value) => handleMetadataChange('team', value)}
            />
            <EditableColumn
              index={3}
              placeholder="Roles"
              value={metadata && metadata.companyRoles}
              setCurrState={(value) =>
                handleMetadataChange('companyRoles', value)
              }
            />
            <IconMore />
          </div>
        )}
      </div>
    );
  }
};
//============================================+++++++=====================================================
type UserTableProps = {
  users: User[];
  showSelection: boolean;
  onRowSelect: (user: string) => void;
  selectedUsers: Set<string>;
  showSearch: boolean;
  editMode: boolean;
  setName?: (s: string) => void;
  setEmail?: (s: string) => void;
  setMetadata?: (metadata: { [key: string]: string }) => void;
  name?: string | null;
  email?: string | null;
  metadata?: { [key: string]: string };
  onSaveEdit?: (
    userKey: string,
    name: string,
    email: string,
    metadata: { [key: string]: string },
  ) => void;
};

const UserTable: React.FC<UserTableProps> = ({
  users,
  showSelection,
  selectedUsers,
  onRowSelect,
  showSearch,
  editMode,
  setName,
  setEmail,
  setMetadata,
  name,
  email,
  metadata,
  onSaveEdit,
}) => {
  const useStyles2 = makeStyles(() => ({
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
  const [newUser, setNewUser] = useState<boolean>();
  const [isSearching, setIsSearching] = useState(showSearch ? true : false);

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

  const handleNewMember = () => {
    setNewUser(true);
  };

  return (
    <div className={cn(styles.tableContainer)}>
      <div className={cn(styles.tableContent)}>
        {showSearch && (
          <SearchBar
            users={users}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            isSearching={isSearching}
          />
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
            isSelected={false}
            addNewMember={true}
            onRowSelect={() => {}}
            setName={setName}
            setEmail={setEmail}
            name={name}
            email={email}
            metadata={metadata}
            setMetadata={setMetadata}
            onSaveEdit={onSaveEdit}
            editMode={false}
          />
        )}
        {/* <div className={styles.scrollTable}> */}
        {filteredUsers.map((user: User) => (
          <TableRow
            key={user.key}
            user={user}
            onRowSelect={() => onRowSelect(user.key)}
            isSelected={showSelection && selectedUsers.has(user.key)}
            addNewMember={false}
            editMode={editMode}
            onSaveEdit={onSaveEdit}
            setName={setName}
            setEmail={setEmail}
            name={user.name}
            email={user.email}
            metadata={convertDictionaryToObject(user.metadata)}
          />
        ))}
      </div>
    </div>
    // </div>
  );
};
export default UserTable;
