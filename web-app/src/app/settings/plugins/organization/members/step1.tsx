import React, { CSSProperties, useEffect, useRef } from 'react';
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
  selectedUsers: Set<string>;
  setSelectedUsers: (users: Set<string>) => void;
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

  const handleRowSelect = (user?: string) => {
    if (user) {
      const updatedSelectedUsers = new Set(selectedUsers);
      if (updatedSelectedUsers.has(user)) {
        updatedSelectedUsers.delete(user);
      } else {
        updatedSelectedUsers.add(user);
      }
      setSelectedUsers(updatedSelectedUsers);
    }
  };

  const UserPillKey = 'UserPillKey_';

  return (
    <div>
      <div style={HeaderContainerStyle}>
        <div style={FunctionsHeader}>
          <div>Choose members to assign</div>
          {selectedUsers && (
            <ChooseWsButton
              onChooseWsClick={handleChooseWsClick}
              disable={selectedUsers.size === 0}
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
        <Bold>Org. Members</Bold>
      </div>
      <UserTable
        users={users}
        onRowSelect={handleRowSelect}
        showSelection={true}
        selectedUsers={selectedUsers}
        showSearch={true}
        isEditable={true}
        editMode={false}
      />
    </div>
  );
};
