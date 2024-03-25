import React, { CSSProperties, useCallback, useEffect, useState } from 'react';
import {
  Bold,
  H4,
} from '../../../../../../../styles/components/typography.tsx';
import { WhiteActionButton } from '../../../components/settings-buttons.tsx';
import UserTable from '../../../components/user-table.tsx';
import { Button } from '../../../../../../../styles/components/buttons.tsx';
import { styleguide } from '../../../../../../../styles/styleguide.ts';

type AddMembersProps = {
  onClose: () => void;
};

export const AddMembers: React.FC<AddMembersProps> = ({ onClose }) => {
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
    left: '1106px',
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

  const [scrollToUser, setScrollToUser] = useState<string | null>(null);

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
          <WhiteActionButton
            onClick={onClose}
            disable={false}
            buttonText={'Done'}
            imgSrc={'/icons/settings/Check.svg'}
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
