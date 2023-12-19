import React, { useEffect, useState } from 'react';
import { styleguide } from '../../../../../styles/styleguide.ts';
import { brandLightTheme as theme } from '../../../../../styles/theme.tsx';
import { cn, makeStyles } from '../../../../../styles/css-objects/index.ts';
import { useTypographyStyles } from '../../../../../styles/components/typography.tsx';
import { layout } from '../../../../../styles/layout.ts';
import { MediaQueries } from '../../../../../styles/responsive.ts';
import { Button } from '../../../../../styles/components/buttons.tsx';
import { useVertexByKey } from '../../../core/cfds/react/vertex.ts';
import { User } from '../../../../../cfds/client/graph/vertices/user.ts';
import { CloseIcon } from '../../workspace-content/workspace-view/cards-display/display-bar/filters/active-filters.tsx';

const useStyles = makeStyles(() => ({
  compose: {
    height: styleguide.gridbase * 4,
    boxSizing: 'border-box',
    padding: [0, styleguide.gridbase],
    ...styleguide.transition.short,
    transitionProperty: 'box-shadow',
    alignItems: 'center',
    basedOn: [layout.row],
    borderRadius: '37px',
    border: ' 1px solid var(--primary-p-5, #8BC5EE)',
  },
  available: {
    background: theme.primary.p1,
    cursor: 'pointer',
    ':hover': {
      boxShadow: theme.shadows.z2,
      background: theme.primary.p2,
    },
  },
  disabled: {
    background: '#FFF',
    cursor: 'not-allowed',
  },
  blue: {
    background: '#3184DD',
    border: 'none',
    ':hover': {
      boxShadow: theme.shadows.z2,
      background: theme.primary.p10,
    },
  },
  textWhite: {
    color: '#FFFF',
    padding: [0, styleguide.gridbase],
    basedOn: [useTypographyStyles.button],
    [MediaQueries.TabletAndMobile]: {
      display: 'none',
    },
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
          src="/icons/settings/Archive.svg"
          onClick={() => {}}
        />
        <span className={cn(styles.text)}>{'Assign to Workspaces'}</span>
      </div>
    );
  }
);
const ComposeInternalButtonAssignBlue = React.forwardRef(
  (
    { className }: { className?: string },
    ref: React.ForwardedRef<HTMLDivElement>
  ) => {
    const styles = useStyles();
    return (
      <div className={cn(styles.compose, styles.blue, className)} ref={ref}>
        <img
          key="AssignWhiteInSettings"
          src="/icons/settings/Archive-white.svg"
          onClick={() => {}}
        />
        <span className={cn(styles.textWhite)}>{'Assign to Workspaces'}</span>
      </div>
    );
  }
);

interface AssignButtonProps {
  onAssignClick?: () => void;
  blue: boolean;
}

export function AssignButton({ onAssignClick, blue }: AssignButtonProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>();

  return (
    <Button onClick={onAssignClick}>
      {blue ? (
        <ComposeInternalButtonAssignBlue ref={(div) => setContainer(div)} />
      ) : (
        <ComposeInternalButtonAssign ref={(div) => setContainer(div)} />
      )}
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
      <div className={cn(styles.compose, styles.blue, className)} ref={ref}>
        <img
          key="EditUserSettings"
          src="/icons/settings/Compose-white.svg"
          onClick={() => {}}
        />
        <span className={cn(styles.textWhite)}>{'Edit'}</span>
      </div>
    );
  }
);
interface ChooseWsButtonProps {
  onChooseWsClick?: () => void;
  disable: boolean;
}

export function ChooseWsButton({
  onChooseWsClick,
  disable,
}: ChooseWsButtonProps) {
  const isDisabled = disable;
  const styles = useStyles();

  return (
    <Button
      onClick={isDisabled ? undefined : onChooseWsClick}
      className={cn(
        styles.compose,
        isDisabled ? styles.disabled : styles.available
      )}
    >
      <div>
        <img
          key="AssignInSettings"
          src="/icons/settings/Archive.svg"
          onClick={() => {}}
        />
        <span className={cn(styles.text)}>{'Choose Workspaces'}</span>
      </div>{' '}
    </Button>
  );
}

interface AssignWsButtonProps {
  AssignWsClick?: () => void;
  disable: boolean;
}

export function AssignWsButton({
  AssignWsClick,
  disable,
}: AssignWsButtonProps) {
  const styles = useStyles();
  const isDisabled = disable;

  return (
    <Button
      onClick={isDisabled ? undefined : AssignWsClick}
      className={cn(
        styles.compose,
        isDisabled ? styles.disabled : styles.available
      )}
    >
      <div>
        <img
          key="InviteUserSettings"
          src="/icons/settings/Invite.svg"
          onClick={() => {}}
        />
        <span className={cn(styles.text)}>{'Assign'}</span>
      </div>{' '}
    </Button>
  );
}

interface EditSaveButtonProps {
  onSaveEditClick?: () => void;
  disable: boolean;
}

export function EditSaveButton({
  onSaveEditClick,
  disable,
}: EditSaveButtonProps) {
  const styles = useStyles();
  const isDisabled = disable;

  return (
    <Button
      onClick={isDisabled ? undefined : onSaveEditClick}
      className={cn(
        styles.compose,
        isDisabled ? styles.disabled : styles.available
      )}
    >
      <div>
        <img
          key="CheckEditSettings"
          src="/icons/settings/Check.svg"
          onClick={() => {}}
        />
        <span className={cn(styles.text)}>{'Save changes'}</span>
      </div>{' '}
    </Button>
  );
}
interface EditButtonProps {
  onEditClick?: () => void;
}

export function EditButton({ onEditClick }: EditButtonProps) {
  const styles = useStyles();

  return (
    <Button onClick={onEditClick} className={cn(styles.compose, styles.blue)}>
      <div>
        <img
          key="EditUserSettings"
          src="/icons/settings/Compose-white.svg"
          onClick={() => {}}
        />
        <span className={cn(styles.textWhite)}>{'Edit'}</span>
      </div>
    </Button>
  );
}

type UserPillProps = {
  user: string;
  selectedUsers: Set<string>;
  setSelectedUsers: (users: Set<string>) => void;
};

export const UserPill: React.FC<UserPillProps> = ({
  user,
  selectedUsers,
  setSelectedUsers,
}) => {
  const styles = useStyles();

  useEffect(() => {}, [selectedUsers]);

  const removeUserPill = () => {
    const newSelectedUsers = new Set(selectedUsers);
    newSelectedUsers.delete(user);
    setSelectedUsers(newSelectedUsers);
  };
  const userName: User = useVertexByKey(user);

  return (
    <div className={cn(styles.filterPill)}>
      <span className={cn(styles.filterText)}>{userName.name}</span>
      <CloseIcon
        onClick={() => {
          removeUserPill();
        }}
      />
    </div>
  );
};
