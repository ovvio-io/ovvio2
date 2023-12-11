import React, { CSSProperties } from 'react';
import { useSharedQuery } from '../../../../../core/cfds/react/query.ts';
import { useVertices } from '../../../../../core/cfds/react/vertex.ts';
import { User } from '../../../../../../../cfds/client/graph/vertices/user.ts';
import { Bold } from '../../../../../../../styles/components/typography.tsx';
import {
  ChooseWsButton,
  UserPill,
} from '../../../components/settings-buttons.tsx';
import UserTable from '../../../components/user-table.tsx';

type Step1Props = {
  setStep: (step: number) => void;
  selectedUsers: User[];
  setSelectedUsers: (user: User[]) => void;
};
export const Step1: React.FC<Step1Props> = ({
  setStep,
  selectedUsers,
  setSelectedUsers,
}) => {
  const usersQuery = useSharedQuery('users');
  const users = useVertices(usersQuery.results) as User[];
  const handleChooseWsClick = () => {
    setStep(2);
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
    marginBottom: '11px',
  };

  const handleRowSelect = (user: User) => {
    if (selectedUsers.includes(user)) {
      setSelectedUsers(selectedUsers.filter((u) => u !== user));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  return (
    <div>
      <div style={HeaderContainerStyle}>
        <div style={FunctionsHeader}>
          <div>Choose members to assign</div>
          {selectedUsers && (
            <ChooseWsButton onChooseWsClick={handleChooseWsClick} />
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
        <Bold>Org. Members</Bold>
      </div>
      <UserTable
        users={users}
        onRowSelect={handleRowSelect}
        showSelection={true}
        selectedUsers={selectedUsers}
        showSearch={true}
        isHoverable={true}
      />
    </div>
  );
};
