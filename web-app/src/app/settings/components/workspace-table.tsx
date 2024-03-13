import React, { useEffect, useState } from 'react';
import {
  User,
  Workspace,
} from '../../../../../cfds/client/graph/vertices/index.ts';
import { suggestResults } from '../../../../../cfds/client/suggestions.ts';
import { TextSm, Text } from '../../../../../styles/components/typography.tsx';
import { cn, makeStyles } from '../../../../../styles/css-objects/index.ts';
import { useWorkspaceColor } from '../../../shared/workspace-icon/index.tsx';
import { styleguide } from '../../../../../styles/styleguide.ts';
import { layout } from '../../../../../styles/layout.ts';
import { SearchBar } from '../../../../../components/search-bar.tsx';
import { useGraphManager } from '../../../core/cfds/react/graph.tsx';

const ROW_WIDTH = 843;
const ROW_TAB_WIDTH = 71;

const useRowInTableStyles = makeStyles(() => ({
  rowContainer: {
    position: 'relative',
    left: '-71px',
    width: ROW_WIDTH,
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
    width: ROW_WIDTH - ROW_TAB_WIDTH,
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
    width: ROW_TAB_WIDTH,
    left: '40px',
    top: '9px',
  },
  rowLeftHover: {
    left: '0px',
  },
  selectHover: {
    position: 'absolute',
    width: ROW_TAB_WIDTH,
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
    // width: '176px',
    width: '500px',
    height: '17px',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  toggleColorColumnStyle: {
    display: 'flex',
    width: '32px',
    height: '17px',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  itemToggle: {
    marginLeft: styleguide.gridbase * 0.5,
    height: styleguide.gridbase * 2,
    width: styleguide.gridbase * 2,
    borderRadius: styleguide.gridbase,
    flexShrink: 0,
    background: 'var(--ws-inactive)',
    basedOn: [layout.column, layout.centerCenter],
  },
}));

type RowInTableProps = {
  ws: Workspace;
  onRowSelect: (ws: Workspace) => void;
  isSelected: boolean;
  isEditable: boolean;
};
const RowInTable: React.FC<RowInTableProps> = ({
  ws,
  isSelected,
  onRowSelect,
  isEditable,
}) => {
  const styles = useRowInTableStyles();
  const [isRowHovered, setIsRowHovered] = useState(false);
  const getUserNames = (users: Set<User>) => {
    return Array.from(users)
      .map((user) => user.name)
      .join(', ');
  };
  const handleMouseEnter = () => {
    setIsRowHovered(true);
  };
  const handleMouseLeave = () => {
    setIsRowHovered(false);
  };
  interface WorkspaceColorProps {
    workspace: Workspace;
  }
  function WorkspaceColor({ workspace }: WorkspaceColorProps) {
    const styles = useRowInTableStyles();
    const color = useWorkspaceColor(workspace)?.background || 'transparent';
    return (
      <div
        className={cn(styles.itemToggle)}
        style={{ backgroundColor: color }}
      ></div>
    );
  }
  return (
    <div
      className={cn(styles.rowContainer)}
      onClick={() => onRowSelect(ws)}
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
      <div
        className={cn(
          styles.rowRight,
          isEditable && styles.hoverableRow,
          isSelected && styles.selectedRow,
        )}
      >
        <Text className={cn(styles.firstColumnStyle)}>{ws.name}</Text>
        <TextSm className={cn(styles.toggleColorColumnStyle)}>
          {<WorkspaceColor workspace={ws} />}
        </TextSm>
        <TextSm className={cn(styles.otherColumnStyle)}>
          {getUserNames(ws.users)}
        </TextSm>
      </div>
    </div>
  );
};

const useWorkspaceTableStyles = makeStyles(() => ({
  searchRowStyle: {
    display: 'flex',
    padding: '12px 16px',
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
  scrollTable: {
    maxHeight: '700px',
    overflowY: 'scroll',
    overflowX: 'visible',
  },
}));

type WorkspaceTableProps = {
  workspaces: Workspace[];
  onRowSelect: (ws: Workspace) => void;
  showSelection: boolean;
  selectedUsers: Set<string>;
  selectedWorkspaces: Workspace[];
  showSearch: boolean;
  isEditable: boolean;
};

const WorkspaceTable: React.FC<WorkspaceTableProps> = ({
  workspaces,
  onRowSelect,
  showSelection,
  selectedWorkspaces,
  showSearch,
  isEditable,
}) => {
  const styles = useWorkspaceTableStyles();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSearching, setIsSearching] = useState(showSearch ? true : false);

  // useEffect(() => {
  //   if (workspaces) {
  //     const filtered = suggestResults(
  //       searchTerm,
  //       workspaces,
  //       (t) => t.name,
  //       Number.MAX_SAFE_INTEGER
  //     );
  //     setFilteredWorkspaces(filtered);
  //   }
  // }, [searchTerm, workspaces]);

  const filtered = suggestResults(
    searchTerm,
    workspaces,
    (t) => t.name,
    Number.MAX_SAFE_INTEGER,
  );

  const wsKey = 'SettingWs_';
  const graph = useGraphManager();
  const personalWsKey = `${graph.rootKey}-ws`;
  return (
    <div className={isEditable ? cn(styles.tableContainer) : undefined}>
      <div className={cn(styles.tableContent)}>
        {showSearch && (
          <SearchBar
            workspaces={workspaces}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            isSearching={isSearching}
            width={ROW_WIDTH - ROW_TAB_WIDTH}
          />
        )}
        {/* <div className={styles.scrollTable}> */}
        {filtered.map(
          (ws: Workspace) =>
            ws.key !== personalWsKey && (
              <RowInTable
                key={ws.key + wsKey}
                ws={ws}
                onRowSelect={onRowSelect}
                isSelected={showSelection && selectedWorkspaces.includes(ws)}
                isEditable={isEditable && !selectedWorkspaces.includes(ws)}
              />
            ),
        )}
      </div>
      {/* </div> */}
    </div>
  );
};
export default WorkspaceTable;
