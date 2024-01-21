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
import {
  EditSaveButton,
  SaveAddButton,
} from '../../../components/settings-buttons.tsx';
import UserTable from '../../../components/user-table.tsx';
import { Button } from '../../../../../../../styles/components/buttons.tsx';
import { styleguide } from '../../../../../../../styles/styleguide.ts';
import { SchemeNamespace } from '../../../../../../../cfds/base/scheme-types.ts';
import { useGraphManager } from '../../../../../core/cfds/react/graph.tsx';
import { normalizeEmail } from '../../../../../../../base/string.ts';

type AddMembersProps = {
  setStep: (step: number) => void;
  onClose: () => void;
};

export const AddMembers: React.FC<AddMembersProps> = ({ setStep, onClose }) => {
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

  const handleSetMetadata = (newMetadata: { [key: string]: string }) => {
    setMetadata((prevMetadata) => ({
      ...prevMetadata,
      ...newMetadata,
    }));
  };

  // const onSave = useCallback(() => {
  //   if (name !== null && email !== null) {
  //     if (name.trim() === '' || email.trim() === '') {
  //       console.log('Input is invalid');
  //     } else {
  //       const metadataMap = new Map(Object.entries(metadata));

  //       const newUser = {
  //         name: name,
  //         email: normalizeEmail(email),
  //         metadata: metadataMap,
  //       };
  //       const newVert = graph.createVertex(SchemeNamespace.USERS, newUser);

  //       setScrollToUser(newVert.key);
  //     }
  //   } else {
  //     console.log('Name or email is null');
  //   }
  // }, [graph, name, email, metadata, setScrollToUser]);

  const handleSaveEditClick = (
    userKey: string,
    name: string,
    email: string,
    metadata: { [key: string]: string }
  ) => {
    setStep(0);
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
          <H4>Add members to Organization</H4>
        </div>
        <div style={RightRectangleEdit}>
          <SaveAddButton
            onSaveAddClick={() => handleSaveEditClick}
            disable={false}
          />
        </div>
      </div>
      <div style={HeaderContainerStyle}>
        <Bold>Org. Members</Bold>
        <div style={step0ContainerStyle}></div>
      </div>
      <UserTable
        showSelection={false}
        onRowSelect={() => {}}
        selectedUsers={new Set<string>()}
        showSearch={false}
        editMode={false}
        addMemberMode={true}
      />
    </div>
  );
};
