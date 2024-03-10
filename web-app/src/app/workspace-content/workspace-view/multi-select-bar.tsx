import React, {
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import Menu, {
  useMenuContext,
} from '../../../../../styles/components/menu.tsx';
import {
  Note,
  Tag,
  User,
  Workspace,
} from '../../../../../cfds/client/graph/vertices/index.ts';
import { cn, makeStyles } from '../../../../../styles/css-objects/index.ts';
import { useQuery2, useSharedQuery } from '../../../core/cfds/react/query.ts';
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
import { canUnifyParentTags } from './cards-display/display-bar/filters/index.tsx';
import { Query } from '../../../../../cfds/client/graph/query.ts';
import {
  TagId,
  decodeTagId,
  encodeTagId,
} from '../../../../../cfds/base/scheme-types.ts';
import { getValueFromTextNode } from '../../../../../../../../Library/Caches/deno/npm/registry.npmjs.org/@smithy/smithy-client/2.1.16/dist-types/get-value-from-text-node.d.ts';
import { Vertex } from '../../../../../cfds/client/graph/vertex.ts';
import { isAbsolute } from 'std/path/is_absolute.ts';

const useStyles = makeStyles(
  () => ({
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
    MultiSelectBarStyle: {
      top: '-81px',
      right: '0px',
      height: '80px',
      position: 'absolute',
      // width: '100%',
      width: '100vw',

      backgroundColor: '#3184dd',
      padding: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      zIndex: 9,
    },

    wizardContainerStyle: {
      display: 'flex',
      width: '100%',
      justifyContent: 'space-between',
      marginLeft: '5%',
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
      marginRight: styleguide.gridbase,
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

interface ConfirmationDialogProps {
  isTask: boolean;
  nCards: number;
  handleDeleteClick: () => void;
  handleCancelClick: () => void;
}

export function ConfirmationDialog({
  isTask,
  nCards,
  handleDeleteClick,
  handleCancelClick,
}: ConfirmationDialogProps) {
  const styles = useStyles();
  const componentRef = useRef<HTMLDivElement>(null);
  const menuCtx = useMenuContext();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        componentRef.current &&
        !componentRef.current.contains(event.target as Node)
      ) {
        console.log('clicked outside of ref');
        menuCtx.close();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuCtx]);

  return (
    <div ref={componentRef} className={cn(styles.confirmation)}>
      {isTask ? `Delete ${nCards} Tasks?` : `Delete ${nCards} Notes`}
      <div className={cn(styles.confirmationButtons)}>
        <RemoveButton onRemove={handleDeleteClick} text="Delete" />
        <CancelButton onCancel={handleCancelClick} />
      </div>
    </div>
  );
}

interface AddSelectionButtonProps<T> {
  className?: string;
  selectedCards: Set<VertexManager<Note>>;
  setSelectedCards?: (card: Set<VertexManager<Note>>) => void;
}
export function RemoveMultiButton<T>({
  className,
  selectedCards,
  setSelectedCards,
}: AddSelectionButtonProps<T>) {
  const styles = useStyles();
  const view = usePartialView('selectedTabId');
  const isTask = view.selectedTabId === 'tasks' ? true : false;
  const nCards = selectedCards.size;

  const handleDeleteClick = () => {
    selectedCards.forEach((cardM) => {
      cardM.vertex.isDeleted = 1; //TODO: ask ofri if it should be removed auto from selectedCards when isDeleted is set to 1.
    });
    setSelectedCards!(new Set<VertexManager<Note>>());
  };
  const handleCancelClick = () => {};

  return (
    <Menu
      renderButton={() => <RemoveButton text="Delete" />}
      direction="out"
      position="bottom"
      align="end"
      popupClassName={cn(styles.popup)}
    >
      <ConfirmationDialog
        isTask={isTask}
        nCards={nCards}
        handleDeleteClick={handleDeleteClick}
        handleCancelClick={handleCancelClick}
      />
      {/* <div ref={componentRef} className={cn(styles.confirmation)}>
        {isTask ? `Delete ${nCards} Tasks?` : `Delete ${nCards} Notes`}
        <div className={cn(styles.confirmationButtons)}>
          <RemoveButton onRemove={() => handleDeleteClick()} text="Delete" />
          <CancelButton onCancel={() => handleCancelClick()} />
        </div>
      </div> */}
    </Menu>
  );
}
export function AssignMultiButton<T>({
  className,
  selectedCards,
}: AddSelectionButtonProps<T>) {
  const styles = useStyles();
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
        usersMn={intersectionUsersArray
          .filter((user) => user.manager)
          .map((user) => user.manager)}
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

  const graph = useGraphManager();
  const query = useQuery2(
    useMemo(
      () =>
        new Query<Tag, Tag, string>({
          source: graph.sharedQueriesManager.childTags,
          predicate: (tag) => allWorkspaces.has(tag.workspace),
          contentSensitive: true,
          contentFields: ['parentTag', 'name'],
          groupBy: (tag) => tag.workspace.key,
        }),
      [
        Array.from(allWorkspaces)
          .map((ws) => ws.key)
          .sort()
          .join('-'),
        graph,
      ]
    )
  );

  let allEncodedTags: Set<TagId> = new Set();
  const tagMap = new Map<string, Tag>();

  for (const [index, gid] of [...allWorkspaces].entries()) {
    const wsTags: Set<TagId> = new Set();

    query.group(gid.key).map((tag) => {
      if (!tag.vertex.parentTag) console.log(tag.vertex.parentTag);
      const encodedTag = encodeTagId(
        tag.vertex.parentTag?.name,
        tag.vertex.name
      );
      wsTags.add(encodedTag);
      tagMap.set(encodedTag, tag.vertex);
    });

    if (index === 0) {
      allEncodedTags = wsTags;
    } else if (allEncodedTags) {
      allEncodedTags = new Set(
        [...allEncodedTags].filter((x) => wsTags.has(x))
      );
    }
  }
  allEncodedTags = allEncodedTags || new Set();

  let intersectionTagsArray: Tag[] = [];
  allEncodedTags.forEach((tagId) => {
    // const [parent, child] = decodeTagId(tagId);
    const tagChild = tagMap.get(tagId)!; //TODO: ask ofri about the tagMap (is dont like this impl)

    intersectionTagsArray = [...intersectionTagsArray, tagChild];
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
  setSelectedCards: (card: Set<VertexManager<Note>>) => void;
}

export const MultiSelectBar: React.FC<MultiSelectBarProps> = ({
  onClose,
  selectedCards,
  setSelectedCards,
}) => {
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
          {/* <DueDateMultiSelect /> */}
          <RemoveMultiButton
            selectedCards={selectedCards}
            setSelectedCards={setSelectedCards}
          />
        </div>
        <SaveAddButton onSaveAddClick={handleOnClose} disable={false} />
      </div>
    </div>
  );
};
