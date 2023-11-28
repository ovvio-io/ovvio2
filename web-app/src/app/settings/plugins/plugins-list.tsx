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

interface MemberStepProps {
  selectedUsers: User[];
  setSelectedUsers: (users: User[]) => void;
}

export function MemberStep({
  selectedUsers,
  setSelectedUsers,
}: MemberStepProps) {
  const handleChooseWsClick = () => {};

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
      }}
    >
      {selectedUsers && (
        <ChooseWsButton onChooseWsClick={handleChooseWsClick} />
      )}
      {selectedUsers.map((user, index) => (
        <div>{user.name} </div>
      ))}
    </div>
  );
}

export function MembersTabContent() {
  const usersQuery = useSharedQuery('users');
  const users = useVertices(usersQuery.results) as User[];
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [showMemberStep, setShowMemberStep] = useState<boolean>(false);

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const isUserSelected = (user: User) => selectedUsers.includes(user);

  const getRowStyle = (index?: number, user?: User): CSSProperties => {
    const isHovered = showMemberStep && hoverIndex === index;
    const isSelected = showMemberStep && isUserSelected(user);

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
        isHovered && !isSelected ? '#FBF6EF' : isSelected ? '#F5F9FB' : '#FFF',
      border: isSelected ? '1px solid #CCE3ED' : 'none',
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
    ...getRowStyle(-1, {} as User),
    justifyContent: 'flex-start',
    cursor: 'default',
    backgroundColor: '#FFF',
    // overflowY: 'clip',
  };

  const scrollContainerStyle: CSSProperties = {
    maxHeight: '700px',
    overflowY: 'auto',
  };

  const handleUserClick = (user: User) => {
    if (selectedUsers.includes(user)) {
      setSelectedUsers(selectedUsers.filter((u) => u !== user));
    } else {
      setSelectedUsers([...selectedUsers, user]);
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
  const [showSearchRow, setShowSearchRow] = useState<boolean>(false);
  const [showMultiSelection, setShowMultiSelection] = useState<boolean>(false);
  const [showButtons, setShowButtons] = useState<boolean>(true);

  const handleAssignClick = () => {
    setShowSearchRow((prev) => !prev);
    setShowMemberStep(true);
    setShowButtons(false);
    setShowMultiSelection((prev) => !prev);
  };

  const handleCloseMultiSelection = () => {
    setShowSearchRow(false);
    setShowMultiSelection(false);
    setShowButtons(true);
    setSelectedUsers([]);
    setSearchTerm('');
  };

  const buttonsContainerStyle: CSSProperties = {
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

  const currentStep: 'Members' | 'Workspaces' | 'Assign' = 'Members';

  return (
    <div>
      {showMultiSelection && (
        <MultiSelection
          onClose={handleCloseMultiSelection}
          currentStep={currentStep}
          currentStepIndex={1}
        />
      )}
      <div style={HeaderContainerStyle}>
        {showMultiSelection && <div>Choose members to assign</div>}
        <Bold>Org. Members</Bold>
        {showButtons && (
          <div style={buttonsContainerStyle}>
            <AssignButton onAssignClick={handleAssignClick} />
            <EditButton />
          </div>
        )}
      </div>
      {showMemberStep && (
        <MemberStep
          selectedUsers={selectedUsers}
          setSelectedUsers={setSelectedUsers}
        />
      )}
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
                style={{
                  flexGrow: 1,
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  fontSize: '13px',
                  letterSpacing: '0.075px',
                }}
              />
            </Text>
          </div>
        )}

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
                {hoverIndex === index && showMemberStep && <IconSelect />}
              </div>
              {selectedUsers.includes(user) && (
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
      </div>
    </div>
  );
}
