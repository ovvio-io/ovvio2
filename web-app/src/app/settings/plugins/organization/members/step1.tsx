import React, { CSSProperties, useEffect, useRef } from 'react';
import { Bold } from '../../../../../../../styles/components/typography.tsx';
import { UserPill } from '../../../components/settings-buttons.tsx';
import UserTable from '../../../components/user-table.tsx';
import { WhiteActionButton } from '../../../components/settings-buttons.tsx';

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
  const handleChooseWsClick = () => {
    setStep(2);
  };
  const HeaderContainerStyle: CSSProperties = {
    padding: '50px 0px 29px',
  };
  const FunctionsHeader: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    maxWidth: '1085px',
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
            <WhiteActionButton
              onClick={handleChooseWsClick}
              disable={selectedUsers.size === 0}
              buttonText={'Choose Workspaces'}
              imgSrc={'/icons/settings/Archive.svg'}
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
        onRowSelect={handleRowSelect}
        showSelection={true}
        selectedUsers={selectedUsers}
        showSearch={true}
        editMode={false}
        addMemberMode={false}
      />
    </div>
  );
};
