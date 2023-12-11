import React, { useEffect, useState } from 'react';
import { styleguide } from '../../../../../styles/styleguide.ts';
import { brandLightTheme as theme } from '../../../../../styles/theme.tsx';
import { cn, makeStyles } from '../../../../../styles/css-objects/index.ts';
import { useTypographyStyles } from '../../../../../styles/components/typography.tsx';
import { layout } from '../../../../../styles/layout.ts';
import { MediaQueries } from '../../../../../styles/responsive.ts';
import { IconArchive } from '../../../../../styles/components/new-icons/icon-archive.tsx';
import { Button } from '../../../../../styles/components/buttons.tsx';
import { IconExportMail } from '../../../../../styles/components/new-icons/icon-export-mail.tsx';
import { IconPersonalInfo } from '../../../../../styles/components/new-icons/icon-personal-info.tsx';
import { usePartialVertex } from '../../../core/cfds/react/vertex.ts';
import { User } from '../../../../../cfds/client/graph/vertices/user.ts';
import { CloseIcon } from '../../workspace-content/workspace-view/cards-display/display-bar/filters/active-filters.tsx';

const useStyles = makeStyles(() => ({
  compose: {
    background: '#FFF',
    height: styleguide.gridbase * 4,
    boxSizing: 'border-box',
    padding: [0, styleguide.gridbase],
    ...styleguide.transition.short,
    transitionProperty: 'box-shadow',
    ':hover': {
      boxShadow: theme.shadows.z2,
      background: theme.primary.p1,
    },
    alignItems: 'center',
    basedOn: [layout.row],
    borderRadius: '37px',
    border: ' 1px solid var(--primary-p-5, #8BC5EE)',
  },
  text: {
    color: '#1960CF',
    padding: [0, styleguide.gridbase],
    basedOn: [useTypographyStyles.button],
    [MediaQueries.TabletAndMobile]: {
      display: 'none',
    },
  },
  filtersView: {
    alignItems: 'center',
    basedOn: [layout.row],
  },
  filterPill: {
    height: styleguide.gridbase * 2,
    marginRight: styleguide.gridbase,
    alignItems: 'center',
    justifyContent: 'space-between',
    basedOn: [layout.row],
    borderRadius: '15px',
    border: '1px solid var(--monochrom-m-2, #CCC)',
  },
  filterText: {
    marginLeft: styleguide.gridbase * 0.5,
    fontSize: '10px',
    lineHeight: '14px',
    basedOn: [useTypographyStyles.text],
  },
  closeIcon: {
    cursor: 'pointer',
    marginLeft: styleguide.gridbase * 0.5,
    height: '100%',
    basedOn: [layout.column, layout.centerCenter],
  },
  icon: {
    background: '#FFAF',
  },
}));

const ComposeInternalButtonChooseWs = React.forwardRef(
  (
    { className }: { className?: string },
    ref: React.ForwardedRef<HTMLDivElement>
  ) => {
    const styles = useStyles();
    return (
      <div className={cn(styles.compose, className)} ref={ref}>
        <img
          key="AssignInSettings"
          // className={cn(styles.icon)}
          src="/icons/editor/icon/Archive.svg"
          onClick={() => {}}
        />{' '}
        <span className={cn(styles.text)}>{'Choose Workspaces'}</span>
      </div>
    );
  }
);

const ComposeInternalButtonAssign = React.forwardRef(
  (
    { className }: { className?: string },
    ref: React.ForwardedRef<HTMLDivElement>
  ) => {
    const styles = useStyles();
    return (
      <div className={cn(styles.compose, className)} ref={ref}>
        <img
          key="AssignInSettings"
          // className={cn(styles.icon)}
          src="/icons/editor/icon/Archive.svg"
          onClick={() => {}}
        />
        <span className={cn(styles.text)}>{'Assign to Workspaces'}</span>
      </div>
    );
  }
);

interface AssignButtonProps {
  onAssignClick?: () => void;
}

export function AssignButton({ onAssignClick }: AssignButtonProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>();

  return (
    <Button onClick={onAssignClick}>
      <ComposeInternalButtonAssign ref={(div) => setContainer(div)} />
    </Button>
  );
}

const ComposeInternalButtonEdit = React.forwardRef(
  (
    { className }: { className?: string },
    ref: React.ForwardedRef<HTMLDivElement>
  ) => {
    const styles = useStyles();
    return (
      <div className={cn(styles.compose, className)} ref={ref}>
        <img
          key="EditUserSettings"
          // className={cn(styles.icon)}
          src="/icons/editor/icon/Compose.svg"
          onClick={() => {}}
        />
        <span className={cn(styles.text)}>{'Edit'}</span>
      </div>
    );
  }
);
interface ChooseWsButtonProps {
  onChooseWsClick?: () => void;
}

export function ChooseWsButton({ onChooseWsClick }: ChooseWsButtonProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>();

  return (
    <Button onClick={onChooseWsClick}>
      <ComposeInternalButtonChooseWs ref={(div) => setContainer(div)} />
    </Button>
  );
}

interface AssignWsButtonProps {
  AssignWsClick?: () => void;
}

export function AssignWsButton({ AssignWsClick }: AssignWsButtonProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>();

  return (
    <Button onClick={AssignWsClick}>
      <ComposeInternalButtonAssignWs ref={(div) => setContainer(div)} />
    </Button>
  );
}

const ComposeInternalButtonAssignWs = React.forwardRef(
  (
    { className }: { className?: string },
    ref: React.ForwardedRef<HTMLDivElement>
  ) => {
    const styles = useStyles();
    return (
      <div className={cn(styles.compose, className)} ref={ref}>
        <img
          key="InviteUserSettings"
          // className={cn(styles.icon)}
          src="/icons/editor/icon/Invite.svg"
          onClick={() => {}}
        />
        <span className={cn(styles.text)}>{'Assign'}</span>
      </div>
    );
  }
);
export function EditButton() {
  const [container, setContainer] = useState<HTMLDivElement | null>();

  return (
    <Button onClick={() => ''}>
      <ComposeInternalButtonEdit ref={(div) => setContainer(div)} />
    </Button>
  );
}

type UserPillProps = {
  user: User;
  selectedUsers: User[];
  setSelectedUsers: (users: User[]) => void;
};

export const UserPill: React.FC<UserPillProps> = ({
  user,
  selectedUsers,
  setSelectedUsers,
}) => {
  const styles = useStyles();
  const { name } = usePartialVertex(user, ['name']);

  useEffect(() => {}, [selectedUsers]);

  const removeUserPill = () => {
    if (selectedUsers.length > 1) {
      setSelectedUsers((prevSelectedUsers) => {
        return prevSelectedUsers.filter((u: User) => u.key !== user.key);
      });
    }
  };

  return (
    <div className={cn(styles.filterPill)}>
      <span className={cn(styles.filterText)}>{name}</span>
      <CloseIcon
        onClick={() => {
          removeUserPill();
        }}
      />
    </div>
  );
};
