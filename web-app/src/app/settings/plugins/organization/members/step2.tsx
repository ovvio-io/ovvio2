import React, { CSSProperties, useState } from 'react';
import { useSharedQuery } from '../../../../../core/cfds/react/query.ts';
import { useVertices } from '../../../../../core/cfds/react/vertex.ts';
import { User } from '../../../../../../../cfds/client/graph/vertices/user.ts';
import { Bold } from '../../../../../../../styles/components/typography.tsx';
import {
  AssignButton,
  ChooseWsButton,
  EditButton,
} from '../../../components/settings-buttons.tsx';
import UserTable from '../../../components/user-table.tsx';
import { AssigneePill } from '../../../../workspace-content/workspace-view/cards-display/display-bar/filters/active-filters.tsx';

export function Step2({ setStep, selectedUsers }) {
  const usersQuery = useSharedQuery('users');
  const users = useVertices(usersQuery.results) as User[];
  const handleChooseWsClick = () => {
    setStep(2);
  };

  const step0ContainerStyle: CSSProperties = {
    display: 'flex',
    gap: '16px',
    justifyContent: 'flex-end',
    alignItems: 'center',
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
  return (
    <div style={HeaderContainerStyle}>
      <div style={FunctionsHeader}>
        <div>Choose workspaces to assign</div>
        {selectedUsers && (
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
      <UserTable
        users={users}
        onRowSelect={() => {}}
        showSelection={false}
        showSearch={false}
      />
    </div>
  );
}
