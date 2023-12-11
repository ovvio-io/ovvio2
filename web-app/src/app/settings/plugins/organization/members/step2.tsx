import React, { CSSProperties, useState } from 'react';
import { useSharedQuery } from '../../../../../core/cfds/react/query.ts';
import { useVertices } from '../../../../../core/cfds/react/vertex.ts';
import { User } from '../../../../../../../cfds/client/graph/vertices/user.ts';
import { Bold } from '../../../../../../../styles/components/typography.tsx';
import {
  AssignWsButton,
  UserPill,
} from '../../../components/settings-buttons.tsx';
import { Workspace } from '../../../../../../../cfds/client/graph/vertices/workspace.ts';
import WorkspaceTable from '../../../components/workspace-table.tsx';

type Step2Props = {
  setStep: (step: number) => void;
  selectedUsers: User[];
  setSelectedUsers: (user: User[]) => void;
};

export const Step2: React.FC<Step2Props> = ({
  setStep,
  selectedUsers,
  setSelectedUsers,
}) => {
  const [selectedWorkspaces, setSelectedWorkspaces] = useState<Workspace[]>([]);
  const workspacesQuery = useSharedQuery('workspaces');
  const workspaces = useVertices(workspacesQuery.results) as Workspace[];

  const handleAssignWsClick = () => {
    selectedWorkspaces.map((ws: Workspace) =>
      selectedUsers.map((user: User) => ws.users.add(user))
    );
    setStep(3);
  };

  const HeaderContainerStyle: CSSProperties = {
    padding: '50px 0px 24px',
    maxWidth: '738px',
  };
  const FunctionsHeader: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  };
  const ChosenMembersContainer: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    maxWidth: '400px',
    gap: '4px',
    marginBottom: '11px',
  };

  const handleRowSelect = (ws: Workspace) => {
    if (selectedWorkspaces.includes(ws)) {
      setSelectedWorkspaces(selectedWorkspaces.filter((w) => w !== ws));
    } else {
      setSelectedWorkspaces([...selectedWorkspaces, ws]);
    }
  };

  return (
    <div>
      <div style={HeaderContainerStyle}>
        <div style={FunctionsHeader}>
          <div>Choose workspaces to assign</div>
          {selectedWorkspaces && (
            <AssignWsButton AssignWsClick={handleAssignWsClick} />
          )}
        </div>
        <div style={ChosenMembersContainer}>
          {selectedUsers.map((user: User) => (
            <UserPill
              user={user}
              selectedUsers={selectedUsers}
              setSelectedUsers={setSelectedUsers}
            />
          ))}
        </div>
        <Bold>My Workspaces</Bold>
      </div>
      <WorkspaceTable
        workspaces={workspaces}
        onRowSelect={handleRowSelect}
        showSelection={true}
        selectedUsers={selectedUsers}
        selectedWorkspaces={selectedWorkspaces}
        showSearch={true}
        isHoverable={true}
      />
    </div>
  );
};
