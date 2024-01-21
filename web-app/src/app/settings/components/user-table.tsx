import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useGraphManager } from '../../../core/cfds/react/graph.tsx';
import { useSharedQuery } from '../../../core/cfds/react/query.ts';
import { useVertices } from '../../../core/cfds/react/vertex.ts';
import { SchemeNamespace } from '../../../../../cfds/base/scheme-types.ts';
import { normalizeEmail } from '../../../../../base/string.ts';

type EditableColumnProps = {
  index: number;
  placeholder: string;
  setCurrState: (s: string) => void;
  value?: string | undefined;
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
  user: User;
  newUser?: boolean;
  isSelected: boolean;
  onRowSelect: (user: string) => void;
  editMode: boolean;
  addMemberMode: boolean;
  onSaveEdit?: (
    userKey: string,
    name: string,
    email: string,
    metadata: { [key: string]: string }
  ) => void;
};
const TableRow: React.FC<TableRowProps> = ({
  user,
  newUser,
  isSelected,
  onRowSelect,
  editMode,
  addMemberMode,
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
  const [localName, setLocalName] = useState(user.name);
  const [localEmail, setLocalEmail] = useState(user.email);
  const [localMetadata, setLocalMetadata] = useState(
    convertDictionaryToObject(user.metadata)
  );
  const [editNow, setEditNow] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  const saveAndExitEditing = () => {
    if (editNow && onSaveEdit) {
      setEditNow(false);
      onSaveEdit(user.key, localName, localEmail, localMetadata);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      debugger;
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
  }, [editNow, rowRef, saveAndExitEditing]);

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
    }
  };

  const handleRowSelect = (event: React.MouseEvent, user: string) => {
    event.stopPropagation();
    if (editMode) {
      // event.preventDefault();
      setEditNow(true);
    } else if (user) {
      onRowSelect(user);
    }
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
  return (
    <div ref={rowRef} className={cn(styles.rowContainer)}>
      {!addMemberMode && !editMode && isRowHovered && (
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
      {!editNow && !newUser ? (
        <div
          className={cn(
            isSelected && styles.selectedRow,
            styles.rowRight,
            styles.hoverableRow
          )}
          onClick={(event) => {
            user && handleRowSelect(event, user.key);
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
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
            {user.metadata.get('comments')}
          </div>
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
        </div>
      ) : (
        <div
          className={cn(
            styles.selectedRow,
            styles.rowRight,
            styles.hoverableRow
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
        </div>
      )}
    </div>
  );
};

//============================================+++++++=====================================================
type UserTableProps = {
  showSelection: boolean;
  onRowSelect: (user: string) => void;
  selectedUsers: Set<string>;
  showSearch: boolean;
  editMode: boolean;
  addMemberMode: boolean;
};

const UserTable: React.FC<UserTableProps> = ({
  showSelection,
  selectedUsers,
  onRowSelect,
  showSearch,
  editMode,
  addMemberMode,
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
  const [newUser, setNewUser] = useState<User | undefined>();
  const graphManager = useGraphManager();
  const usersQuery = useSharedQuery('users');
  const users = useVertices(usersQuery.results) as User[];

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
  }, [searchTerm, usersQuery]); // ask ofri why put users instead of userQuery will lead to max memory usage;

  const handleNewMember = useCallback(() => {
    const createdVertex = graphManager.createVertex<User>(
      SchemeNamespace.USERS,
      {}
    );
    setNewUser(createdVertex.manager.getVertexProxy()); //check if getVertexProxy is correct.
  }, [graphManager]);

  const handleSaveUserEdit = (
    userKey: string,
    name: string,
    email: string,
    metadata: { [key: string]: string }
  ) => {
    if (!email || !name) {
      console.log('Name and Email are mandatory fields');
      return;
    }
    if (name.trim() === '' || email.trim() === '') {
      console.log('Name and Email are mandatory fields');
      return;
    }
    const userVertex = graphManager.getVertex<User>(userKey);
    if (!userVertex) {
      console.log('User not found');
      return;
    }
    userVertex.name = name;
    userVertex.email = normalizeEmail(email);
    const metadataMap = new Map<UserMetadataKey, string>();
    Object.entries(metadata).forEach(([key, value]) => {
      if (key === 'companyRoles' || key === 'comments' || key === 'team') {
        metadataMap.set(key as UserMetadataKey, value);
      }
    });
    userVertex.metadata = metadataMap;
  };

  return (
    <div className={cn(styles.tableContainer)}>
      <div className={cn(styles.tableContent)}>
        {showSearch && (
          <SearchBar
            users={users}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            isSearching={showSearch}
          />
        )}
        {addMemberMode && (
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

        {filteredUsers.map((user: User) => (
          <TableRow
            key={user.key}
            user={user}
            newUser={newUser === user}
            onRowSelect={() => onRowSelect(user.key)}
            isSelected={showSelection && selectedUsers.has(user.key)}
            editMode={editMode}
            addMemberMode={addMemberMode}
            onSaveEdit={handleSaveUserEdit}
          />
        ))}
      </div>
    </div>
  );
};
export default UserTable;
