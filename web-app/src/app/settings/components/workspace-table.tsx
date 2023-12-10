import React, { CSSProperties, ChangeEvent, useEffect, useState } from 'react';
import {
  User,
  Workspace,
} from '../../../../../cfds/client/graph/vertices/index.ts';
import { suggestResults } from '../../../../../cfds/client/suggestions.ts';
import { IconSearch } from '../../../../../styles/components/new-icons/icon-search.tsx';
import { TextSm, Text } from '../../../../../styles/components/typography.tsx';
import { useSharedQuery } from '../../../core/cfds/react/query.ts';
import { IconSelect } from '../plugins/IconSelect.tsx';

const [searchTerm, setSearchTerm] = useState<string>('');
const [filteredWorkspaces, setFilteredWorkspaces] = useState<Workspace[]>([]);

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
  const usersQuery = useSharedQuery('users');

  const getRowStyle = (ws?: Workspace, index?: number) => {
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
    if (ws && showSelection && selectedWorkspaces.includes(ws)) {
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
    if (workspaces) {
      const filtered = suggestResults(searchTerm, workspaces, (t) => t.name);
      setFilteredWorkspaces(filtered);
    }
  }, [searchTerm, usersQuery.results]);

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
        <div style={searchRowStyle}>
          <div style={{ marginRight: '4px' }}>
            <IconSearch />
          </div>
          <Text>
            <input
              type="text"
              placeholder="Search workspace"
              value={searchTerm}
              onChange={handleSearchChange}
              style={InputTextStyle}
            />
          </Text>
        </div>
      )}
      <div style={scrollContainerStyle}>
        {filteredWorkspaces.map((ws: Workspace, index: number) => (
          <div
            key={index}
            className={isHoverable ? 'hover-row' : ''}
            style={getRowStyle(ws, index)}
            onClick={() => onRowSelect(ws)}
          >
            {isHoverable && <IconSelect />}
            <Text style={firstColumnStyle}>{ws.name}</Text>
            <TextSm style={otherColumnStyle}>{getUserNames(ws.users)}</TextSm>
          </div>
        ))}
      </div>
    </div>
  );
};
export default WorkspaceTable;
