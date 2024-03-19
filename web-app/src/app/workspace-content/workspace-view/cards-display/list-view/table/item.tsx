import React, {
  CSSProperties,
  MouseEventHandler,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { VertexManager } from '../../../../../../../../cfds/client/graph/vertex-manager.ts';
import {
  Note,
  NoteType,
} from '../../../../../../../../cfds/client/graph/vertices/note.ts';
import { Tag } from '../../../../../../../../cfds/client/graph/vertices/tag.ts';
import { User } from '../../../../../../../../cfds/client/graph/vertices/user.ts';
import { Workspace } from '../../../../../../../../cfds/client/graph/vertices/workspace.ts';
import { Button } from '../../../../../../../../styles/components/buttons.tsx';
import { TaskCheckbox } from '../../../../../../../../components/checkbox.tsx';
import { IconNewTask } from '../../../../../../../../styles/components/new-icons/icon-new-task.tsx';
import { IconPin } from '../../../../../../../../styles/components/new-icons/icon-pin.tsx';
import {
  cn,
  keyframes,
  makeStyles,
} from '../../../../../../../../styles/css-objects/index.ts';
import { brandLightTheme as theme } from '../../../../../../../../styles/theme.tsx';
import { layout } from '../../../../../../../../styles/layout.ts';
import { Text } from '../../../../../../../../styles/components/texts.tsx';
import { styleguide } from '../../../../../../../../styles/styleguide.ts';
import { usePartialView } from '../../../../../../core/cfds/react/graph.tsx';
import {
  usePartialVertex,
  usePartialVertices,
  useVertex,
  useVertexByKey,
} from '../../../../../../core/cfds/react/vertex.ts';
import {
  AssignButton,
  Assignee,
} from '../../../../../../shared/card/assignees-view.tsx';
import { RenderDraggableProps } from '../../../../../../shared/dragndrop/draggable.tsx';
import CardMenuView from '../../../../../../shared/item-menu/index.tsx';
import TagButton, {
  TagShowMoreButton,
} from '../../../../../../shared/tags/tag-button.tsx';
import TagView, {
  TagPillView,
} from '../../../../../../shared/tags/tag-view.tsx';
import { WorkspaceIndicator } from '../../../../../../../../components/workspace-indicator.tsx';
import { IconCollapseExpand } from '../../../../../../../../styles/components/new-icons/icon-collapse-expand.tsx';
import { DueDateIndicator } from '../../card-item/card-footer.tsx';
import Tooltip from '../../../../../../../../styles/components/tooltip/index.tsx';
import { camelCase } from 'https://deno.land/x/yargs_parser@v20.2.4-deno/build/lib/string-utils.js';
import { debounce } from '../../../../../../../../base/debounce.ts';
import { coreValueEquals } from '../../../../../../../../base/core-types/equals.ts';
import { filter } from '../../../../../../../../base/set.ts';
import { useWorkspaceColor } from '../../../../../../shared/workspace-icon/index.tsx';
import { VertexId } from '../../../../../../../../cfds/client/graph/vertex.ts';
import { SelectIcon, SelectedIcon } from '../../../select-icons.tsx';
import { AssignMultiButton } from '../../../multi-select-bar.tsx';

export const ROW_HEIGHT = styleguide.gridbase * 5.5;
const showAnim = keyframes({
  '0%': {
    opacity: 0,
  },
  '99%': {
    opacity: 0,
  },
  '100%': {
    opacity: 1,
  },
});
const useStyles = makeStyles(() => ({
  tag2: {
    direction: 'ltr',
    backgroundColor: theme.mono.m1,
    height: styleguide.gridbase * 2,
    minWidth: styleguide.gridbase * 3,
    padding: [0, styleguide.gridbase],
    flexShrink: 0,
    fontSize: 12,
    borderRadius: styleguide.gridbase,
    ...styleguide.transition.short,
    transitionProperty: 'all',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'row',
  },
  tagName: {
    color: theme.colors.text,
    animation: `${showAnim} ${styleguide.transition.duration.short}ms linear backwards`,
    userSelect: 'none',
  },
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
    basedOn: [layout.row],
    transform: 'scale(1)',
    ':hover': {
      visibleOnHover: {
        opacity: 1,
      },
      itemMenu: {
        opacity: 1,
      },
    },
  },
  childRow: {
    height: ROW_HEIGHT - 1,
    basedOn: [layout.row],
    width: '97%',
    left: '3%',
    position: 'relative',
    borderColor: 'transparent',
    borderRadius: '2px',
    alignItems: 'center',
    boxSizing: 'border-box',
    backgroundColor: theme.colors.background,
    boxShadow: theme.shadows.z2,
    marginBottom: '1px',
  },
  isChild: {
    width: '100%',
    borderColor: 'transparent',
    boxSizing: 'border-box',
    backgroundColor: 'rgba(139, 197, 251, 0.35)',
    height: '44px',
  },
  selectedRow: {
    backgroundColor: '#F5F9FB',
    border: '1px solid #CCE3ED',
    boxSizing: 'border-box',
    hover: 'none',
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
  iconCell: {
    width: styleguide.gridbase * 3,
    display: 'flex',
    justifyContent: 'center',
    paddingLeft: styleguide.gridbase,
    cursor: 'pointer',
  },
  title: {
    flexGrow: '1',
    // flexShrink: '2',
    flexShrink: '1', //7.3.24
    flexBasis: 'auto',
    width: 'calc(45% - 156px)',
    minWidth: '20%',
    minHeight: '20px',
    cursor: 'pointer',
    position: 'relative',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    paddingLeft: styleguide.gridbase * 0.5,
  },
  wsColumn: {
    width: 'calc(22% - 156px)',
    basedOn: [layout.row],
    flexGrow: '1',
    flexShrink: '1',
    flexBasis: 'auto',
    alignItems: 'center',
    padding: [0, styleguide.gridbase * 0.5],
  },
  wsColumnForChild: {
    width: 'calc(21% - 170px)',
  },
  assigneeColumn: {
    width: 'calc(15% - 156px)',
    flexGrow: '1',
    flexShrink: '2',
    flexBasis: 'auto',
    overflow: 'clip',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    maxHeight: '34px',
    gap: '1px',
    paddingLeft: styleguide.gridbase,
  },
  assignee: {
    marginRight: styleguide.gridbase * 0.25,
  },
  assigneesContainer: {
    display: 'flex',
  },
  tagsColumn: {
    width: 'calc(18% - 156px)',
    flexGrow: '2',
    flexShrink: '1',
    flexBasis: 'auto',
    overflow: 'clip',
    display: 'flex',
    position: 'relative',
    padding: [0, styleguide.gridbase],
    minHeight: styleguide.gridbase * 2,
  },
  tag: {
    minWidth: '0',
    marginRight: styleguide.gridbase * 0.5,
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
    // pointerEvents: 'auto',
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
  itemMenu: {
    opacity: 0,
    ...styleguide.transition.short,
    transitionProperty: 'opacity',
  },
  itemMenuOpen: {
    opacity: 1,
  },
  rowContainer: {
    position: 'relative',
  },
  selectedIconContainer: {
    position: 'absolute',
    left: '-26px',
    top: '10px',
    cursor: 'pointer',
  },
  selectIconContainer: {
    left: '-67px',
    cursor: 'pointer',
  },
  multiIsActive: {
    pointerEvents: 'none',
    cursor: 'pointer',
  },
  InAction: {
    backgroundColor: '#FBEAC8',
  },
}));

interface SelectIconContainerProps {
  className?: string;
  workspace: VertexManager<Workspace>;
  isSelected: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  handleSelectClick: (card: Note) => void;

  cardKey: string;
}
export function SelectIconContainer({
  className,
  workspace,
  isSelected,
  handleSelectClick,
  cardKey,
}: SelectIconContainerProps) {
  const styles = useStyles();
  const color = useWorkspaceColor(workspace);
  const style = useMemo<any>(
    () => ({
      '--ws-background': color.background,
      '--ws-inactive': color.inactive,
      '--ws-active': color.active,
    }),
    [color]
  );
  const card: Note = useVertexByKey(cardKey);
  return (
    <div
      className={cn(
        !isSelected && styles.selectIconContainer,
        styles.selectedIconContainer,
        className
      )}
      style={style}
      onClick={() => handleSelectClick(card)}
    >
      {isSelected ? (
        <SelectIcon
          rectColor={'var(--ws-background)'}
          circleColor={'var(--ws-active)'}
        />
      ) : (
        <SelectedIcon
          rectColor={'var(--ws-background)'}
          circleColor={'var(--ws-active)'}
        />
      )}
    </div>
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
    <div className={cn(styles.iconCell)} onClick={() => toggleExpanded()}>
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
    <div className={cn(styles.assigneeColumn)}>
      <AssignButton
        source={'list'}
        cardManager={note}
        users={userManagers}
        // className={cn(styles.assignee)}
        className={cn(styles.visibleOnHover, styles.assignee)}
      />
      <div className={cn(styles.assigneeColumn)}>
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
      </div>
    </div>
  );
};

const TagsCell = ({ note }: { note: VertexManager<Note> }) => {
  const styles = useStyles();
  const containerRef = useRef<HTMLDivElement>(null);
  const tagsRef = useRef(new Map());
  const { tags } = usePartialVertex(note, ['tags']);
  const tooltipRef = useRef<HTMLElement>(null);
  const tagButtonRef = useRef<HTMLElement>(null);
  const vNote = useVertex(note);

  const parentNoteTitle = vNote.parentNote?.titlePlaintext;

  const managers = Array.from(tags.values())
    .filter((tag) => {
      return tag.name !== parentNoteTitle;
    })
    .map((tag) => tag.manager);

  const recalculateTagVisibility = useCallback(() => {
    if (!containerRef.current) {
      return;
    }
    const parentRect = containerRef.current.getBoundingClientRect();
    const parentRight =
      parentRect.right -
      (tagButtonRef.current
        ? tagButtonRef.current?.getBoundingClientRect().width
        : 0) -
      (tooltipRef.current
        ? tooltipRef.current.getBoundingClientRect().width
        : 0);
    let lastChildRight = 0;
    if (containerRef.current) {
      for (const tag of containerRef.current?.children) {
        const tagKey = tag.getAttribute('data-tag-key');
        const tagElement = tagKey ? tagsRef.current.get(tagKey) : null;
        if (tagElement) {
          const tagRect = tagElement.getBoundingClientRect();
          if (tagRect.right + 6 >= parentRight || tagRect.x >= parentRight) {
            if (!lastChildRight) {
              lastChildRight = tagRect.x - parentRect.x;
            }
            tagElement.style.visibility = 'hidden';
          } else {
            tagElement.style.visibility = 'visible';
          }
        }
      }

      if (tagButtonRef.current) tagButtonRef.current.style.right = '8px';
      if (tooltipRef.current) {
        if (!lastChildRight) {
          tooltipRef.current.style.visibility = 'hidden';
        } else {
          tooltipRef.current.style.translate = `${lastChildRight - 8}px 0px`;
          tooltipRef.current.style.visibility = 'visible';
        }
      }
    }
  }, []);

  const getHiddenTags = () => {
    const hiddenTags = [];
    if (containerRef.current) {
      for (const tag of containerRef.current.children) {
        const tagKey = tag.getAttribute('data-tag-key');
        const tagName = tag.getAttribute('data-tag-name');
        const tagElement = tagKey ? tagsRef.current.get(tagKey) : null;
        if (tagElement) {
          const displayStyle = window.getComputedStyle(tagElement).visibility;
          if (displayStyle === 'hidden') {
            hiddenTags.push(tagName);
          }
        }
      }
    }
    return hiddenTags.join(',  ');
  };

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      recalculateTagVisibility();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, [containerRef.current]);

  useLayoutEffect(() => {
    recalculateTagVisibility();
  });

  const onTag = useCallback(
    (tag: Tag) => {
      const vert = note.getVertexProxy();
      const tags = vert.tags;
      const parent = tag.parentTag || tag;
      tags.set(parent, tag);
    },
    [note]
  );

  const onDelete = useCallback(
    (tag: Tag) => {
      note.getVertexProxy().tags.delete(tag.parentTag || tag);
    },
    [note]
  );

  return (
    <div ref={containerRef} className={cn(styles.tagsColumn)}>
      {/* <div ref={tagButtonRef} style={{ position: 'absolute' }}> */}
      <div ref={tagButtonRef} style={{ position: 'relative' }}>
        <TagButton
          onTagged={onTag}
          className={cn(styles.visibleOnHover)}
          noteId={note}
        />
      </div>
      {managers.map((tag, index) => (
        <div
          ref={(el) => el && tagsRef.current.set(tag.key, el)}
          data-tag-key={tag.key}
          key={index}
          data-tag-name={tag.getVertexProxy().name}
        >
          <TagView
            className={cn(styles.tag)}
            showMenu="hover"
            key={tag.key}
            tag={tag}
            onSelected={onTag}
            onDelete={onDelete}
          />
        </div>
      ))}

      <div ref={tooltipRef} style={{ position: 'absolute' }}>
        <Tooltip text={getHiddenTags()} position="top" align="center">
          <div className={cn(styles.tag2, styles.tagName)}>...</div>
        </Tooltip>
      </div>
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
      <Tooltip text={titlePlaintext} position="top" align="center">
        <Text>{titlePlaintext}</Text>
      </Tooltip>
    </div>
  );
}

function WorkspaceIndicatorCell({
  note,
  groupBy,
}: {
  note: VertexManager<Note>;
  groupBy?: string;
}) {
  const styles = useStyles();
  const pNote = usePartialVertex(note, ['type', 'workspace', 'titlePlaintext']);
  const vNote = useVertex(note);
  const isTask = pNote.type === NoteType.Task;

  return (
    <div className={styles.wsColumn}>
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
              <Tooltip
                text={vNote.parentNote.titlePlaintext}
                position="top"
                align="center"
              >
                <div className={cn(styles.breadCrumbsTitle)}>
                  {vNote.parentNote.titlePlaintext}
                </div>
              </Tooltip>
            </>
          )}
        </>
      )}
      <div className={cn(layout.flexSpacer)} />
    </div>
  );
}

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
  const [menuOpen, setMenuOpen] = useState(false);
  const pNote = usePartialVertex(note, ['type']);
  const isTask = pNote.type === NoteType.Task;

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const renderButton = useCallback(
    ({ isOpen }: { isOpen: boolean }) => (
      <div className={isOpen ? styles.itemMenuOpen : styles.itemMenu}>
        <img key="IconMoreSettings2" src="/icons/settings/More.svg" />
      </div>
    ),
    []
  );
  return (
    <div className={cn(styles.iconCell)} onClick={toggleMenu}>
      <CardMenuView
        visible={isMouseOver}
        cardManager={note}
        source="list"
        toggleMenu={toggleMenu}
        isOpen={menuOpen}
        renderButton={renderButton}
        isTask={isTask}
      />
    </div>
  );
};

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
  onClick: (note: VertexManager<Note>) => void;
  isChild?: boolean;
  groupBy?: string;
  nestingLevel: number;
  handleSelectClick: (card: Note) => void;
  isSelected: boolean;
  multiIsActive: boolean;
  isInAction: boolean;
}

export const ItemRow = React.forwardRef<HTMLTableRowElement, ItemRowProps>(
  function (
    {
      groupBy,
      note,
      isChild,
      handleSelectClick,
      onClick,
      nestingLevel,
      isSelected,
      multiIsActive,
      isInAction,
    },
    ref
  ) {
    const styles = useStyles();
    const [isMouseOver, setIsMouseOver] = useState(false);
    const { childCards } = usePartialVertex(note, ['childCards']);
    const onMouseOver = useCallback(() => setIsMouseOver(true), []);
    const onMouseLeave = useCallback(() => setIsMouseOver(false), []);
    const onClickImpl: MouseEventHandler = (e) => {
      e.stopPropagation();
      onClick(note);
    };
    const { workspace } = usePartialVertex(note, ['workspace']);

    const view = usePartialView('notesExpandOverride', 'notesExpandBase');

    const childWidth = `${100 - 3 * nestingLevel}%`;
    const leftIndentation = `${3 * nestingLevel}%`;

    if (note.scheme.isNull) {
      return null;
    }
    const hasOverride = view.notesExpandOverride.has(note.key);
    const isExpanded =
      (view.notesExpandBase && !hasOverride) ||
      (!view.notesExpandBase && hasOverride);

    // const handleSelectInMulti()=>{
    //   if(multiIsActive){
    //     if(!isChild && (isMouseOver || isSelected)  )
    //       {
    //       <SelectIconContainer
    //       workspace={workspace.manager}
    //       isSelected={isSelected}
    //       handleSelectClick={handleSelectClick}
    //       cardKey={note.key}
    //     />
    //     }
    //   }
    // }

    const handleSelectInMulti: MouseEventHandler<HTMLDivElement> = (e) => {
      e.stopPropagation();
      if (multiIsActive) {
        handleSelectClick(note.vertex);
      }
    };

    return (
      <div
        className={cn(styles.rowContainer)}
        onMouseOver={onMouseOver}
        onMouseLeave={onMouseLeave}
        onClick={handleSelectInMulti}
      >
        {!isChild && (isMouseOver || isSelected) && (
          <SelectIconContainer
            workspace={workspace.manager}
            isSelected={isSelected}
            handleSelectClick={handleSelectClick}
            cardKey={note.key}
          />
        )}
        <div
          className={cn(
            isChild && styles.isChild,
            multiIsActive && styles.multiIsActive
          )}
        >
          <div
            className={cn(
              isChild ? styles.childRow : styles.row,
              styles.itemRow,
              isSelected ? styles.selectedRow : styles.hoverableRow,
              isInAction && isSelected && styles.InAction
            )}
            style={{
              width: isChild ? childWidth : undefined,
              left: isChild ? leftIndentation : undefined,
            }}
            ref={ref}
          >
            <TypeCell note={note} />
            <TitleCell note={note} onClick={onClickImpl} />
            {isChild ? (
              <div className={cn(styles.wsColumn, styles.wsColumnForChild)} />
            ) : (
              <WorkspaceIndicatorCell note={note} groupBy={groupBy} />
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
              source={'list'}
              isMouseOver={isMouseOver}
            />
            <PinCell
              isChild={isChild}
              note={note}
              isMouseOver={multiIsActive ? false : isMouseOver}
            />
            <MenuCell note={note} />
            <DoneIndicator note={note} />
          </div>
        </div>
        {isExpanded &&
          childCards.map((x) => (
            <ItemRow
              note={x.manager as VertexManager<Note>}
              key={x.key}
              onClick={onClick}
              isChild={true}
              groupBy={groupBy}
              nestingLevel={nestingLevel + 1}
              handleSelectClick={handleSelectClick}
              isSelected={isSelected}
              multiIsActive={multiIsActive}
              isInAction={isInAction}
            />
          ))}
      </div>
    );
  }
);
