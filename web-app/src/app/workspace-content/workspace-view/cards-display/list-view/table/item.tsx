import React, {
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
import { brandLightTheme as theme } from '../../../../../../../../styles/theme.tsx';
import { layout } from '../../../../../../../../styles/layout.ts';
import { Text } from '../../../../../../../../styles/components/texts.tsx';
import { styleguide } from '../../../../../../../../styles/styleguide.ts';
import { usePartialView } from '../../../../../../core/cfds/react/graph.tsx';
import { usePartialVertex } from '../../../../../../core/cfds/react/vertex.ts';
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
import { moveCard } from '../../../../../../shared/utils/move.ts';
import { useWorkspaceColor } from '../../../../../../shared/workspace-icon/index.tsx';
import {
  WorkspaceIndicator,
  WorkspaceIndicatorButtonProps,
} from '../../card-item/workspace-indicator.tsx';
import { GridColumns, useGridStyles } from './grid.tsx';
import localization from '../list.strings.json' assert { type: 'json' };
import { useLogger } from '../../../../../../core/cfds/react/logger.tsx';

export const ROW_HEIGHT = styleguide.gridbase * 5.5;

const useStyles = makeStyles(
  (_, resolveClass) => ({
    row: {
      height: ROW_HEIGHT,
    },
    itemRow: {
      position: 'relative',
      // This is required to allow position relative for table
      // rows on certain browsers
      transform: 'scale(1)',
      borderBottom: `1px solid ${theme.primary.p3}`,
      ':hover': {
        [GridColumns.DragAnchor]: {
          opacity: 1,
        },
        visibleOnHover: {
          opacity: 1,
        },
      },
      boxShadow: theme.shadows.z2,
      // [`& + ${resolveClass('itemRow')}`]: {
      //   boxShadow: 'none',
      // },
      backgroundColor: theme.colors.background,
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
    cell: {},
    cellInner: {
      // height: '100%',
      alignItems: 'center',
      basedOn: [layout.row],
    },
    iconCell: {
      width: styleguide.gridbase * 4,
      cellInner: {
        width: styleguide.gridbase * 4,
        alignItems: 'center',
        justifyContent: 'center',
      },
    },
    [GridColumns.DragAnchor]: {
      cursor: 'grab',
      opacity: 0,
      // gridColumn: GridColumns.DragAnchor,
    },
    [GridColumns.Type]: {
      width: styleguide.gridbase * 5,
      // gridColumn: GridColumns.Type,
    },
    childPadding: {
      width: styleguide.gridbase * 5,
      background: theme.primary.p2,
    },
    [GridColumns.Title]: {
      // gridColumn: GridColumns.Title,
      width: '100%',
      cursor: 'pointer',
      position: 'relative',
    },
    titleContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      basedOn: [layout.row],
    },
    [GridColumns.Expander]: {
      // gridColumn: GridColumns.Expander,
      cursor: 'pointer',
    },
    expanderIcon: {
      ...styleguide.transition.short,
      transitionProperty: 'transform',
      transform: 'rotate(90deg)',
    },
    expanderIconExpanded: {
      transform: 'rotate(270deg)',
    },
    [GridColumns.ContentIndicator]: {
      // gridColumn: GridColumns.ContentIndicator,
    },

    [GridColumns.Workspace]: {
      // gridColumn: GridColumns.Workspace,
      width: styleguide.gridbase * 10,
      padding: [0, styleguide.gridbase * 0.5],
      boxSizing: 'border-box',
    },
    wsIndicatorButton: {
      alignItems: 'flex-start',
    },
    wsIndicator: {
      width: styleguide.gridbase * 10,
      boxSizing: 'border-box',
      textAlign: 'start',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      userSelect: 'none',
      backgroundColor: 'var(--ws-background)',
      padding: [0, styleguide.gridbase * 0.5, styleguide.gridbase * 0.25],
      height: styleguide.gridbase * 2,
      lineHeight: `${styleguide.gridbase * 2}px`,
      marginRight: styleguide.gridbase * 0.5,
      borderRadius: [2, styleguide.gridbase, styleguide.gridbase, 2],
      basedOn: [useTypographyStyles.textSmall],
    },
    [GridColumns.Assignees]: {
      // gridColumn: GridColumns.Assignees,
    },
    assignee: {
      marginRight: styleguide.gridbase * 0.5,
    },
    [GridColumns.Tags]: {
      padding: [0, styleguide.gridbase],
      // gridColumn: GridColumns.Tags,
    },
    tag: {
      marginRight: styleguide.gridbase * 0.5,
    },
    [GridColumns.DueDate]: {
      padding: [0, styleguide.gridbase * 0.5],
      whiteSpace: 'nowrap',
      // basedOn: [layout.row],
    },
    dueDateIcon: {
      marginRight: styleguide.gridbase * 0.5,
    },
    overdueDateText: {
      color: theme.supporting.O4,
    },
    [GridColumns.Pin]: {
      // gridColumn: GridColumns.Pin,
      width: styleguide.gridbase * 3,
    },
    pinOff: {
      opacity: 0,
      ...styleguide.transition.short,
      transitionProperty: 'opacity',
    },
    pinOffOver: {
      opacity: 1,
    },
    [GridColumns.Menu]: {
      // gridColumn: GridColumns.Menu,
      // basedOn: [layout.row, layout.centerCenter],
    },
    nowrap: {
      whiteSpace: 'nowrap',
    },
    titleEditor: {
      width: '100%',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    titleText: {
      lineHeight: `${styleguide.gridbase * 3}px`,
      basedOn: [useTypographyStyles.text],
    },
    fillRow: {
      backgroundColor: 'transparent',
      // gridColumn: `${GridColumns.Type}/-1`,
    },
    border: {
      height: 1,
      boxSizing: 'border-box',
      gridColumn: `${GridColumns.Type}/-1`,
      borderBottom: `1px solid ${theme.primary.p2}`,
      boxShadow: theme.shadows.z2,
    },
    plusButton: {
      height: styleguide.gridbase * 2,
      width: styleguide.gridbase * 2,
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
  }),
  'item_1cda8c'
);

export { useStyles as useRowStyles };

const useStrings = createUseStrings(localization);

export type RowProps = React.PropsWithChildren<{
  className?: string;
}>;

export function Row({ children, className }: RowProps) {
  const styles = useStyles();

  return (
    <tr className={cn(styles.row, styles.fillRow, className)}>
      <Cell colSpan={100}>{children}</Cell>
    </tr>
  );
}

export interface ItemRowProps extends Partial<RenderDraggableProps> {
  note: VertexManager<Note>;
  index?: number;
  onClick?: (note: VertexManager<Note>) => void;
  isChild?: boolean;
  onWorkspaceMoved?: (note: VertexManager<Note>) => void;
}

type CellProps = React.PropsWithChildren<{
  className?: string;
  innerClassName?: string;
  colSpan?: number;
  onClick?: MouseEventHandler;
}>;

export function Cell({
  children,
  className,
  innerClassName,
  ...rest
}: CellProps) {
  const styles = useStyles();

  return (
    <td className={cn(styles.cell, className)} {...rest}>
      <div className={cn(styles.cellInner, innerClassName)}>{children}</div>
    </td>
  );
}

export const ItemRow = React.forwardRef<HTMLTableRowElement, ItemRowProps>(
  function (
    { onWorkspaceMoved, note, isChild, onClick = () => {}, attributes },
    ref
  ) {
    const styles = useStyles();
    const gridStyles = useGridStyles();
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
        <tr
          className={cn(styles.row, styles.itemRow)}
          ref={ref}
          onMouseOver={onMouseOver}
          onMouseLeave={onMouseLeave}
        >
          {/* <div className={cn(styles[GridColumns.DragAnchor])} {...attributes}>
          ::
        </div> */}
          {isChild ? (
            <React.Fragment>
              <Cell className={cn(styles.childPadding)} />
              <Cell className={cn(styles[GridColumns.Title])}>
                <table className={cn(gridStyles.table)}>
                  <TypeCell note={note} />
                  <TitleCell note={note} onClick={onClickImpl} />
                </table>
              </Cell>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <TypeCell note={note} />
              <TitleCell note={note} onClick={onClickImpl} />
            </React.Fragment>
          )}
          <ExpanderCell
            note={note}
            isExpanded={isExpanded}
            toggleExpanded={() =>
              view.setNoteExpandOverride(note.key, !hasOverride)
            }
          />
          <ContentIndicatorCell note={note} />
          <WorkspaceCell note={note} onWorkspaceMoved={onWorkspaceMoved} />
          <AssigneesCell note={note} showMenu={isMouseOver} />
          <TagsCell note={note} showMenu={isMouseOver} />
          <td className={cn(styles.cell)} />
          <DateCell note={note} />
          <PinCell isChild={isChild} note={note} isMouseOver={isMouseOver} />
          <MenuCell note={note} />
          <DoneIndicator note={note} />
        </tr>
        {isExpanded &&
          childCards.map((x) => (
            <ItemRow
              note={x.manager as VertexManager<Note>}
              key={x.key}
              onClick={onClick}
              isChild={true}
            />
          ))}
      </React.Fragment>
    );
  }
);

export function DraftItemRow({
  note,
  onWorkspaceMoved,
  onCancel,
}: {
  note: VertexManager<Note>;
  onWorkspaceMoved: (note: VertexManager<Note>) => void;
  onCancel: () => void;
}) {
  const styles = useStyles();

  const onClickImpl: MouseEventHandler = (e) => {
    e.stopPropagation();
  };

  const onKeyDown: KeyboardEventHandler<HTMLTableRowElement> = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCancel();
    }
  };

  return (
    <tr className={cn(styles.row, styles.itemRow)} onKeyDown={onKeyDown}>
      <TypeCell note={note} isDraft={true} />
      <TitleCell note={note} isDraft={true} onClick={onClickImpl} />

      <WorkspaceCell
        note={note}
        isDraft={true}
        onWorkspaceMoved={onWorkspaceMoved}
      />
      <td className={cn(styles.cell)} />
      <td className={cn(styles.cell)} />
      <td className={cn(styles.cell)} />
      <td className={cn(styles.cell)} />
      <td className={cn(styles.cell)} />
      <td className={cn(styles.cell, styles[GridColumns.Pin])}>
        <Button onClick={onCancel}>
          <IconDelete />
        </Button>
      </td>
    </tr>
  );
}

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
    <Cell
      className={cn(styles[GridColumns.Expander])}
      onClick={() => toggleExpanded()}
    >
      {!!childCards?.length && (
        <IconArrowDown
          className={cn(
            styles.expanderIcon,
            isExpanded && styles.expanderIconExpanded
          )}
        />
      )}
    </Cell>
  );
};

const ContentIndicatorCell = ({ note }: { note: VertexManager<Note> }) => {
  const styles = useStyles();
  const { bodyPreview } = usePartialVertex(note, ['bodyPreview']);

  return (
    <td
      className={cn(
        styles.cell,
        styles.iconCell,
        styles[GridColumns.ContentIndicator]
      )}
    >
      {!!bodyPreview.trim().length && <IconContent />}
    </td>
  );
};

const AssigneesCell = ({
  note,
  showMenu,
}: {
  note: VertexManager<Note>;
  showMenu: boolean;
}) => {
  const styles = useStyles();
  const logger = useLogger();
  const { assignees, workspace } = usePartialVertex(note, [
    'assignees',
    'workspace',
  ]);
  const { users: wsAssignees } = usePartialVertex(
    workspace?.manager as VertexManager<Workspace>,
    ['users']
  );
  const workspaces = useMemo(
    () => [workspace?.manager as VertexManager<Workspace>],
    [workspace?.manager]
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
    <Cell className={cn(styles.assignees)}>
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
    </Cell>
  );
};

const TagsCell = ({
  note,
  showMenu,
}: {
  note: VertexManager<Note>;
  showMenu: boolean;
}) => {
  const styles = useStyles();
  const logger = useLogger();
  const { tags, workspace } = usePartialVertex(note, ['tags', 'workspace']);
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
      logger.log({
        severity: 'EVENT',
        event: 'MetadataChanged',
        source: 'list',
        type: 'tag',
        vertex: note.key,
        removed: tag.key,
      });
    },
    [note, logger]
  );
  const onTag = useCallback(
    (tag: Tag) => {
      const vert = note.getVertexProxy();
      const tags = vert.tags;
      const parent = tag.parentTag || tag;
      const prevTag = tags.get(parent);
      tags.set(parent, tag);
      logger.log({
        severity: 'EVENT',
        event: 'MetadataChanged',
        type: 'tag',
        vertex: note.key,
        added: tag.key,
        removed: prevTag?.key,
      });
    },
    [note, logger]
  );
  return (
    <Cell className={cn(styles[GridColumns.Tags])}>
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
      {/* <TagButton cardTagsMng={}/> */}
      <TagButton
        onTagged={onTag}
        className={cn(styles.visibleOnHover)}
        noteId={note}
      />
    </Cell>
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
    <Cell className={cn(styles.iconCell, styles[GridColumns.Type])}>
      {isDraft ? (
        <IconNewTask />
      ) : isActionable ? (
        <TaskCheckbox task={note} />
      ) : (
        <img src="/icons/list/note.svg" />
      )}
    </Cell>
  );
};

// export const ItemCheckbox = ({ note }: { note: VertexManager<Note> }) => {
//   const styles = useStyles();
//   const partialNote = usePartialVertex(note, ['isChecked']);
//   return (
//     <CheckBox
//       className={cn(styles.checkbox)}
//       value={partialNote.isChecked}
//       onChange={() => (partialNote.isChecked = !partialNote.isChecked)}
//     />
//   );
// };

const TitleNode = React.forwardRef(
  (
    { className, ...props }: { className?: string },
    ref: React.ForwardedRef<HTMLSpanElement>
  ) => {
    const styles = useStyles();
    return (
      <Text
        ref={ref}
        className={cn(styles.titleText, styles.nowrap, className)}
        {...props}
      />
    );
  }
);
const DraftTitleNode = React.forwardRef(
  (
    { className, ...props }: { className?: string },
    ref: React.ForwardedRef<HTMLSpanElement>
  ) => {
    const styles = useStyles();
    return (
      <Text ref={ref} className={cn(styles.titleText, className)} {...props} />
    );
  }
);

function TitleCell({
  note,
  onClick,
  isDraft,
}: {
  note: VertexManager<Note>;
  onClick?: MouseEventHandler;
  isDraft?: boolean;
}) {
  const styles = useStyles();
  const { titlePlaintext } = usePartialVertex(note, ['titlePlaintext']);
  // const { editor, plugins, handlers } = useTitleEditor(note, TitleNode);
  // useEffect(() => {
  //   if (!isDraft) {
  //     return;
  //   }

  //   let cancelled = false;
  //   setTimeout(() => {
  //     if (cancelled) {
  //       return;
  //     }
  //     ReactEditor.focus(editor);
  //   }, 0);

  //   return () => {
  //     cancelled = true;
  //   };
  // }, [isDraft, editor]);
  return (
    <Cell className={cn(styles.title)} onClick={isDraft ? undefined : onClick}>
      <div className={cn(styles.titleContainer)}>
        {/* <Slate editor={editor} {...handlers}>
          <Editable
            className={cn(styles.titleEditor, !isDraft && styles.nowrap)}
            {...plugins}
            readOnly={!isDraft}
          />
        </Slate> */}
        <Text>{titlePlaintext}</Text>
      </div>
    </Cell>
  );
}

function WorkspaceDraftIndicatorComponent() {
  const styles = useStyles();
  const strings = useStrings();

  return <div className={cn(styles.wsIndicator)}>{strings.saveDraft}</div>;
}

function WorkspaceIndicatorComponent({
  workspace,
}: WorkspaceIndicatorButtonProps) {
  const styles = useStyles();
  const { name } = usePartialVertex(workspace, ['name']);
  const color = useWorkspaceColor(workspace!);
  const strings = useStrings();
  const style = useMemo<any>(
    () => ({
      '--ws-background': color.background,
      '--ws-active': color.active,
      '--ws-inactive': color.inactive,
    }),
    [color]
  );

  return (
    <div className={cn(styles.wsIndicator)} style={style}>
      {name || strings.saveDraft}
    </div>
  );
}

const WorkspaceCell = ({
  note,
  isDraft,
  onWorkspaceMoved,
}: {
  note: VertexManager<Note>;
  isDraft?: boolean;
  onWorkspaceMoved?: (note: VertexManager<Note>) => void;
}) => {
  const styles = useStyles();
  const logger = useLogger();
  const { workspace } = usePartialVertex(note, ['workspace']);
  const wsManager = workspace?.manager as VertexManager<Workspace>;
  const toastController = useToastController();
  const strings = useStrings();

  const setWorkspace = (workspace: VertexManager<Workspace>) => {
    if (isDraft) {
      const proxy = note.getVertexProxy();
      proxy.workspace = workspace.getVertexProxy();
    } else {
      moveCard(note, workspace, note.graph, logger, 'list');
    }
    if (onWorkspaceMoved) {
      onWorkspaceMoved(note);
    }
    toastController.displayToast({
      text: format(isDraft ? strings.draftSaved : strings.cardMoved, {
        workspace: workspace.getVertexProxy().name,
      }),
      duration: 1500,
    });
  };

  return (
    <Cell
      className={cn(styles[GridColumns.Workspace])}
      colSpan={isDraft ? 3 : 1}
    >
      <WorkspaceIndicator
        menuClassName={cn(styles.wsIndicatorButton)}
        workspace={isDraft ? undefined : wsManager}
        isExpanded={false}
        setWorkspace={setWorkspace}
        validateMove={!isDraft}
        readOnly={true}
        ButtonComponent={
          isDraft
            ? WorkspaceDraftIndicatorComponent
            : WorkspaceIndicatorComponent
        }
      />
    </Cell>
  );
};

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
          className={cn(styles.dueDateIcon)}
          state={isLate ? DueDateState.Late : DueDateState.None}
        />
        <TextSm className={isLate ? styles.overdueDateText : undefined}>
          {formatTimeDiff(dueDate)}
        </TextSm>
      </React.Fragment>
    );
  }
  return <Cell className={cn(styles[GridColumns.DueDate])}>{content}</Cell>;
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
    <Cell className={cn(styles.iconCell, styles[GridColumns.Pin])}>
      {!isChild && (
        <Button onClick={(event) => togglePin(event)}>
          <IconPin on={isPinned} visible={isMouseOver} />
        </Button>
      )}
    </Cell>
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
    <Cell
      className={cn(
        styles.iconCell,
        styles.visibleOnHover,
        styles[GridColumns.Menu]
      )}
    >
      <CardMenuView visible={isMouseOver} cardManager={note} source="list" />
    </Cell>
  );
};
