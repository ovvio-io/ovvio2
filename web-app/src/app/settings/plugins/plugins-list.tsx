import React, { CSSProperties, ChangeEvent, useEffect, useState } from 'react';
import { SettingsTabId } from '../../../../../cfds/base/scheme-types.ts';
import { tabsStyles } from '../components/tabs-style.tsx';
import { usePartialRootUser } from '../../../core/cfds/react/graph.tsx';
import SettingsField from '../components/settings-field.tsx';
import { cn } from '../../../../../styles/css-objects/index.ts';
import { useSharedQuery } from '../../../core/cfds/react/query.ts';
import { useVertices } from '../../../core/cfds/react/vertex.ts';
import { IconSearch } from '../../../../../styles/components/new-icons/icon-search.tsx';
import {
  TextSm,
  Text,
  Bold,
} from '../../../../../styles/components/typography.tsx';
import { User } from '../../../../../cfds/client/graph/vertices/user.ts';
import {
  AssignButton,
  ChooseWsButton,
  EditButton,
} from '../components/settings-buttons.tsx';
import { suggestResults } from '../../../../../cfds/client/suggestions.ts';
import { IconSelect } from './IconSelect.tsx';
import MultiSelection from '../components/multi-selection.tsx';
import { IconCheck } from '../components/icon-check.tsx';
import { Workspace } from '../../../../../cfds/client/graph/vertices/index.ts';
import { AssigneePill } from '../../workspace-content/workspace-view/cards-display/display-bar/filters/active-filters.tsx';
import {
  Button,
  RaisedButton,
} from '../../../../../styles/components/buttons.tsx';

export interface SettingsTabPlugin {
  title: SettingsTabId;
  render: () => JSX.Element;
  category: string;
}

export const tabPlugins: SettingsTabPlugin[] = [
  {
    title: 'general-personal',
    render: () => <GeneralTabContent />,
    category: 'personal-info',
  },
  {
    title: 'details',
    render: () => <DetailsTabContent />,
    category: 'personal-info',
  },
  {
    title: 'general-workspaces',
    render: () => <GeneralOrgTabContent />,
    category: 'workspaces-info',
  },
  {
    title: 'tags',
    render: () => <DetailsTabContent />,
    category: 'workspaces-info',
  },
  {
    title: 'roles-details',
    render: () => <DetailsTabContent />,
    category: 'workspaces-info',
  },
  {
    title: 'general-organization',
    render: () => <GeneralOrgTabContent />,
    category: 'organization-info',
  },
  {
    title: 'members',
    render: () => <MembersTabContent />,
    category: 'organization-info',
  },
  {
    title: 'billing',
    render: () => <DetailsTabContent />,
    category: 'organization-info',
  },
];

export function GeneralTabContent() {
  const styles = tabsStyles();
  const userData = usePartialRootUser('name', 'email');
  return (
    <div className={cn(styles.barRow)}>
      <SettingsField
        title="Full Name"
        placeholder="Add you'r name"
        value={userData.name}
        toggle="editable"
        onChange={(newValue) => (userData.name = newValue)}
      />
      <SettingsField
        title="Email Address"
        toggle="label"
        value={userData.email}
      />
    </div>
  );
}

export function DetailsTabContent() {
  const styles = tabsStyles();
  return (
    <div className={cn(styles.barRow)}>
      <SettingsField
        title="Team"
        placeholder="Add team's name"
        toggle="editable"
        value=""
      />
      <SettingsField
        title="Company Roles"
        placeholder=" Add member’s role/s in the company. Separate between roles by “;”"
        toggle="editable"
        value=""
      />
      <SettingsField
        title="Comments"
        placeholder="Add free text"
        toggle="editable"
        value=""
      />
    </div>
  );
}
export function GeneralOrgTabContent() {
  const styles = tabsStyles();
  return (
    <div className={cn(styles.barRow)}>
      <SettingsField title="Org. Name" value="Ovvio" toggle="label" />
      <SettingsField title="Org. URL" value="www.ovvio.io" toggle="label" />
      <SettingsField title="Members" value="356 users" toggle="label" />
    </div>
  );
}

export function MembersTabContent() {
  const usersQuery = useSharedQuery('users');
  const users = useVertices(usersQuery.results) as User[];
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [selectedWorkspaces, setSelectedWorkspaces] = useState<Workspace[]>([]);
  const [showSearchRow, setShowSearchRow] = useState<boolean>(false);
  const [showMultiSelection, setShowMultiSelection] = useState<boolean>(false);
  const [showStep0, setShowStep0] = useState<boolean>(true);
  const [showStep1, setShowStep1] = useState<boolean>(false);
  const [showStep2, setShowStep2] = useState<boolean>(false);
  const [step, setStep] = useState<number>(1);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const isUserSelected = (user: User) => selectedUsers.includes(user);
  const isWorkspaceSelected = (ws: Workspace) =>
    selectedWorkspaces.includes(ws);

  const getRowStyle = (
    index?: number,
    user?: User,
    workspace?: Workspace
  ): CSSProperties => {
    const isHovered = showStep1 && hoverIndex === index;
    const isSelected = showStep1 && isUserSelected(user);
    const isSelectedWs = showStep2 && isWorkspaceSelected(workspace);

    return {
      display: 'flex',
      padding: '12px 16px',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0px 0px 4px 0px rgba(151, 132, 97, 0.25)',
      width: '875px',
      borderRadius: '2px',
      marginBottom: index === filteredUsers.length - 1 ? '0' : '1px',
      cursor: isHovered ? 'pointer' : 'default',
      backgroundColor:
        isHovered && !isSelected && !isSelectedWs
          ? '#FBF6EF'
          : isSelected || isSelectedWs
          ? '#F5F9FB'
          : '#FFF',
      border: isSelected || isSelectedWs ? '1px solid #CCE3ED' : 'none',
    };
  };

  const IconSelectColumnStyle = {
    position: 'absolute',
    left: '30px',
  };
  const firstColumnStyle = {
    display: 'flex',
    width: '200px',
    height: '20px',
    flexDirection: 'column',
    justifyContent: 'center',
  };

  const otherColumnStyle = {
    display: 'flex',
    width: '176px',
    height: '17px',
    flexDirection: 'column',
    justifyContent: 'center',
  };

  const searchRowStyle: CSSProperties = {
    ...getRowStyle(-1, {} as User, {} as Workspace),
    justifyContent: 'flex-start',
    cursor: 'default',
    backgroundColor: '#FFF',
  };

  const scrollContainerStyle: CSSProperties = {
    maxHeight: '700px',
    // overflowY: 'auto',
  };

  const handleUserClick = (user: User) => {
    if (selectedUsers.includes(user)) {
      setSelectedUsers(selectedUsers.filter((u) => u !== user));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleWorkspaceClick = (workspace: Workspace) => {
    if (selectedWorkspaces.includes(workspace)) {
      setSelectedWorkspaces(selectedWorkspaces.filter((w) => w !== workspace));
    } else {
      setSelectedWorkspaces([...selectedWorkspaces, workspace]);
    }
  };

  useEffect(() => {
    if (users) {
      const filtered = suggestResults(searchTerm, users, (t) => t.name);
      setFilteredUsers(filtered);
    }
  }, [searchTerm, usersQuery.results]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleAssignClick = () => {
    setShowSearchRow((prev) => !prev);
    setShowStep0(false);
    setShowStep1(true);
    setShowMultiSelection(true);
  };

  const handleCloseMultiSelection = () => {
    setShowStep0(true);
    setShowStep1(false);
    setShowSearchRow(false);
    setShowMultiSelection(false);
    setSelectedUsers([]);
    setSearchTerm('');
  };

  interface MemberStepProps {
    selectedUsers: User[];
    setShowStep2: (arg0: boolean) => void;
    setShowStep1: (arg0: boolean) => void;
    setStep: (arg0: number) => void;
  }

  function MemberStep({
    selectedUsers,
    setShowStep2,
    setShowStep1,
    setStep,
  }: MemberStepProps) {
    const handleChooseWsClick = () => {
      debugger;
      setShowStep1(false);
      setShowStep2(true);
      setStep(2);
      console.log('The current step: ', step);
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
          <div>Choose members to assign</div>
          {selectedUsers && (
            <ChooseWsButton onChooseWsClick={handleChooseWsClick} />
          )}
          {/* {selectedUsers && (
            <Button onClick={handleChooseWsClick}> CLICK</Button>
          )} */}
          <RaisedButton>TTT</RaisedButton>
        </div>
        <div style={ChosenMembersContainer}>
          {selectedUsers.map((user) => (
            <AssigneePill key={user.key} user={user.manager} />
          ))}
        </div>
        <div style={tableHeader}>
          <Bold>Org. Members</Bold>
        </div>
      </div>
    );
  }

  interface WorkspacesStepProps {
    selectedUsers: User[];
  }

  function WorkspacesStep({ selectedUsers }: WorkspacesStepProps) {
    const workspacesQuery = useSharedQuery('workspaces');
    const workspaces = useVertices(workspacesQuery.results) as Workspace[];

    const handleChooseWsClick = () => {};

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
          {selectedUsers.map((user, index) => (
            <AssigneePill key={user.key} user={user.manager} />
          ))}
        </div>
        <div style={tableHeader}>
          <Bold>My Workspaces</Bold>
          {workspaces.map((workspace, index) => (
            <div>{workspace.name} </div>
          ))}
        </div>
      </div>
    );
  }

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
    padding: '50px 0px 24px',
    maxWidth: '900px',
  };
  const InputTextStyle: CSSProperties = {
    flexGrow: 1,
    border: 'none',
    outline: 'none',
    width: '100%',
    fontSize: '13px',
    letterSpacing: '0.075px',
  };

  return (
    <div>
      {showMultiSelection && (
        <MultiSelection
          onClose={handleCloseMultiSelection}
          currentStepIndex={step}
        />
      )}
      {showStep0 && (
        <div style={HeaderContainerStyle}>
          <Bold>Org. Members</Bold>
          <div style={step0ContainerStyle}>
            <AssignButton onAssignClick={handleAssignClick} />
            <EditButton />
          </div>
        </div>
      )}
      {showStep1 && (
        <MemberStep
          selectedUsers={selectedUsers}
          setShowStep1={setShowStep1}
          setShowStep2={setShowStep2}
          setStep={setStep}
        />
      )}
      {showStep2 && <WorkspacesStep selectedUsers={selectedUsers} />}

      <div>
        {showSearchRow && (
          <div style={searchRowStyle}>
            <div style={{ marginRight: '4px' }}>
              <IconSearch />
            </div>
            <Text>
              <input
                type="text"
                placeholder="Search member"
                value={searchTerm}
                onChange={handleSearchChange}
                style={InputTextStyle}
              />
            </Text>
          </div>
        )}
        {!showStep2 && (
          <div style={scrollContainerStyle}>
            {filteredUsers.map((user, index) => (
              <div
                key={index}
                onClick={() => handleUserClick(user)}
                style={getRowStyle(index, user)}
                onMouseEnter={() => setHoverIndex(index)}
                onMouseLeave={() => setHoverIndex(null)}
              >
                <div style={IconSelectColumnStyle}>
                  {hoverIndex === index && showStep1 && <IconSelect />}
                </div>

                {showStep1 && selectedUsers.includes(user) && (
                  <div style={IconSelectColumnStyle}>
                    <IconCheck />
                  </div>
                )}
                <Text style={firstColumnStyle}>{user.name}</Text>
                <TextSm style={otherColumnStyle}>{user.email}</TextSm>
                <TextSm style={otherColumnStyle}>{'placeholder1'}</TextSm>
                <TextSm style={otherColumnStyle}>{'placeholder2'}</TextSm>
                <TextSm style={otherColumnStyle}>{'placeholder3'}</TextSm>
              </div>
            ))}
          </div>
        )}
        {selectedWorkspaces.map((workspace, index) => (
          <div
            key={index}
            onClick={() => handleWorkspaceClick(workspace)}
            style={getRowStyle(index, undefined, workspace)}
            onMouseEnter={() => setHoverIndex(index)}
            onMouseLeave={() => setHoverIndex(null)}
          ></div>
        ))}
      </div>
    </div>
  );
}
