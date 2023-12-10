import React, { CSSProperties, useState } from 'react';
import { useSharedQuery } from '../../../../../core/cfds/react/query.ts';
import { useVertices } from '../../../../../core/cfds/react/vertex.ts';
import { User } from '../../../../../../../cfds/client/graph/vertices/user.ts';
import { Bold } from '../../../../../../../styles/components/typography.tsx';
import { ChooseWsButton } from '../../../components/settings-buttons.tsx';
import { AssigneePill } from '../../../../workspace-content/workspace-view/cards-display/display-bar/filters/active-filters.tsx';
import { Workspace } from '../../../../../../../cfds/client/graph/vertices/workspace.ts';
import WorkspaceTable from '../../../components/workspace-table.tsx';

type Step2Props = {
  setStep: (step: number) => void;
  selectedUsers: User[];
};

export const Step2: React.FC<Step2Props> = ({ setStep, selectedUsers }) => {
  const [selectedWorkspaces, setSelectedWorkspaces] = useState<Workspace[]>([]);
  const workspacesQuery = useSharedQuery('workspaces');
  const workspaces = useVertices(workspacesQuery.results) as Workspace[];

  const handleChooseWsClick = () => {
    setStep(3);
  };

  const HeaderContainerStyle: CSSProperties = {
    padding: '50px 0px 24px',
    maxWidth: '900px',
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
  };
  const tableHeader: CSSProperties = {
    display: 'flex',
    padding: '34px 0px 0px 0px',
  };

  const handleRowSelect = (ws: Workspace) => {
    if (selectedWorkspaces.includes(ws)) {
      setSelectedWorkspaces(selectedWorkspaces.filter((u) => u !== ws));
    } else {
      setSelectedWorkspaces([...selectedWorkspaces, ws]);
    }
  };

  return (
    <div style={HeaderContainerStyle}>
      <div style={FunctionsHeader}>
        <div>Choose workspaces to assign</div>
        {selectedWorkspaces && (
          <ChooseWsButton onChooseWsClick={handleChooseWsClick} />
        )}
      </div>
      <div style={ChosenMembersContainer}>
        {selectedUsers.map((user: User, index: number) => (
          <AssigneePill key={user.key} user={user.manager} />
        ))}
      </div>
      <div style={tableHeader}>
        <Bold>My Workspaces</Bold>
      </div>

      <WorkspaceTable
        workspaces={workspaces}
        onRowSelect={handleRowSelect}
        showSelection={false}
        selectedUsers={selectedUsers}
        selectedWorkspaces={selectedWorkspaces}
        showSearch={false}
        isHoverable={true}
      />
    </div>
  );
};
