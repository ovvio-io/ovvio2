import React, {
  ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { User } from '../../../../../cfds/client/graph/vertices/index.ts';
import { suggestResults } from '../../../../../cfds/client/suggestions.ts';
import { cn, makeStyles } from '../../../../../styles/css-objects/index.ts';
import { brandLightTheme as theme } from '../../../../../styles/theme.tsx';
import { SearchBar } from '../../../../../components/search-bar.tsx';
import { convertDictionaryToObject } from '../../../../../base/collections/dict.ts';
import { UserMetadataKey } from '../../../../../cfds/client/graph/vertices/user.ts';
import Menu, { MenuItem } from '../../../../../styles/components/menu.tsx';
import { IconDuplicate } from '../../../../../styles/components/new-icons/icon-duplicate.tsx';
import { IconDelete } from '../../../../../styles/components/new-icons/icon-delete.tsx';
import { useGraphManager } from '../../../core/cfds/react/graph.tsx';
import { useSharedQuery } from '../../../core/cfds/react/query.ts';
import {
  usePartialVertex,
  useVertices,
} from '../../../core/cfds/react/vertex.ts';
import {
  SchemeNamespace,
  UserPermission,
} from '../../../../../cfds/base/scheme-types.ts';
import { normalizeEmail } from '../../../../../base/string.ts';
import { styleguide } from '../../../../../styles/styleguide.ts';
import { VertexManager } from '../../../../../cfds/client/graph/vertex-manager.ts';
import { usePartialRootUser } from '../../../core/cfds/react/graph.tsx';
import { CheckBox } from '../../../../../components/checkbox.tsx';

const TABLE_COLUMN_WIDTH_FIRST = 200;
const TABLE_COLUMN_WIDTH_OTHER = 176;
const TABLE_COLUMN_WIDTH_PERMISSION = 12 * styleguide.gridbase;

const useEditableColumnStyles = makeStyles(() => ({
  columnStyle: {
    display: 'flex',
    width: 176,
    height: '20px',
    flexDirection: 'column',
    justifyContent: 'center',
    border: 'none',
    outline: 'none',
    background: 'none',
    color: theme.colors.text,
    fontSize: 10,
    lineHeight: '18px',
    letterSpacing: 0.06,
    fontFamily: 'Poppins',
    boxSizing: 'border-box',
    // border: `1px solid red`,
  },
  columnStyleFirst: {
    // maxWidth: 200,
    // width: 200,
    fontSize: 13,
  },
  editLine: {
    width: 135,
    height: '1px',
    background: theme.primary.p8,
    margin: '5px 0px 0px 0px',
  },
  editLineFirst: {
    width: 151,
  },
  invalidInput: {
    border: '1px solid red',
  },
  editableColumnContainer: {
    width: 176,
  },
  editableColumnContainerFirst: {
    width: TABLE_COLUMN_WIDTH_FIRST,
  },
}));

type EditableColumnProps = {
  index: number;
  placeholder: string;
  setCurrState: (s: string) => void;
  value?: string | undefined;
  isValid: boolean;
};
const EditableColumn: React.FC<EditableColumnProps> = ({
  index,
  placeholder,
  setCurrState,
  value,
  isValid,
}) => {
  const styles = useEditableColumnStyles();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      if (!isValid) {
        inputRef.current.focus();
      } else if (index === 1) {
        inputRef.current.focus();
      }
    }
  }, [isValid]);

  const inputValue = value !== undefined ? value : '';

  return (
    <div
      className={cn(
        index === 1
          ? styles.editableColumnContainerFirst
          : styles.editableColumnContainer,
      )}
    >
      <input
        className={cn(
          styles.columnStyle,
          index === 1 && styles.columnStyleFirst,
          !isValid ? styles.invalidInput : '',
        )}
        placeholder={placeholder}
        value={inputValue}
        ref={inputRef}
        onChange={(event) => {
          setCurrState(event.target.value);
        }}
      ></input>
      <div
        className={cn(styles.editLine, index === 1 && styles.editLineFirst)}
      ></div>
    </div>
  );
};
// ============================================================================================================

const useTableRowStyles = makeStyles(() => ({
  rowContainer: {
    position: 'relative',
    left: '-71px',
    width: 142 * styleguide.gridbase,
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
    width: 142 * styleguide.gridbase - 71,
    borderRadius: '2px',
    backgroundColor: '#FFF',
  },
  hoverableRow: {
    ':hover': {
      backgroundColor: '#FBF6EF',
      itemMenu: {
        opacity: 1,
      },
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
    // +1 to account for negative left margin
    width: 146 * styleguide.gridbase - 71 + 1,
    hover: 'none',
    marginLeft: -1,
  },
  firstColumnStyle: {
    width: TABLE_COLUMN_WIDTH_FIRST,
    height: '20px',
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: '18px',
    letterSpacing: '0.0.75px',
    fontWeight: '400',
  },
  otherColumnStyle: {
    width: TABLE_COLUMN_WIDTH_OTHER,
    height: '17px',
    fontSize: 10,
    color: theme.colors.text,
    lineHeight: '14px',
    fontWeight: '400',
    // border: '1px solid red',
  },
  editLine: {
    width: '480px',
    height: '1px',
    background: theme.primary.p8,
    margin: '5px 0px 0px 0px',
  },
  menuButton: {
    position: 'absolute',
    right: 2 * styleguide.gridbase,
    top: 2 * styleguide.gridbase,
  },
  itemMenu: {
    opacity: 0,
    ...styleguide.transition.short,
    transitionProperty: 'opacity',
  },
  itemMenuOpen: {
    opacity: 1,
  },
  permissionsColumn: {
    display: 'flex',
    justifyContent: 'center',
    width: 88,
  },
}));
type TableRowProps = {
  user: VertexManager<User>;
  newUser?: boolean;
  isSelected: boolean;
  onRowSelect: (user: string) => void;
  editMode: boolean;
  addMemberMode: boolean;
  isEditValid?: boolean;
  enabled?: boolean;
};

function TableRow({
  user,
  newUser,
  isSelected,
  onRowSelect,
  editMode,
  addMemberMode,
  enabled,
}: TableRowProps) {
  const styles = useTableRowStyles();
  const graphManager = useGraphManager();
  const partialUser = usePartialVertex(user, [
    'name',
    'email',
    'metadata',
    'permissions',
    'isDeleted',
  ]);
  const [localName, setLocalName] = useState(partialUser.name);
  const [localEmail, setLocalEmail] = useState(partialUser.email);
  const [localMetadata, setLocalMetadata] = useState(
    convertDictionaryToObject(partialUser.metadata),
  );
  const [isRowHovered, setIsRowHovered] = useState(false);
  const [editNow, setEditNow] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const [isNameValid, setIsNameValid] = useState(true);
  const [isEmailValid, setIsEmailValid] = useState(true);
  const partialRootUser = usePartialRootUser('permissions');

  const onSaveEdit = (
    userKey: string,
    name: string,
    email: string,
    metadata: { [key: string]: string },
  ) => {
    let isValid = true;
    if (!name || name.trim() === '') {
      console.log('Name is mandatory');
      setIsNameValid(false);
      isValid = false;
    } else {
      setIsNameValid(true);
    }

    if (!email || email.trim() === '' || !normalizeEmail(email)) {
      console.log('Email is invalid or empty');
      setIsEmailValid(false);
      isValid = false;
    } else {
      setIsEmailValid(true);
    }

    const userVertex = graphManager.getVertex<User>(userKey);
    if (!userVertex) {
      console.log('User not found');
      return false;
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

    return isValid;
  };

  const saveAndExitEditing = () => {
    if ((editNow && onSaveEdit) || newUser) {
      if (onSaveEdit(user.key, localName, localEmail, localMetadata)) {
        setEditNow(false);
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        (editNow || newUser) &&
        rowRef.current &&
        !rowRef.current.contains(event.target as Node)
      ) {
        saveAndExitEditing();
      }
    };
    if (editNow || newUser) {
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [editNow, newUser, rowRef, saveAndExitEditing]);

  const handleRowSelect = (user: string) => {
    if (editMode && isEmailValid && isNameValid) {
      setEditNow(true);
    } else if (user) {
      onRowSelect(user);
    }
  };

  const renderButton = useCallback(
    ({ isOpen }: { isOpen: boolean }) => (
      <div className={isOpen ? styles.itemMenuOpen : styles.itemMenu}>
        <img key="IconMoreSettings2" src="/icons/settings/More.svg" />
      </div>
    ),
    [],
  );
  const handleMouseEnter = () => {
    if (!isSelected) setIsRowHovered(true);
  };
  const handleMouseLeave = () => {
    setIsRowHovered(false);
  };

  const handleMetadataChange = (key: UserMetadataKey, value: string) => {
    setLocalMetadata({
      ...localMetadata,
      [key]: value,
    });
  };

  const removeUserFromOrg = () => {
    user && (partialUser.isDeleted = 1);
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

  const menu = (
    <Menu
      renderButton={renderButton}
      position="right"
      align="start"
      direction="out"
      className={cn(styles.menuButton)}
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
  );

  function onPermissionChange(perm: UserPermission) {
    return (checked: boolean) => {
      if (checked) {
        partialUser.permissions.add(perm);
      } else {
        partialUser.permissions.delete(perm);
      }
    };
  }

  const permissions = [
    <div key="Perm/ViewDashboard" className={cn(styles.permissionsColumn)}>
      <CheckBox
        onChange={onPermissionChange('view:dashboard')}
        value={partialUser.permissions.has('view:dashboard')}
        disabled={!partialRootUser.permissions.has('manage:users')}
      />
    </div>,
    <div key="Perm/ViewOrgSettings" className={cn(styles.permissionsColumn)}>
      <CheckBox
        onChange={onPermissionChange('view:settings:org')}
        value={partialUser.permissions.has('view:settings:org')}
        disabled={!partialRootUser.permissions.has('manage:users')}
      />
    </div>,
    <div key="Perm/ManageUsers" className={cn(styles.permissionsColumn)}>
      <CheckBox
        onChange={onPermissionChange('manage:users')}
        value={partialUser.permissions.has('manage:users')}
        disabled={!partialRootUser.permissions.has('manage:users')}
      />
    </div>,
  ];
  return (
    <div ref={rowRef} className={cn(styles.rowContainer)}>
      {enabled !== false && !addMemberMode && !editMode && isRowHovered && (
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
            styles.rowRight,
            !isSelected && !newUser && !editNow && styles.hoverableRow,
            isSelected && styles.selectedRow,
          )}
          onClick={() => {
            enabled !== false && user && handleRowSelect(user.key);
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className={cn(styles.firstColumnStyle)}>{partialUser.name}</div>
          <div className={cn(styles.otherColumnStyle)}>{partialUser.email}</div>
          <div className={cn(styles.otherColumnStyle)}>
            {partialUser.metadata.get('team')}
          </div>
          <div className={cn(styles.otherColumnStyle)}>
            {partialUser.metadata.get('companyRoles')}
          </div>
          {/* <div className={cn(styles.otherColumnStyle)}>
            {user.metadata.get('comments')}
          </div> */}
          {menu}
          {permissions}
        </div>
      ) : (
        <div
          className={cn(
            styles.selectedRow,
            styles.rowRight,
            styles.hoverableRow,
          )}
        >
          <EditableColumn
            index={1}
            placeholder={'Full name *'}
            setCurrState={setLocalName}
            value={localName || ''}
            isValid={isNameValid}
          />
          <EditableColumn
            index={2}
            placeholder={'Email *'}
            setCurrState={setLocalEmail}
            value={localEmail || ''}
            isValid={isEmailValid}
          />
          <EditableColumn
            index={4}
            placeholder="Team"
            value={localMetadata && localMetadata.team}
            setCurrState={(value) => handleMetadataChange('team', value)}
            isValid={true}
          />
          <EditableColumn
            index={3}
            placeholder="Roles"
            value={localMetadata && localMetadata.companyRoles}
            setCurrState={(value) =>
              handleMetadataChange('companyRoles', value)
            }
            isValid={true}
          />
          {/* later might be changed for EditableColumn for comments */}
          {/* <div className={cn(styles.otherColumnStyle)}>
            {user.metadata.get('comments')}
          </div> */}
          {menu}
          {permissions}
        </div>
      )}
    </div>
  );
}

//============================================+++++++=====================================================

const useUserTableStyles = makeStyles(() => ({
  tableContainer: {
    width: 142 * styleguide.gridbase,
    display: 'flex',
    position: 'relative',
    marginBottom: 4 * styleguide.gridbase,
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
    width: 805,
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
  columnNames: {
    display: 'flex',
    gap: styleguide.gridbase,
    width: '100%',
    padding: '12px 16px',
  },
  columnHeaderOther: {
    fontSize: 10,
    width: TABLE_COLUMN_WIDTH_OTHER,
  },
  columnHeaderFirst: {
    width: TABLE_COLUMN_WIDTH_FIRST,
  },
  columnHeaderPermission: {
    width: TABLE_COLUMN_WIDTH_PERMISSION,
    textAlign: 'center',
  },
}));

type UserTableColumnNamesProps = {
  showPermissions: boolean;
};

function UserTableColumnNames({ showPermissions }: UserTableColumnNamesProps) {
  const styles = useUserTableStyles();
  return (
    <div className={cn(styles.columnNames)}>
      <div className={cn(styles.columnHeaderOther, styles.columnHeaderFirst)}>
        Full Name
      </div>
      <div className={cn(styles.columnHeaderOther)}>E-mail</div>
      <div className={cn(styles.columnHeaderOther)}>Team</div>
      <div className={cn(styles.columnHeaderOther)}>Roles</div>
      {showPermissions && (
        <div
          className={cn(
            styles.columnHeaderOther,
            styles.columnHeaderPermission,
          )}
        >
          View Dashboard
        </div>
      )}
      {showPermissions && (
        <div
          className={cn(
            styles.columnHeaderOther,
            styles.columnHeaderPermission,
          )}
        >
          View Org. Settings
        </div>
      )}
      {showPermissions && (
        <div
          className={cn(
            styles.columnHeaderOther,
            styles.columnHeaderPermission,
          )}
        >
          Manage Users
        </div>
      )}
    </div>
  );
}

type UserTableProps = {
  showSelection: boolean;
  onRowSelect: (user: string) => void;
  selectedUsers: Set<string>;
  showSearch: boolean;
  editMode: boolean;
  addMemberMode: boolean;
  enabled?: boolean;
};

function UserTable({
  showSelection,
  selectedUsers,
  onRowSelect,
  showSearch,
  editMode,
  addMemberMode,
  enabled,
}: UserTableProps) {
  const styles = useUserTableStyles();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [newUser, setNewUser] = useState<VertexManager>();
  const graphManager = useGraphManager();
  const usersQuery = useSharedQuery('users');
  const users = useVertices(usersQuery.results) as User[];

  const usersWithNewFirst = users;
  const filtered = suggestResults(
    searchTerm,
    usersWithNewFirst,
    (t) => t.name,
    Number.MAX_SAFE_INTEGER,
  );

  const handleNewMember = useCallback(() => {
    const createdVertex = graphManager.createVertex<User>(
      SchemeNamespace.USERS,
      {},
    );
    setNewUser(createdVertex.manager);

    if (
      !usersWithNewFirst.some((user) => user.manager === createdVertex.manager)
    ) {
      usersWithNewFirst.unshift(createdVertex);
    }
  }, [graphManager]);

  return (
    <div className={cn(styles.tableContainer)}>
      <div className={cn(styles.tableContent)}>
        <UserTableColumnNames showPermissions={true} />
        {showSearch && (
          <SearchBar
            users={users}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            isSearching={showSearch}
            width={142 * styleguide.gridbase - 71}
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
        {filtered.map((user: User) => (
          <TableRow
            key={user.key}
            user={user.manager}
            newUser={newUser === user.manager}
            onRowSelect={() => onRowSelect(user.key)}
            isSelected={showSelection && selectedUsers.has(user.key)}
            editMode={editMode}
            addMemberMode={addMemberMode}
            enabled={enabled}
          />
        ))}
      </div>
    </div>
  );
}
export default UserTable;
