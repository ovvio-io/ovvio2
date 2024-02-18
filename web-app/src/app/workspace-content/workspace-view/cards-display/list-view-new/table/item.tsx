import React, {
  CSSProperties,
  KeyboardEventHandler,
  MouseEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { formatTimeDiff } from '../../../../../../../../base/date.ts';
import { VertexManager } from '../../../../../../../../cfds/client/graph/vertex-manager.ts';
import {
  Note,
  NoteType,
} from '../../../../../../../../cfds/client/graph/vertices/note.ts';
import { Tag } from '../../../../../../../../cfds/client/graph/vertices/tag.ts';
import { User } from '../../../../../../../../cfds/client/graph/vertices/user.ts';
import { Workspace } from '../../../../../../../../cfds/client/graph/vertices/workspace.ts';
import { Button } from '../../../../../../../../styles/components/buttons.tsx';
import IconDelete from '../../../../../../../../styles/components/icons/IconDelete.tsx';
import IconNote from '../../../../../../../../styles/components/icons/IconNote.tsx';
import {
  CheckBox,
  TaskCheckbox,
} from '../../../../../../../../components/task.tsx';
import { IconArrowDown } from '../../../../../../../../styles/components/new-icons/icon-arrow-down.tsx';
import { IconContent } from '../../../../../../../../styles/components/new-icons/icon-content.tsx';
import {
  DueDateState,
  IconDueDate,
} from '../../../../../../../../styles/components/new-icons/icon-due-date.tsx';
import { IconNewTask } from '../../../../../../../../styles/components/new-icons/icon-new-task.tsx';
import { IconPin } from '../../../../../../../../styles/components/new-icons/icon-pin.tsx';
import { useToastController } from '../../../../../../../../styles/components/toast/index.tsx';
import {
  TextSm,
  useTypographyStyles,
} from '../../../../../../../../styles/components/typography.tsx';
import {
  cn,
  makeStyles,
} from '../../../../../../../../styles/css-objects/index.ts';
import {
  lightColorWheel,
  brandLightTheme as theme,
} from '../../../../../../../../styles/theme.tsx';
import { layout } from '../../../../../../../../styles/layout.ts';
import { Text } from '../../../../../../../../styles/components/texts.tsx';
import { styleguide } from '../../../../../../../../styles/styleguide.ts';
import { usePartialView } from '../../../../../../core/cfds/react/graph.tsx';
import {
  usePartialVertex,
  useVertex,
} from '../../../../../../core/cfds/react/vertex.ts';
import {
  createUseStrings,
  format,
} from '../../../../../../core/localization/index.tsx';
import {
  AssignButton,
  Assignee,
} from '../../../../../../shared/card/assignees-view.tsx';
import { RenderDraggableProps } from '../../../../../../shared/dragndrop/draggable.tsx';
import CardMenuView from '../../../../../../shared/item-menu/index.tsx';
import TagButton from '../../../../../../shared/tags/tag-button.tsx';
import TagView from '../../../../../../shared/tags/tag-view.tsx';
import { assignNote } from '../../../../../../shared/utils/assignees.ts';
import { useWorkspaceColor } from '../../../../../../shared/workspace-icon/index.tsx';
import { WorkspaceIndicatorButtonProps } from '../../card-item/workspace-indicator.tsx';
import { GridColumns, useGridStyles } from './grid.tsx';
import localization from '../list.strings.json' assert { type: 'json' };
import { useLogger } from '../../../../../../core/cfds/react/logger.tsx';
import { WorkspaceIndicator } from '../../../../../../../../components/workspace-indicator.tsx';
import { IconCollapseExpand } from '../../../../../../../../styles/components/new-icons/icon-collapse-expand.tsx';
import { DueDateIndicator } from '../../card-item/card-footer.tsx';

export const ROW_HEIGHT = styleguide.gridbase * 5.5;

const useStyles = makeStyles(
  () => ({
    row: {
      height: ROW_HEIGHT,
      width: '100%',
      basedOn: [layout.row],
      alignItems: 'center',
      borderRadius: '2px',
      borderStyle: 'solid',
      borderColor: 'transparent',
      boxSizing: 'border-box',
      marginBottom: '1px',
      backgroundColor: theme.colors.background,
      boxShadow: theme.shadows.z2,
    },
    itemRow: {
      position: 'relative',
      transform: 'scale(1)',
      ':hover': {
        visibleOnHover: {
          opacity: 1,
        },
      },
    },
    doneIndicator: {
      pointerEvents: 'none',
      position: 'absolute',
      top: '50%',
      left: styleguide.gridbase * 4,
      width: 0,
      height: 1,
      backgroundColor: theme.mono.m4,
      ...styleguide.transition.standard,
      transitionProperty: 'width',
    },
    doneIndicatorActive: {
      width: `calc(100% - ${styleguide.gridbase * 8}px)`,
    },
    cell: {
      alignItems: 'center',
      basedOn: [layout.row],
      paddingLeft: '8px',
    },

    iconCell: {
      width: styleguide.gridbase * 4,
      display: 'flex',
      justifyContent: 'center',
    },
    childPadding: {
      width: styleguide.gridbase * 5,
      backgroundColor: '#8BC5EE',
    },
    title: {
      width: '60%',
      cursor: 'pointer',
      position: 'relative',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
    },
    expanderColumn: {
      cursor: 'pointer',
      width: styleguide.gridbase * 2,
    },
    wsColumn: {
      width: '16%',
      padding: [0, styleguide.gridbase * 0.5],
    },
    assigneeColumn: {
      width: '8%',
      overflow: 'hidden',
    },
    assignee: {
      marginRight: styleguide.gridbase * 0.5,
    },
    tagsColumn: {
      width: '16%',
      overflow: 'hidden',
      padding: [0, styleguide.gridbase],
    },
    tag: {
      marginRight: styleguide.gridbase * 0.5,
    },
    dateColumn: {
      padding: [0, styleguide.gridbase * 0.5],
      whiteSpace: 'nowrap',
      width: styleguide.gridbase * 9,
    },
    dueDateIcon: {
      marginRight: styleguide.gridbase * 0.5,
    },
    overdueDateText: {
      color: theme.supporting.O4,
    },
    dueDate: {
      width: styleguide.gridbase * 13,
    },

    pinOff: {
      opacity: 0,
      ...styleguide.transition.short,
      transitionProperty: 'opacity',
    },
    pinOffOver: {
      opacity: 1,
    },

    plusButton: {
      height: styleguide.gridbase * 2,
      // width: styleguide.gridbase * 2,
      borderRadius: styleguide.gridbase,
      backgroundColor: theme.mono.m1,
      opacity: 0,
      ...styleguide.transition.short,
      transitionProperty: 'opacity',
    },
    visibleOnHover: {
      opacity: 0,
    },
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    checkbox: {
      margin: styleguide.gridbase * 2,
    },
    breadCrumbsTitle: {
      fontSize: '10px',
      color: '#262626',
      position: 'relative',
      top: '1px',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
    },
    breadCrumbsSlash: {
      position: 'relative',
      top: '2px',
      marginRight: styleguide.gridbase / 2,
      marginLeft: styleguide.gridbase / 2,
    },
    hoverableRow: {
      ':hover': {
        backgroundColor: '#FBF6EF',
      },
    },
    workspaceIndicator: {
      maxWidth: styleguide.gridbase * 12,
    },
    cardMiddle: {
      padding: [styleguide.gridbase, 0, 0, 0],
      display: 'flex',
      alignItems: 'center',
    },
  }),
  'item_1cda8c'
);

export type RowProps = React.PropsWithChildren<{
  className?: string;
  style?: CSSProperties;
  onMouseEnter?: React.MouseEventHandler<HTMLTableRowElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLTableRowElement>;
}>;

export function Row({
  children,
  className,
  style,
  onMouseEnter,
  onMouseLeave,
}: RowProps) {
  const styles = useStyles();

  return (
    <div
      className={cn(styles.row, className)}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div>{children}</div>
    </div>
  );
}

export interface ItemRowProps extends Partial<RenderDraggableProps> {
  note: VertexManager<Note>;
  index?: number;
  onClick?: (note: VertexManager<Note>) => void;
  isChild?: boolean;
  groupBy?: string;
}

// type CellProps = React.PropsWithChildren<{
//   className?: string;
//   innerClassName?: string;
//   colSpan?: number;
//   onClick?: MouseEventHandler;
// }>;

// export function Cell({
//   children,
//   className,
//   innerClassName,
//   ...rest
// }: CellProps) {
//   const styles = useStyles();

//   return (
//     <td className={cn(styles.cell, className)} {...rest}>
//       <div className={cn(styles.cellInner, innerClassName)}>{children}</div>
//     </td>
//   );
// }

export const ItemRow = React.forwardRef<HTMLTableRowElement, ItemRowProps>(
  function ({ groupBy, note, isChild, onClick = () => {}, attributes }, ref) {
    const styles = useStyles();
    const [isMouseOver, setIsMouseOver] = useState(false);
    const { childCards } = usePartialVertex(note, ['childCards']);
    const onMouseOver = useCallback(() => setIsMouseOver(true), []);
    const onMouseLeave = useCallback(() => setIsMouseOver(false), []);
    const onClickImpl: MouseEventHandler = (e) => {
      e.stopPropagation();
      onClick(note);
    };
    const view = usePartialView('notesExpandOverride', 'notesExpandBase');

    if (note.scheme.isNull) {
      return null;
    }

    const hasOverride = view.notesExpandOverride.has(note.key);
    const isExpanded =
      (view.notesExpandBase && !hasOverride) ||
      (!view.notesExpandBase && hasOverride);
    return (
      <React.Fragment>
        <div
          className={cn(styles.row, styles.itemRow, styles.hoverableRow)}
          ref={ref}
          onMouseOver={onMouseOver}
          onMouseLeave={onMouseLeave}
        >
          {isChild ? (
            <React.Fragment>
              <div className={cn(styles.childPadding)} />
              <TypeCell note={note} />
              <TitleCell note={note} onClick={onClickImpl} />
            </React.Fragment>
          ) : (
            <React.Fragment>
              <TypeCell note={note} />
              <TitleCell note={note} onClick={onClickImpl} />
              <WorkspaceIndicatorCell note={note} groupBy={groupBy} />
            </React.Fragment>
          )}
          <ExpanderCell
            note={note}
            isExpanded={isExpanded}
            toggleExpanded={() =>
              view.setNoteExpandOverride(note.key, !hasOverride)
            }
          />
          <AssigneesCell note={note} />
          <TagsCell note={note} />
          <DueDateIndicator
            card={note}
            className={styles.dueDate}
            source={'list'}
            isMouseOver={isMouseOver}
          />
          <PinCell isChild={isChild} note={note} isMouseOver={isMouseOver} />
          <MenuCell note={note} />
          <DoneIndicator note={note} />
        </div>
        {isExpanded &&
          childCards.map((x) => (
            <ItemRow
              note={x.manager as VertexManager<Note>}
              key={x.key}
              onClick={onClick}
              isChild={true}
              groupBy={groupBy}
            />
          ))}
      </React.Fragment>
    );
  }
);

const DoneIndicator = ({ note }: { note: VertexManager<Note> }) => {
  const styles = useStyles();
  const { isChecked } = usePartialVertex(note, ['isChecked']);
  return (
    <div
      className={cn(
        styles.doneIndicator,
        isChecked && styles.doneIndicatorActive
      )}
    />
  );
};

const ExpanderCell = ({
  note,
  isExpanded,
  toggleExpanded,
}: {
  note: VertexManager<Note>;
  isExpanded: boolean;
  toggleExpanded: () => void;
}) => {
  const styles = useStyles();
  const { childCards } = usePartialVertex(note, ['childCards']);

  return (
    <div
      className={cn(styles.expanderColumn, styles.cell)}
      onClick={() => toggleExpanded()}
    >
      {!!childCards?.length && <IconCollapseExpand on={isExpanded} />}
    </div>
  );
};

const AssigneesCell = ({ note }: { note: VertexManager<Note> }) => {
  const styles = useStyles();
  const { assignees, workspace } = usePartialVertex(note, [
    'assignees',
    'workspace',
  ]);
  const { users: wsAssignees } = usePartialVertex(
    workspace?.manager as VertexManager<Workspace>,
    ['users']
  );

  const userManagers = useMemo(
    () =>
      Array.from(wsAssignees || []).map(
        (x) => x.manager as VertexManager<User>
      ),
    [wsAssignees]
  );
  const managers = useMemo(
    () =>
      Array.from(assignees || []).map((x) => x.manager as VertexManager<User>),
    [assignees]
  );

  return (
    <div className={cn(styles.assigneeColumn, styles.cell)}>
      {managers.map((x) => (
        <Assignee
          key={x.key}
          user={x}
          cardManager={note}
          users={userManagers}
          assignees={managers}
          className={cn(styles.assignee)}
          size="small"
          source={'list'}
        />
      ))}
      <AssignButton
        source={'list'}
        cardManager={note}
        users={userManagers}
        assignees={managers}
        className={cn(styles.visibleOnHover, styles.assignee)}
      />
    </div>
  );
};

const TagsCell = ({ note }: { note: VertexManager<Note> }) => {
  const styles = useStyles();
  const { tags } = usePartialVertex(note, ['tags', 'workspace']);
  const managers = useMemo(() => {
    const result = [];
    for (const [parent, child] of tags) {
      if (parent instanceof Tag && parent.name?.toLowerCase() === 'status') {
        continue;
      }
      result.push(child.manager);
    }
    return result;
  }, [tags]);
  const tagsMng = new Map<VertexManager<Tag>, VertexManager<Tag>>();
  for (const [p, c] of tags) {
    tagsMng.set(
      p.manager as VertexManager<Tag>,
      c.manager as VertexManager<Tag>
    );
  }
  const onDelete = useCallback(
    (tag: Tag) => {
      note.getVertexProxy().tags.delete(tag.parentTag || tag);
    },
    [note]
  );
  const onTag = useCallback(
    (tag: Tag) => {
      const vert = note.getVertexProxy();
      const tags = vert.tags;
      const parent = tag.parentTag || tag;
      tags.set(parent, tag);
    },
    [note]
  );
  return (
    <div className={cn(styles.tagsColumn, styles.cell)}>
      {managers.map((x) => (
        <TagView
          className={cn(styles.tag)}
          showMenu="hover"
          key={x.key}
          tag={x}
          onSelected={onTag}
          onDelete={onDelete}
        />
      ))}
      <TagButton
        onTagged={onTag}
        className={cn(styles.visibleOnHover)}
        noteId={note}
      />
    </div>
  );
};

const TypeCell = ({
  note,
  isDraft,
}: {
  note: VertexManager<Note>;
  isDraft?: boolean;
}) => {
  const styles = useStyles();
  const noteType = usePartialVertex(note, ['type']).type;
  const isActionable = noteType === NoteType.Task;

  return (
    <div className={cn(styles.iconCell)}>
      {isDraft ? (
        <IconNewTask />
      ) : isActionable ? (
        <TaskCheckbox task={note} />
      ) : (
        <img src="/icons/list/note.svg" />
      )}
    </div>
  );
};

function TitleCell({
  note,
  onClick,
}: {
  note: VertexManager<Note>;
  onClick?: MouseEventHandler;
}) {
  const styles = useStyles();
  const { titlePlaintext } = usePartialVertex(note, ['titlePlaintext']);
  return (
    <div className={cn(styles.title)} onClick={onClick}>
      <Text>{titlePlaintext}</Text>
    </div>
  );
}

interface CardHeaderPartProps extends ItemRowProps {
  isExpanded?: boolean;
  hideMenu?: boolean;
  groupBy?: string;
}

function WorkspaceIndicatorCell({ note, groupBy }: CardHeaderPartProps) {
  const styles = useStyles();
  const pNote = usePartialVertex(note, ['type', 'workspace', 'titlePlaintext']);
  const vNote = useVertex(note);

  const isTask = pNote.type === NoteType.Task;

  return (
    <div className={cn(styles.wsColumn, styles.cell)}>
      {groupBy !== 'workspace' ? (
        <WorkspaceIndicator
          className={cn(styles.workspaceIndicator)}
          workspace={pNote.workspace.manager}
          ofSettings={false}
        />
      ) : (
        ''
      )}
      {isTask && (
        <>
          {vNote.parentNote && (
            <>
              <span className={cn(styles.breadCrumbsSlash)}>/</span>
              <Text className={cn(styles.breadCrumbsTitle)}>
                {vNote.parentNote.titlePlaintext}
              </Text>
            </>
          )}
        </>
      )}
      <div className={cn(layout.flexSpacer)} />
    </div>
  );
}

// const WorkspaceCell = ({
//   note,
//   groupBy,
// }: {
//   note: VertexManager<Note>;
//   groupBy: string | undefined;
//   onWorkspaceMoved?: (note: VertexManager<Note>) => void;
// }) => {
//   const styles = useStyles();
//   return (
//       <WorkspaceIndicatorComponent note={note} groupBy={groupBy} />
//   );
// };

const DateCell = ({ note }: { note: VertexManager<Note> }) => {
  const styles = useStyles();
  const { dueDate, isChecked } = usePartialVertex(note, [
    'dueDate',
    'isChecked',
  ]);
  let content = null;
  const isLate = dueDate instanceof Date && dueDate < new Date() && !isChecked;

  if (dueDate) {
    content = (
      <React.Fragment>
        <IconDueDate
          className={cn(styles.dueDateIcon, styles.cell)}
          state={isLate ? DueDateState.Late : DueDateState.None}
        />
        <TextSm className={isLate ? styles.overdueDateText : undefined}>
          {formatTimeDiff(dueDate)}
        </TextSm>
      </React.Fragment>
    );
  }
  return <div className={cn(styles.dateColumn)}>{content}</div>;
};

export const PinCell = ({
  note,
  isMouseOver,
  isChild,
}: {
  note: VertexManager<Note>;
  isMouseOver: boolean;
  isChild?: boolean;
}) => {
  const styles = useStyles();
  const { isPinned } = usePartialVertex(note, ['isPinned']);

  const togglePin = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const proxy = note.getVertexProxy();
    proxy.isPinned = !proxy.isPinned;
  };

  return (
    <div className={cn(styles.iconCell)}>
      {!isChild && (
        <Button onClick={(event) => togglePin(event)}>
          <IconPin on={isPinned} visible={isMouseOver} />
        </Button>
      )}
    </div>
  );
};

const MenuCell = ({
  note,
  isMouseOver,
}: {
  note: VertexManager<Note>;
  isMouseOver?: boolean;
}) => {
  const styles = useStyles();

  return (
    <div className={cn(styles.iconCell, styles.visibleOnHover)}>
      <CardMenuView visible={isMouseOver} cardManager={note} source="list" />
    </div>
  );
};
