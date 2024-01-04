import React, { CSSProperties, useCallback, useEffect, useState } from 'react';
import { useSharedQuery } from '../../../../../core/cfds/react/query.ts';
import { useVertices } from '../../../../../core/cfds/react/vertex.ts';
import {
  User,
  UserMetadataKey,
} from '../../../../../../../cfds/client/graph/vertices/user.ts';
import {
  Bold,
  H4,
} from '../../../../../../../styles/components/typography.tsx';
import { EditSaveButton } from '../../../components/settings-buttons.tsx';
import UserTable from '../../../components/user-table.tsx';
import { Button } from '../../../../../../../styles/components/buttons.tsx';
import { styleguide } from '../../../../../../../styles/styleguide.ts';
import { SchemeNamespace } from '../../../../../../../cfds/base/scheme-types.ts';
import { useGraphManager } from '../../../../../core/cfds/react/graph.tsx';
import { normalizeEmail } from '../../../../../../../base/string.ts';

type EditProps = {
  setStep: (step: number) => void;
  onClose: () => void;
};

export const Edit: React.FC<EditProps> = ({ setStep, onClose }) => {
  const usersQuery = useSharedQuery('users');
  const users = useVertices(usersQuery.results) as User[];
  const RectangleEdit: CSSProperties = {
    top: '0px',
    right: '0px',
    height: '64px',
    position: 'absolute',
    width: '100%',
    backgroundColor: '#3184dd',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
  };
  const LeftRectangleEdit: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
  };
  const RightRectangleEdit: CSSProperties = {
    position: 'absolute',
    display: 'flex',
    left: '739px',
  };
  const closeIcon: CSSProperties = {
    paddingRight: styleguide.gridbase * 4,
    paddingLeft: styleguide.gridbase * 2,
  };
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

  const graph = useGraphManager();
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [scrollToUser, setScrollToUser] = useState<string | null>(null);
  const [metadata, setMetadata] = useState({
    team: '',
    companyRoles: '',
    comments: '',
  });

  useEffect(() => {
    let timeoutId: number | undefined = setTimeout(() => {
      console.log('ScrollToUser now - ', scrollToUser);
      timeoutId = undefined;
      if (scrollToUser) {
        const newUserRow = document.getElementById(
          `setting/org/<${scrollToUser}>`
        );
        if (newUserRow) {
          newUserRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 50);
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [scrollToUser, setScrollToUser]);

  const handleSaveEditClick = () => {
    onSave();
    setStep(0);
  };

  const handleSetMetadata = (newMetadata: { [key: string]: string }) => {
    setMetadata((prevMetadata) => ({
      ...prevMetadata,
      ...newMetadata,
    }));
  };

  const onSave = useCallback(() => {
    if (name !== null && email !== null) {
      if (name.trim() === '' || email.trim() === '') {
        console.log('Input is invalid');
      } else {
        const metadataMap = new Map(Object.entries(metadata));

        const newUser = {
          name: name,
          email: normalizeEmail(email),
          metadata: metadataMap,
        };
        const newVert = graph.createVertex(SchemeNamespace.USERS, newUser);

        setScrollToUser(newVert.key);
      }
    } else {
      console.log('Name or email is null');
    }
  }, [graph, name, email, metadata, setScrollToUser]);

  const handleSaveUserEdit = (
    userKey: string,
    name: string,
    email: string,
    metadata: { [key: string]: string }
  ) => {
    if (name.trim() === '' || email.trim() === '') {
      console.log('Input is invalid');
      return;
    }
    const userVertex = graph.getVertex<User>(userKey);
    if (!userVertex) {
      console.log('User not found');
      return;
    }
    userVertex.name = name;
    userVertex.email = normalizeEmail(email);
    const metadataMap = new Map<UserMetadataKey, string>();
    Object.entries(metadata).forEach(([key, value]) => {
      if (key === 'companyRoles' || key === 'comments' || key === 'team') {
        metadataMap.set(key as UserMetadataKey, value);
      }
    });
    userVertex.metadata = metadataMap;
  };

  return (
    <div>
      <div style={RectangleEdit}>
        <div style={LeftRectangleEdit}>
          <Button onClick={onClose} style={closeIcon}>
            <img
              key="CloseCircleWhiteSettings"
              src="/icons/settings/Close-circle-white.svg"
              onClick={onClose}
            />
          </Button>
          <H4>Edit Organization member list</H4>
        </div>
        <div style={RightRectangleEdit}>
          <EditSaveButton
            onSaveEditClick={handleSaveEditClick}
            disable={false}
          />
        </div>
      </div>
      <div style={HeaderContainerStyle}>
        <Bold>Org. Members</Bold>
        <div style={step0ContainerStyle}></div>
      </div>
      <UserTable
        users={users}
        showSelection={false}
        onRowSelect={() => {}}
        selectedUsers={new Set<string>()}
        showSearch={true}
        isEditable={false}
        editMode={true}
        setName={setName}
        setEmail={setEmail}
        name={name}
        email={email}
        metadata={metadata}
        setMetadata={handleSetMetadata}
        onSaveEdit={handleSaveUserEdit}
      />
    </div>
  );
};
