import React, {
  CSSProperties,
  ReactElement,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as SetUtils from '../../../../../../../base/set.ts';
import { useSharedQuery } from '../../../../../core/cfds/react/query.ts';
import {
  useVertexByKey,
  useVertices,
} from '../../../../../core/cfds/react/vertex.ts';
import { User } from '../../../../../../../cfds/client/graph/vertices/user.ts';
import {
  Bold,
  TextSm,
} from '../../../../../../../styles/components/typography.tsx';
import {
  AssignWsBlueButton,
  AssignWsButton,
  CancelButton,
  UserPill,
} from '../../../components/settings-buttons.tsx';
import { Workspace } from '../../../../../../../cfds/client/graph/vertices/workspace.ts';
import WorkspaceTable from '../../../components/workspace-table.tsx';
import { WorkspaceIndicator } from '../../../../../../../components/workspace-indicator.tsx';
import Menu from '../../../../../../../styles/components/menu.tsx';

type Step2Props = {
  setStep: (step: number) => void;
  selectedUsers: Set<string>;
  setSelectedUsers: (users: Set<string>) => void;
  selectedWorkspaces: Workspace[];
  setSelectedWorkspaces: (workspaces: Workspace[]) => void;
};

export const Step2: React.FC<Step2Props> = ({
  setStep,
  selectedUsers,
  setSelectedUsers,
  selectedWorkspaces,
  setSelectedWorkspaces,
}) => {
  const workspacesQuery = useSharedQuery('workspaces');
  const workspaces = useVertices(workspacesQuery.results) as Workspace[];
  const usersData = new Map<string, User>();

  const HeaderContainerStyle: CSSProperties = {
    padding: '50px 0px 8px',
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

  const WorkspaceIndicatorContainer: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    maxWidth: '800px',
    height: '29px',
    gap: '4px',
    marginBottom: '8px',
  };
  const toggleViewButton: CSSProperties = {
    position: 'absolute',
    bottom: '-124px',
    cursor: 'pointer',
    textDecoration: 'underline',
    fontSize: 10,
    fontFamily: 'Poppins',
    lineHeight: '14px',
    letterSpacing: '-0.1px',
  };
  const AssignsContainer: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  };
  const confirmation: CSSProperties = {
    display: 'flex',
    padding: '8px 10px 10px ',
    flexDirection: 'column',
    alignItems: 'center',
    fontWeight: '600',
    fontSize: '14px',
    maxWidth: '200px',
  };
  const confirmationButtons: CSSProperties = {
    display: 'flex',
    padding: '16px 0px 16px 0px',
    flexDirection: 'column',
    width: '180px',
    gap: '8px',
  };

  //TODO: fix remove userPill bug.
  selectedUsers.forEach((user) => {
    const userData: User = useVertexByKey(user);
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

  const handleAssignAllWsClick = () => {
    workspaces.forEach((ws) => {
      selectedUsers.forEach((user) => {
        const u = usersData.get(user);
        if (u) ws.users.add(u);
      });
    });
    setSelectedWorkspaces(workspaces);
    setStep(3);
  };
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

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
          <div style={AssignsContainer}>
            {selectedWorkspaces && (
              <AssignWsButton
                AssignWsClick={handleAssignWsClick}
                disable={selectedWorkspaces.length === 0}
              />
            )}
            {selectedWorkspaces.length > 0 && (
              <TextSm onClick={toggleMenu} style={toggleViewButton}>
                Assign to all
              </TextSm>
            )}
          </div>
          {isMenuOpen && (
            <Menu
              isOpen={isMenuOpen}
              toggleMenu={toggleMenu}
              renderButton={() => <div style={{ display: 'none' }}></div>}
              position="right"
              align="start"
              direction="out"
              style={{ position: 'absolute', right: '635px', top: '142px' }}
            >
              <div style={confirmation}>
                <div style={{ textAlign: 'center' }}>
                  Assign selected members to all workspaces?
                </div>{' '}
                <div style={confirmationButtons}>
                  <AssignWsBlueButton
                    AssignWsClick={handleAssignAllWsClick}
                    disable={false}
                  />
                  <CancelButton onCancel={toggleMenu} />{' '}
                </div>
              </div>
            </Menu>
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
        <Bold>Workspace Settings</Bold>
        <div style={WorkspaceIndicatorContainer}>
          {[...selectedWorkspaces].map((ws: Workspace) => (
            <WorkspaceIndicator key={ws.key} workspace={ws} />
          ))}
        </div>
      </div>
      <WorkspaceTable
        workspaces={workspaces.filter(
          (ws) =>
            SetUtils.intersectionSize(
              SetUtils.map(ws.users, (u) => u.key),
              selectedUsers,
            ) !== selectedUsers.size,
        )}
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
