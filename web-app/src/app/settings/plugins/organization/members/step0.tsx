import React, { CSSProperties } from 'react';
import { useSharedQuery } from '../../../../../core/cfds/react/query.ts';
import { useVertices } from '../../../../../core/cfds/react/vertex.ts';
import { User } from '../../../../../../../cfds/client/graph/vertices/user.ts';
import { Bold } from '../../../../../../../styles/components/typography.tsx';
import {
  AddMemberButton,
  AssignButton,
  EditButton,
} from '../../../components/settings-buttons.tsx';
import UserTable from '../../../components/user-table.tsx';

type Step0Props = {
  setStep: (step: number) => void;
};

export const Step0: React.FC<Step0Props> = ({ setStep }) => {
  const usersQuery = useSharedQuery('users');
  const users = useVertices(usersQuery.results) as User[];

  const step0ContainerStyle: CSSProperties = {
    display: 'flex',
    gap: '16px',
    justifyContent: 'flex-end',
    alignItems: 'center',
  };
  const HeaderContainerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    padding: '50px 0px 29px',
    maxWidth: '802px',
  };

  const handleAssignClick = () => {
    setStep(1);
  };
  const handleAddMemberClick = () => {
    setStep(5);
  };

  return (
    <div>
      <div style={HeaderContainerStyle}>
        <Bold>Org. Members</Bold>
        <div style={step0ContainerStyle}>
          <AssignButton onAssignClick={handleAssignClick} blue={true} />
          <AddMemberButton onAddClick={handleAddMemberClick} />
        </div>
      </div>
      <UserTable
        onRowSelect={() => {}}
        showSelection={false}
        selectedUsers={new Set<string>()}
        showSearch={true}
        editMode={true}
      />
    </div>
  );
};
