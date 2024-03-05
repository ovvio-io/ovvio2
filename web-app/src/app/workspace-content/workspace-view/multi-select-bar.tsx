import React, { CSSProperties, useCallback, useEffect, useState } from 'react';
import {
  H4,
  TextSm,
  useTypographyStyles,
} from '../../../../../styles/components/typography.tsx';
import { styleguide } from '../../../../../styles/styleguide.ts';
import {
  AddTagBlueButton,
  AssignWsBlueButton,
  CancelButton,
  DueDateMultiSelect,
  RemoveButton,
  SaveAddButton,
} from '../../settings/components/settings-buttons.tsx';
import Menu from '../../../../../styles/components/menu.tsx';
import {
  Note,
  Tag,
  User,
  Workspace,
} from '../../../../../cfds/client/graph/vertices/index.ts';
import { cn, makeStyles } from '../../../../../styles/css-objects/index.ts';
import { useSharedQuery } from '../../../core/cfds/react/query.ts';
import {
  usePartialVertex,
  usePartialVertices,
  useVertexByKey,
  useVertices,
} from '../../../core/cfds/react/vertex.ts';
import { brandLightTheme as theme } from '../../../../../styles/theme.tsx';
import { layout } from '../../../../../styles/layout.ts';
import { VertexManager } from '../../../../../cfds/client/graph/vertex-manager.ts';
import * as SetUtils from '../../../../../base/set.ts';
import DueDateEditor from '../../../shared/components/due-date-editor/index.tsx';
import { DatePicker } from '../../../../../styles/components/inputs/index.ts';
import TagPicker from '../../../../../components/tag-picker.tsx';
import { MemberPicker } from '../../../../../components/member-picker.tsx';
import {
  useGraphManager,
  usePartialView,
} from '../../../core/cfds/react/graph.tsx';
import { View } from '../../../../../cfds/client/graph/vertices/view.ts';

const useStyles = makeStyles(() => ({
  popup: {
    // backgroundColor: theme.colors.background,
    maxWidth: styleguide.gridbase * 21,
    maxHeight: styleguide.gridbase * 21,
    flexShrink: 0,
  },
  confirmation: {
    display: 'flex',
    padding: '8px 10px 10px ',
    flexDirection: 'column',
    alignItems: 'center',
    fontWeight: '600',
    fontSize: '14px',
  },
  confirmationButtons: {
    display: 'flex',
    padding: '16px 0px 16px 0px',
    flexDirection: 'column',
    gap: '8px',
  },
}));

interface IconVectorProps {
  color: 'done' | 'notDone';
}

export const IconVector: React.FC<IconVectorProps> = ({ color }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="58"
      height="2"
      viewBox="0 0 58 2"
      fill="none"
    >
      <path
        d="M1 1H57"
        stroke={color === 'done' ? '#FFF' : '#ABD4EE'}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};

interface IconEllipseProps {
  color: 'done' | 'notDone';
  stepNumber: number;
}
export const IconEllipse: React.FC<IconEllipseProps> = ({
  color,
  stepNumber,
}) => {
  const textStyles = {
    fontSize: '14px',
    fontStyle: 'normal',
    fontFamily: 'PoppinsBold, HeeboBold',
    lineHeight: '21px',
    letterSpacing: '0.087px',
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="11"
        stroke={color === 'done' ? '#FFF' : '#ABD4EE'}
        strokeWidth="2"
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        stroke={color === 'done' ? '#FFF' : '#ABD4EE'}
        fill={color === 'done' ? '#FFF' : '#ABD4EE'}
        strokeWidth="0.5px"
        dy="0.38em"
        style={textStyles}
      >
        {stepNumber}
      </text>
    </svg>
  );
};
interface AddSelectionButtonProps<T> {
  className?: string;
  selectedCards: Set<VertexManager<Note>>;
}
export function RemoveMultiButton<T>({
  className,
  selectedCards,
}: AddSelectionButtonProps<T>) {
  const styles = useStyles();
  const handleDeleteClick = () => {
    selectedCards.forEach((cardM) => {
      cardM.vertex.isDeleted = 1;
    });
  };
  //TODO: ask Ofri how to get the view type (note/task).
  const view = usePartialView('selectedTabId');
  const isTask = view.selectedTabId === 'tasks' ? true : false;
  const nCards = selectedCards.size;
  const handleCancelClick = () => {};

  return (
    <Menu
      renderButton={() => <RemoveButton />}
      direction="out"
      position="bottom"
      align="end"
      popupClassName={cn(styles.popup)}
    >
      <React.Fragment>
        <div className={cn(styles.confirmation)}>
          {isTask ? `Delete ${nCards} Tasks?` : `Delete ${nCards} Notes`}
          <div className={cn(styles.confirmationButtons)}>
            <RemoveButton onRemove={() => handleDeleteClick()} text="Delete" />
            <CancelButton onCancel={() => handleCancelClick()} />
          </div>
        </div>
      </React.Fragment>
    </Menu>
  );
}
export function AssignMultiButton<T>({
  className,
  selectedCards,
}: AddSelectionButtonProps<T>) {
  const styles = useStyles();
  // const cardData: Note = useVertexByKey(card);
  const allWorkspaces: Set<Workspace> = new Set();
  usePartialVertices(selectedCards, ['workspace']).forEach((card) =>
    allWorkspaces.add(card.workspace)
  );

  const workspaceUserSets = usePartialVertices(allWorkspaces, ['users']);
  let intersectionUsers = new Set<User>();

  if (workspaceUserSets.length > 0) {
    intersectionUsers = new Set(workspaceUserSets[0].users);

    workspaceUserSets.forEach((ws, index) => {
      if (index > 0) {
        intersectionUsers = SetUtils.intersection(intersectionUsers, ws.users);
      }
    });
  }
  const intersectionUsersArray = Array.from(intersectionUsers);

  const onRowSelect = (user: User) => {
    selectedCards.forEach((card) => {
      card.vertex.assignees.add(user);
    });
  };
  const onClearAssignees = () => {
    selectedCards.forEach((card) => {
      card.vertex.assignees.clear();
    });
  };

  return (
    <Menu
      renderButton={() => <AssignWsBlueButton disable={false} />}
      position="bottom"
      align="end"
      direction="out"
      className={className}
      popupClassName={cn(styles.popup)}
    >
      <MemberPicker
        users={intersectionUsersArray}
        onRowSelect={onRowSelect}
        onClearAssignees={onClearAssignees}
      />
    </Menu>
  );
}
export function AddTagMultiButton<T>({
  className,
  selectedCards,
}: AddSelectionButtonProps<T>) {
  const styles = useStyles();
  const allWorkspaces: Set<Workspace> = new Set();

  usePartialVertices(selectedCards, ['workspace']).forEach((card) =>
    allWorkspaces.add(card.workspace)
  );

  const parentTagsSet = usePartialVertices(allWorkspaces, ['parentTags']);
  let parentTagsSetIntersection = new Set<Tag>();

  if (parentTagsSet.length > 0) {
    parentTagsSetIntersection = new Set(parentTagsSet[0].parentTags);

    parentTagsSet.forEach((parentTags, index) => {
      if (index > 0) {
        parentTagsSetIntersection = SetUtils.intersection(
          parentTagsSetIntersection,
          new Set(parentTags.parentTags)
        );
      }
    });
  }
  let intersectionTagsArray: Tag[] = [];
  parentTagsSetIntersection.forEach((parentTag) => {
    intersectionTagsArray = [...intersectionTagsArray, ...parentTag.childTags];
  });

  const onRowSelect = (tag: Tag) => {
    selectedCards.forEach((card) => {
      const parent = tag.parentTag || tag;
      card.vertex.tags.set(parent, tag);
    });
  };
  const onClearTags = () => {
    selectedCards.forEach((tag) => {
      tag.vertex.tags.clear();
    });
  };

  return (
    <Menu
      renderButton={() => <AddTagBlueButton />}
      position="bottom"
      align="end"
      direction="out"
      className={className}
      popupClassName={cn(styles.popup)}
    >
      <TagPicker
        tags={intersectionTagsArray}
        onRowSelect={onRowSelect}
        onClearTags={onClearTags}
      />
    </Menu>
  );
}

export interface MultiSelectBarProps {
  onClose?: () => void;
  selectedCards: Set<VertexManager<Note>>;
}

export const MultiSelectBar: React.FC<MultiSelectBarProps> = ({
  onClose,
  selectedCards,
}) => {
  const useStyles = makeStyles(
    () => ({
      MultiSelectBarStyle: {
        top: '0px',
        right: '0px',
        height: '73px',
        position: 'absolute',
        width: '100%',
        backgroundColor: '#3184dd',
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
      },
      wizardContainerStyle: {
        display: 'flex',
        width: '100%',
        justifyContent: 'space-between',
        marginLeft: '10%',
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: '5%',
        position: 'relative',
        color: '#FFF',
      },
      functionContainer: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
        color: '#FFF',
        gap: '32px',
      },
      doneContainer: {
        position: 'relative',
      },
      closeIcon: {
        paddingRight: styleguide.gridbase * 4,
        paddingLeft: styleguide.gridbase * 2,
      },
      toggleViewButton: {
        cursor: 'pointer',
        textDecoration: 'underline',
        basedOn: [useTypographyStyles.text],
      },
      toggleViewButtonDisabled: {
        cursor: 'not-allowed',
        color: theme.colors.placeholderText,
      },
      toggleActions: {
        marginTop: styleguide.gridbase,
        marginLeft: styleguide.gridbase,
        marginRight: styleguide.gridbase * 3.5,
        justifyContent: 'space-between',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px',
      },
      separateLine: {
        fontSize: '16px',
      },
    }),
    'multiSelect-wizard_291877'
  );
  const styles = useStyles();

  const selectAll = useCallback(() => {}, []);

  const handleOnClose = () => {
    onClose && onClose();
  };
  return (
    <div className={styles.MultiSelectBarStyle}>
      <div className={styles.wizardContainerStyle}>
        <div className={styles.toggleActions}>
          {<img src="/icons/design-system/selectedCheck.svg" />}

          <TextSm>{selectedCards.size} selected </TextSm>
          <div className={styles.separateLine}> | </div>
          <TextSm
            onClick={selectAll}
            className={cn(
              styles.toggleViewButton,
              selectedCards.size === 1 && styles.toggleViewButtonDisabled
            )}
          >
            Select All
          </TextSm>
        </div>
        <div className={styles.functionContainer}>
          <AssignMultiButton selectedCards={selectedCards} />
          <AddTagMultiButton selectedCards={selectedCards} />
          <DueDateMultiSelect />
          <RemoveMultiButton selectedCards={selectedCards} />
        </div>
        <SaveAddButton onSaveAddClick={handleOnClose} disable={false} />
      </div>
    </div>
  );
};
