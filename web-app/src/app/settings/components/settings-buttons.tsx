import React, { useEffect, useRef, useState } from 'react';
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
import { VertexManager } from '../../../../../cfds/client/graph/vertex-manager.ts';
import { Workspace } from '../../../../../cfds/client/graph/vertices/workspace.ts';
import { Note } from '../../../../../cfds/client/graph/vertices/note.ts';
import { useDueDate } from '../../../shared/components/due-date-editor/index.tsx';
import DatePicker from '../../../../../styles/components/inputs/date-picker.tsx';
import {
  DialogContent,
  DialogHeader,
} from '../../../../../styles/components/dialog/index.tsx';

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
    display: 'flex',
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
    fontSize: '13px',
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
      <img
        key="AssignInSettings"
        src="/icons/settings/Archive.svg"
        onClick={() => {}}
      />
      <span className={cn(styles.text)}>{'Choose Workspaces'}</span>
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
      <img
        key="InviteUserSettings"
        src="/icons/settings/Invite.svg"
        onClick={() => {}}
      />
      <span className={cn(styles.text)}>{'Assign'}</span>
    </Button>
  );
}
export function AssignWsBlueButton({
  AssignWsClick,
  disable,
}: AssignWsButtonProps) {
  const styles = useStyles();
  const isDisabled = disable;

  return (
    <Button
      onClick={isDisabled ? undefined : AssignWsClick}
      className={cn(styles.compose, isDisabled ? styles.disabled : styles.blue)}
    >
      <img
        key="InviteUserSettings"
        src="/icons/settings/InviteWhite.svg"
        onClick={() => {}}
      />
      <span className={cn(styles.textWhite)}>{'Assign'}</span>
    </Button>
  );
}
export interface DueDatePickerProps {
  className?: string;
  dueDateClick?: () => void;
}

// export function DueDateMultiSelect({
//   className,
//   dueDateClick,
// }: DueDatePickerProps) {
//   const styles = useStyles();
//   const dueDateEditor = useDueDate();
//   const onClick = (e: MouseEvent) => {
//     e.stopPropagation();
//     <DatePicker value={undefined} onChange={() => {}} />;
//   };
//   return (
//     <Button
//       onClick={(e) => onClick(e)}
//       className={cn(styles.compose, styles.blue)}
//     >
//       {<img src="/icons/design-system/dueDate/addDueDateWhite.svg" />}
//       <span className={cn(styles.textWhite)}>{'Due-Date'}</span>
//     </Button>
//   );
// }
export function DueDateMultiSelect({
  className,
  dueDateClick, // Ensure this prop is used or removed if unnecessary
}: DueDatePickerProps) {
  const styles = useStyles();
  const dueDateEditor = useDueDate(); // Make sure this hook's return value is utilized

  // State to control the visibility of the DatePicker
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  // Toggles the visibility of the DatePicker
  const toggleDatePicker = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the event from bubbling up
    setDatePickerVisibility(!isDatePickerVisible); // Toggle visibility state
  };

  return (
    <>
      <Button
        onClick={toggleDatePicker}
        className={cn(styles.compose, styles.blue)}
      >
        <img
          src="/icons/design-system/dueDate/addDueDateWhite.svg"
          alt="Due Date"
        />
        <span className={cn(styles.textWhite)}>Due-Date</span>
      </Button>
      {isDatePickerVisible && (
        <DialogContent>
          <DialogHeader>Calendar</DialogHeader>

          <DatePicker
            value={undefined}
            onChange={(newValue) => {
              // Implement the change logic, possibly involving `dueDateEditor` or props
              setDatePickerVisibility(false); // Optionally hide the picker after selection
            }}
          />
        </DialogContent>
      )}
    </>
  );
}
export interface AddTagBlueButtonProps {
  className?: string;
  addTagClick?: () => void;
}

export function AddTagBlueButton({
  className,
  addTagClick,
}: AddTagBlueButtonProps) {
  const styles = useStyles();
  const onClick = (e: MouseEvent) => {
    e.stopPropagation();
  };
  return (
    <Button onClick={addTagClick} className={cn(styles.compose, styles.blue)}>
      {<img src="/icons/design-system/tag/addTagWhite.svg" />}
      <span className={cn(styles.textWhite)}>{'Tag'}</span>
    </Button>
  );
}

interface SaveAddButtonProps {
  onSaveAddClick?: () => void;
  disable: boolean;
}

export function SaveAddButton({ onSaveAddClick, disable }: SaveAddButtonProps) {
  const styles = useStyles();
  const isDisabled = disable;

  return (
    <Button
      className={cn(
        styles.compose,
        isDisabled ? styles.disabled : styles.available
      )}
      onClick={onSaveAddClick}
    >
      <img key="CheckEditSettings" src="/icons/settings/Check.svg" />
      <span className={cn(styles.text)}>{'Done'}</span>
    </Button>
  );
}

interface UndoButtonProps {
  onUndoClick?: () => void;
  disable: boolean;
}

export function UndoButton({ onUndoClick, disable }: UndoButtonProps) {
  const styles = useStyles();
  const isDisabled = disable;

  return (
    <Button
      className={cn(
        styles.compose,
        isDisabled ? styles.disabled : styles.available
      )}
      onClick={onUndoClick}
    >
      <img key="CheckEditSettings" src="/icons/design-system/Undo.svg" />
      <span className={cn(styles.text)}>{'Undo'}</span>
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
      <img key="EditUserSettings" src="/icons/settings/Compose-white.svg" />
      <span className={cn(styles.textWhite)}>{'Edit'}</span>
    </Button>
  );
}
interface AddMemberButtonProps {
  onAddClick?: () => void;
}

export function AddMemberButton({ onAddClick }: AddMemberButtonProps) {
  const styles = useStyles();

  return (
    <Button onClick={onAddClick} className={cn(styles.compose, styles.blue)}>
      <img key="AddMemberSettings" src="/icons/settings/InviteWhite.svg" />
      <span className={cn(styles.textWhite)}>{'Add members'}</span>
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
  const userName: User = useVertexByKey(user);

  const removeUserPill = () => {
    const newSelectedUsers = new Set(selectedUsers);
    newSelectedUsers.delete(user);
    setSelectedUsers(newSelectedUsers);
  };
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

interface RemoveButtonProps {
  onRemove?: () => void;
  text?: string;
}

export function RemoveButton({ onRemove, text }: RemoveButtonProps) {
  const styles = useStyles();

  return (
    <Button onClick={onRemove} className={cn(styles.compose, styles.blue)}>
      <img key="RemoveUserSettings" src="/icons/settings/Delete-white.svg" />
      <span className={cn(styles.textWhite)}>
        {text ? `${text} ` : 'Remove'}
      </span>
    </Button>
  );
}

interface CancelButtonProps {
  onCancel?: () => void;
}

export function CancelButton({ onCancel }: CancelButtonProps) {
  const styles = useStyles();

  return (
    <Button onClick={onCancel} className={cn(styles.compose)}>
      <img key="CancelRemoveUserSettings" src="/icons/settings/Close-big.svg" />
      <span className={cn(styles.text)}>{'Cancel'}</span>
    </Button>
  );
}

interface DeleteWsButtonProps {
  onDeleteClick: () => void;
  disabled: boolean;
  isConfirmed: boolean;
  ref: any;
  className: any;
}

export function DeleteWsButton({
  ref,
  onDeleteClick,
  disabled,
  isConfirmed,
  className,
}: DeleteWsButtonProps) {
  const isDisabled = disabled;
  const styles = useStyles();

  return (
    <Button
      ref={ref}
      onClick={isConfirmed ? onDeleteClick : onDeleteClick}
      className={cn(
        styles.compose,
        className,
        isDisabled && !isConfirmed ? styles.disabled : styles.available
      )}
    >
      <img key="DeleteWsInSettings" src="/icons/settings/Delete.svg" />
      <span className={cn(styles.text)} style={{ fontSize: '13px' }}>
        {'Delete Workspace'}
      </span>
    </Button>
  );
}

interface AddUserButtonProps {
  onAddClick?: () => void;
}

export function AddUserButton({ onAddClick }: AddUserButtonProps) {
  const styles = useStyles();

  return (
    <Button
      onClick={() => onAddClick}
      className={cn(styles.compose, styles.blue)}
    >
      <img key="AddUserSettings" src="/icons/settings/InviteWhite.svg" />
      <span className={cn(styles.textWhite)}>{'Add'}</span>
    </Button>
  );
}
