import React, { useCallback, useMemo } from 'react';
import {
  TextSm,
  useTypographyStyles,
} from '../../../../../styles/components/typography.tsx';
import { styleguide } from '../../../../../styles/styleguide.ts';
import {
  BlueActionButton,
  DueDateMultiSelect,
  WhiteActionButton,
} from '../../settings/components/settings-buttons.tsx';
import Menu from '../../../../../styles/components/menu.tsx';
import {
  Note,
  Tag,
  User,
  Workspace,
} from '../../../../../cfds/client/graph/vertices/index.ts';
import { cn, makeStyles } from '../../../../../styles/css-objects/index.ts';
import { useQuery2, useSharedQuery } from '../../../core/cfds/react/query.ts';
import { usePartialVertices } from '../../../core/cfds/react/vertex.ts';
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
import { Query } from '../../../../../cfds/client/graph/query.ts';
import {
  TagId,
  decodeTagId,
  encodeTagId,
} from '../../../../../cfds/base/scheme-types.ts';
import {
  DismissFn,
  DisplayToastFunction,
  ToastProvider,
  UndoFunction,
  useToastController,
} from '../../../../../styles/components/toast/index.tsx';
import { usePendingAction } from './cards-display/index.tsx';
import { ConfirmationDialog } from '../../../../../styles/components/confirmation-menu.tsx';

const useStyles = makeStyles(
  () => ({
    popup: {
      // backgroundColor: theme.colors.background,
      maxWidth: styleguide.gridbase * 21,
      maxHeight: styleguide.gridbase * 21,
      minWidth: styleguide.gridbase * 17.5,
      flexShrink: 0,
    },
    MultiSelectBarStyle: {
      top: '0px',
      right: '0px',
      height: '80px',
      position: 'fixed',
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
      color: '#FFF',
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

interface AddSelectionButtonProps<T> {
  className?: string;
  selectedCards: Set<VertexManager<Note>>;
  setSelectedCards?: (card: Set<VertexManager<Note>>) => void;
}

const displayUndoToast = (
  displayToast: DisplayToastFunction,
  messageText: string,
  undoFunction: UndoFunction
): void => {
  displayToast({
    text: messageText,
    duration: 5000,
    action: {
      text: 'Undo',
      fn: (dismiss: DismissFn) => {
        undoFunction();
        dismiss();
      },
    },
  });
};
export function RemoveMultiButton<T>({
  className,
  selectedCards,
  setSelectedCards,
}: AddSelectionButtonProps<T>) {
  const styles = useStyles();
  const { displayToast } = useToastController();
  const view = usePartialView('selectedTabId');
  const isTask = view.selectedTabId === 'tasks' ? true : false;
  const nCards = selectedCards.size;
  const { pendingAction, setPendingAction } = usePendingAction();

  const captureSelectedCardsState = () => {
    //TODO: ask ofri if its ok for undo or do we need to change isDeleted = -1 back for each card.
    return new Set(selectedCards);
  };
  const itemText = isTask
    ? `${selectedCards.size === 1 ? 'task' : 'tasks'}`
    : `${selectedCards.size === 1 ? 'note' : 'notes'}`;

  const handleDeleteClick = () => {
    setPendingAction(true);

    setTimeout(() => {
      const prevState = captureSelectedCardsState();
      selectedCards.forEach((cardM) => {
        cardM.vertex.isDeleted = 1;
      });

      displayUndoToast(
        displayToast,
        `Deleted ${selectedCards.size} ${itemText}.`,
        () => setSelectedCards!(prevState)
      );
      setPendingAction(false);
      setSelectedCards && setSelectedCards(new Set());
    }, 2000);
  };

  const handleCancelClick = () => {};

  return (
    <Menu
      renderButton={() => (
        <BlueActionButton
          disable={false}
          buttonText={'Delete'}
          imgSrc={'/icons/settings/Delete-white.svg'}
        />
      )}
      direction="out"
      position="bottom"
      align="end"
      popupClassName={cn(styles.popup)}
    >
      <ConfirmationDialog
        nCards={nCards}
        approveButtonText={'Delete'}
        itemText={itemText}
        handleApproveClick={handleDeleteClick}
        handleCancelClick={handleCancelClick}
      />
    </Menu>
  );
}

export function AssignMultiButton<T>({
  className,
  selectedCards,
}: AddSelectionButtonProps<T>) {
  const styles = useStyles();
  const allWorkspaces: Set<Workspace> = new Set();
  const { displayToast } = useToastController();
  const view = usePartialView('selectedTabId');
  const isTask = view.selectedTabId === 'tasks' ? true : false;
  const itemText = isTask
    ? `${selectedCards.size === 1 ? 'task' : 'tasks'}`
    : `${selectedCards.size === 1 ? 'note' : 'notes'}`;

  usePartialVertices(selectedCards, ['workspace']).forEach((card) =>
    allWorkspaces.add(card.workspace)
  );
  const { pendingAction, setPendingAction } = usePendingAction();

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

  const captureAssigneeState = (): Map<VertexManager<Note>, Set<User>> => {
    const previousAssignees = new Map<VertexManager<Note>, Set<User>>();
    selectedCards.forEach((card) => {
      previousAssignees.set(card, new Set([...card.vertex.assignees]));
    });
    return previousAssignees;
  };

  const undoAssigneeAssignment = (
    previousAssignees: Map<VertexManager<Note>, Set<User>>
  ) => {
    selectedCards.forEach((card) => {
      const assignees = previousAssignees.get(card);
      if (assignees) {
        card.vertex.assignees = assignees;
      }
    });
  };

  const onRowSelect = (user: User) => {
    setPendingAction(true);
    setTimeout(() => {
      const previousAssignees = captureAssigneeState();
      selectedCards.forEach((card) => {
        card.vertex.assignees.add(user);
      });

      displayUndoToast(
        displayToast,
        `User ${user.name} assigned to ${selectedCards.size} ${itemText}.`,
        () => undoAssigneeAssignment(previousAssignees)
      );
      setPendingAction(false);
    }, 1000);
  };

  const onClearAssignees = () => {
    setPendingAction(true);
    setTimeout(() => {
      const previousAssignees = captureAssigneeState();
      selectedCards.forEach((card) => {
        card.vertex.assignees.clear();
      });
      displayUndoToast(
        displayToast,
        `Cleared all assignees from ${selectedCards.size} ${itemText}.`,
        () => undoAssigneeAssignment(previousAssignees)
      );
      setPendingAction(false);
    }, 1000);
  };

  return (
    <Menu
      renderButton={() => (
        <BlueActionButton
          disable={false}
          buttonText={'Assign'}
          imgSrc={'/icons/settings/InviteWhite.svg'}
        />
      )}
      position="bottom"
      align="end"
      direction="out"
      className={className}
      popupClassName={cn(styles.popup)}
    >
      <MemberPicker
        users={intersectionUsersArray
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
  const { displayToast } = useToastController();
  const view = usePartialView('selectedTabId');
  const isTask = view.selectedTabId === 'tasks' ? true : false;
  const itemText = isTask
    ? `${selectedCards.size === 1 ? 'task' : 'tasks'}`
    : `${selectedCards.size === 1 ? 'note' : 'notes'}`;

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
  const { pendingAction, setPendingAction } = usePendingAction();

  let allEncodedTags: Set<TagId> = new Set();
  const tagMap = new Map<string, Tag>();

  for (const [index, gid] of [...allWorkspaces].entries()) {
    const wsTags: Set<TagId> = new Set();

    query.group(gid.key).map((tag) => {
      if (!tag.vertex.parentTag) console.log(tag.vertex.name);
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

  let intersectionTagsArray = Array.from(allEncodedTags).map(
    (tagId) => tagMap.get(tagId)!
  );

  // let intersectionTagsArray: Tag[] = [];
  // allEncodedTags.forEach((tagId) => {
  //   // const [parent, child] = decodeTagId(tagId);
  //   const tagChild = tagMap.get(tagId)!; //TODO: ask ofri about the tagMap (is dont like this impl)
  //   intersectionTagsArray = [...intersectionTagsArray, tagChild];
  // });

  const captureTagState = (): Map<VertexManager<Note>, Set<Tag>> => {
    const previousTags = new Map<VertexManager<Note>, Set<Tag>>();
    selectedCards.forEach((card: VertexManager<Note>) => {
      previousTags.set(card, new Set([...card.vertex.tags.values()]));
    });
    return previousTags;
  };

  const undoTagAssignment = (
    previousTags: Map<VertexManager<Note>, Set<Tag>>
  ) => {
    selectedCards.forEach((card) => {
      const tags = previousTags.get(card);
      if (tags) {
        card.vertex.tags.clear();
        tags.forEach((value, key) => {
          card.vertex.tags.set(key, value);
        });
      }
    });
  };

  const onRowSelect = (tag: Tag) => {
    setPendingAction(true);
    setTimeout(() => {
      const previousTags = captureTagState();
      selectedCards.forEach((card) => {
        const parent = tag.parentTag || tag;
        card.vertex.tags.set(parent, tag);
      });

      displayUndoToast(
        displayToast,
        `Tag "${tag.name}" added to ${selectedCards.size} ${itemText}.`,
        () => undoTagAssignment(previousTags)
      );
      setPendingAction(false);
    }, 1000);
  };

  const onClearTags = () => {
    setPendingAction(true);
    setTimeout(() => {
      const previousTags = captureTagState();
      selectedCards.forEach((card) => {
        card.vertex.tags.clear();
      });

      displayUndoToast(
        displayToast,
        `All tags cleared from ${selectedCards.size} ${itemText}.`,
        () => undoTagAssignment(previousTags)
      );
      setPendingAction(false);
    }, 1000);
  };

  return (
    <Menu
      renderButton={() => (
        <BlueActionButton
          disable={false}
          buttonText={'Tag'}
          imgSrc={'/icons/design-system/tag/addTagWhite.svg'}
        />
      )}
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

  // const [allCards, setAllCards] = useState<Set<VertexManager<Note>>>(new Set());
  // const view = usePartialView(
  //   'noteType',
  //   'expandedGroupIds',
  //   'selectedWorkspaces'
  // );
  const selectAll = useCallback(() => {
    // const allCardsHolder = new Set<VertexManager<Note>>();
    // allNotes.forEach((ws: Workspace) => {
    //   allCardsHolder.add(ws.notesQuery.group());
    // });
  }, []);

  const handleOnClose = () => {
    onClose && onClose();
  };
  return (
    <ToastProvider>
      <div className={styles.MultiSelectBarStyle}>
        <div className={styles.wizardContainerStyle}>
          <div className={styles.toggleActions}>
            {<img src="/icons/design-system/selectedCheck.svg" />}
            <TextSm>{selectedCards.size} selected </TextSm>
            {/* <div className={styles.separateLine}> | </div>
            <TextSm onClick={selectAll} className={cn(styles.toggleViewButton)}>
              Select All
            </TextSm> */}
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
          <WhiteActionButton
            onClick={handleOnClose}
            disable={false}
            buttonText={'Done'}
            imgSrc={'/icons/settings/Check.svg'}
          />
        </div>
      </div>
    </ToastProvider>
  );
};
