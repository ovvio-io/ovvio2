import React, { CSSProperties, useEffect, useMemo, useState } from 'react';
import { useSharedQuery } from '../../../../../core/cfds/react/query.ts';
import {
  useVertexByKey,
  useVertices,
} from '../../../../../core/cfds/react/vertex.ts';
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
  selectedUsers: Set<string>;
  setSelectedUsers: (users: Set<string>) => void;
};

export const Step2: React.FC<Step2Props> = ({
  setStep,
  selectedUsers,
  setSelectedUsers,
}) => {
  const [selectedWorkspaces, setSelectedWorkspaces] = useState<Workspace[]>([]);
  const workspacesQuery = useSharedQuery('workspaces');
  const workspaces = useVertices(workspacesQuery.results) as Workspace[];

  const usersData = new Map<string, User>();

  //TODO: fix remove userPill bug.
  selectedUsers.forEach((user) => {
    const userData: User = useVertexByKey(user);
    debugger;
    usersData.set(user, userData);
  });

  const handleAssignWsClick = () => {
    selectedWorkspaces.forEach((ws) => {
      selectedUsers.forEach((user) => {
        const u = usersData.get(user);
        if (u) ws.users.add(u);
      });
    });
    setStep(3);
  };

  const HeaderContainerStyle: CSSProperties = {
    padding: '50px 0px 29px',
    maxWidth: '800px',
  };
  const FunctionsHeader: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  };
  const ChosenMembersContainer: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    maxWidth: '800px',
    height: '29px',
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

  useEffect(() => {
    if (selectedUsers.size === 0) {
      setStep(1);
    }
  }, [selectedUsers, setStep]);

  const UserPillKey = 'UserPillKey1_';

  return (
    <div>
      <div style={HeaderContainerStyle}>
        <div style={FunctionsHeader}>
          <div>Choose workspaces to assign</div>
          {selectedWorkspaces && (
            <AssignWsButton
              AssignWsClick={handleAssignWsClick}
              disable={selectedWorkspaces.length === 0}
            />
          )}
        </div>
        <div style={ChosenMembersContainer}>
          {[...selectedUsers].map((user: string) => (
            <UserPill
              key={UserPillKey + user}
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
        isEditable={true}
      />
    </div>
  );
};
