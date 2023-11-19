import React, { CSSProperties, ChangeEvent, useEffect, useState } from 'react';
import { SettingsTabId } from '../../../../../cfds/base/scheme-types.ts';
import { tabsStyles } from '../components/tabs-style.tsx';
import { usePartialRootUser } from '../../../core/cfds/react/graph.tsx';
import SettingsField from '../components/settings-field.tsx';
import { cn } from '../../../../../styles/css-objects/index.ts';
import { useSharedQuery } from '../../../core/cfds/react/query.ts';
import { useVertices } from '../../../core/cfds/react/vertex.ts';
import { IconSearch } from '../../../../../styles/components/new-icons/icon-search.tsx';
import { TextSm, Text } from '../../../../../styles/components/typography.tsx';
import { User } from '../../../../../cfds/client/graph/vertices/user.ts';
import { AssignButton } from '../components/settings-buttons.tsx';

export interface SettingsTabPlugin {
  title: SettingsTabId;
  render: () => JSX.Element;
  category: string;
}

export const tabPlugins: SettingsTabPlugin[] = [
  {
    title: 'generalPersonal',
    render: () => <GeneralTabContent />,
    category: 'PersonalInfo',
  },
  {
    title: 'details',
    render: () => <DetailsTabContent />,
    category: 'PersonalInfo',
  },
  {
    title: 'generalWorkspaces',
    render: () => <GeneralOrgTabContent />,
    category: 'WorkspacesInfo',
  },
  {
    title: 'tags',
    render: () => <DetailsTabContent />,
    category: 'WorkspacesInfo',
  },
  {
    title: 'roles&details',
    render: () => <DetailsTabContent />,
    category: 'WorkspacesInfo',
  },
  {
    title: 'generalOrganization',
    render: () => <GeneralOrgTabContent />,
    category: 'OrganizationInfo',
  },
  {
    title: 'members',
    render: () => <MembersTabContent />,
    category: 'OrganizationInfo',
  },
  {
    title: 'billing',
    render: () => <DetailsTabContent />,
    category: 'OrganizationInfo',
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
const getRandomName = () => {
  const firstNames = ['Alice', 'Bob', 'Carol', 'David'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown'];
  const randomFirstName =
    firstNames[Math.floor(Math.random() * firstNames.length)];
  const randomLastName =
    lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${randomFirstName} ${randomLastName}`;
};

const dummyUsers = Array.from({ length: 100 }, () => ({
  name: getRandomName(),
  email: 'example@example.com', // Use a generic email or generate random ones similarly
}));

export function MembersTabContent() {
  const styles = tabsStyles();
  const usersQuery = useSharedQuery('users');
  const users = useVertices(usersQuery.results) as User[];
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  const rowStyle = {
    display: 'flex',
    padding: '12px 16px',
    alignItems: 'center',
    gap: '8px',
    background: 'var(--monochrom-m-0, #FFF)',
    boxShadow: '0px 0px 4px 0px rgba(151, 132, 97, 0.25)',
    width: '875px',
    borderRadius: '2px',
    marginBottom: '1px', // Add this line for the gap
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

  const searchRowStyle = {
    ...rowStyle,
    justifyContent: 'flex-start',
  };
  const scrollContainerStyle: CSSProperties = {
    maxHeight: '700px',
    overflowY: 'auto',
  };

  const [dummyUsers, setDummyUsers] = useState<User[]>([]);

  useEffect(() => {
    const users = Array.from({ length: 50 }, () => ({
      name: getRandomName(),
      email: 'example@example.com',
    }));
    setDummyUsers(users);
    setFilteredUsers(users); // Initially, filtered data is the same as the complete set
  }, []);

  // Filter dummy data based on search term
  useEffect(() => {
    const filtered = dummyUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchTerm, dummyUsers]);

  // useEffect(() => {
  //   if (users) {
  //     const filtered = users.filter(
  //       (user) =>
  //         user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //         user.email.toLowerCase().includes(searchTerm.toLowerCase())
  //     );
  //     setFilteredUsers(filtered);
  //   }
  // }, [searchTerm, usersQuery.results]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  return (
    <div>
      <AssignButton />

      <div className={cn(styles.barRow)}>
        <SettingsField title="Org. Members" value="" toggle="label" />
        <div>
          <div style={scrollContainerStyle}>
            <div style={searchRowStyle}>
              <div
                style={{
                  marginRight: '8px',
                }}
              >
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
                    background: 'none',
                    width: '100%',
                  }}
                />
              </Text>
            </div>

            {filteredUsers.map((user, index) => (
              <div
                key={index}
                style={{
                  ...rowStyle,
                  marginBottom:
                    index === filteredUsers.length - 1
                      ? '0'
                      : rowStyle.marginBottom,
                }}
              >
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
    </div>
  );
}
