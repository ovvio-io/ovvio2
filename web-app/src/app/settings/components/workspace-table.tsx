import React, { ChangeEvent, useEffect, useState } from 'react';
import {
  User,
  Workspace,
} from '../../../../../cfds/client/graph/vertices/index.ts';
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
    width: '711px',
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

type WorkspaceTableProps = {
  workspaces: Workspace[];
  onRowSelect: (ws: Workspace) => void;
  showSelection: boolean;
  selectedUsers: User[];
  selectedWorkspaces: Workspace[];
  showSearch: boolean;
  isHoverable: boolean;
};

const WorkspaceTable: React.FC<WorkspaceTableProps> = ({
  workspaces,
  onRowSelect,
  showSelection,
  selectedUsers,
  selectedWorkspaces,
  showSearch,
  isHoverable,
}) => {
  type RowInTableProps = {
    ws: Workspace;
    isSelected: boolean;
    isHoverable: boolean;
  };

  const RowInTable: React.FC<RowInTableProps> = ({
    ws,
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
        onClick={() => onRowSelect(ws)}
      >
        <Text className={cn(styles.firstColumnStyle)}>{ws.name}</Text>
        <TextSm className={cn(styles.otherColumnStyle)}>
          {getUserNames(ws.users)}
        </TextSm>
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
      width: '711px',
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
  const [filteredWorkspaces, setFilteredWorkspaces] = useState<Workspace[]>([]);

  useEffect(() => {
    if (workspaces) {
      const filtered = suggestResults(searchTerm, workspaces, (t) => t.name);
      setFilteredWorkspaces(filtered);
    }
  }, [searchTerm, workspaces]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  const getUserNames = (users: Set<User>) => {
    return Array.from(users)
      .map((user) => user.name)
      .join(', ');
  };
  return (
    <div>
      {showSearch && (
        <div className={cn(styles.searchRowStyle)}>
          <div style={{ marginRight: '4px' }}>
            <IconSearch />
          </div>
          <Text>
            <input
              type="text"
              placeholder="Search workspace"
              value={searchTerm}
              onChange={handleSearchChange}
              className={styles.InputTextStyle}
            />
          </Text>
        </div>
      )}
      <div className={cn(styles.scrollContainerStyle)}>
        {filteredWorkspaces.map((ws: Workspace) => (
          <RowInTable
            ws={ws}
            isSelected={showSelection && selectedWorkspaces.includes(ws)}
            isHoverable={isHoverable && !selectedWorkspaces.includes(ws)}
          />
        ))}
      </div>
    </div>
  );
};
export default WorkspaceTable;
