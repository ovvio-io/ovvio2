import React, {
  CSSProperties,
  KeyboardEventHandler,
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
import { TaskCheckbox } from '../../../../../../../../components/task.tsx';
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
  useVertex,
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
    position: 'relative',
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
  },
  title: {
    // basedOn: [layout.flexSpacer],
    flexGrow: '1',
    flexShrink: '2',
    flexBasis: 'auto',
    width: 'calc(50% - 176px)',
    cursor: 'pointer',
    position: 'relative',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    paddingLeft: styleguide.gridbase * 0.5,
  },
  wsColumn: {
    width: 'calc(25% - 176px)',
    basedOn: [layout.row],
    flexGrow: '1',
    flexShrink: '1',
    flexBasis: 'auto',
    alignItems: 'center',
    padding: [0, styleguide.gridbase * 0.5],
  },
  assigneeColumn: {
    width: 'calc(5% - 176px)',
    // basedOn: [layout.flexSpacer],
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
  tagsColumn: {
    width: 'calc(20% - 176px)',
    flexGrow: '2',
    flexShrink: '1',
    flexBasis: 'auto',
    overflow: 'clip',
    display: 'flex',
    justifyContent: 'flex-end',
    padding: [0, styleguide.gridbase],
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
}));

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
  const containerRef = useRef<HTMLDivElement>(null);
  const tagsRef = useRef(new Map());
  const [visibleTags, setVisibleTags] = useState<VertexManager<Tag>[]>([]);
  const [hiddenTags, setHiddenTags] = useState<VertexManager<Tag>[]>([]);
  const [overflow, setOverflow] = useState(false);
  const { tags } = usePartialVertex(note, ['tags']);

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

  useLayoutEffect(() => {
    recalculateTagVisibility();
  });

  const recalculateTagVisibility = () => {
    const containerWidth =
      containerRef.current?.getBoundingClientRect().width || 0;
    let cumulativeWidth = 0;
    const updatedVisibleTags: VertexManager<Tag>[] = [];
    const updatedHiddenTags: VertexManager<Tag>[] = [];
    let hasOverflow = false;
    managers.forEach((manager) => {
      const tagElement = tagsRef.current.get(manager);
      const tagWidth = tagElement?.getBoundingClientRect().width || 0;
      if (cumulativeWidth + tagWidth <= containerWidth) {
        cumulativeWidth += tagWidth;
        updatedVisibleTags.push(manager);
        if (tagElement) tagElement.style.visibility = 'visible';
      } else {
        updatedHiddenTags.push(manager);
        hasOverflow = true;
        if (tagElement) tagElement.style.visibility = 'hidden';
      }

      if (containerRef.current) {
        containerRef.current.style.overflow = hasOverflow ? 'clip' : 'visible';
      }
    });

    if (!coreValueEquals(updatedVisibleTags, visibleTags)) {
      // if (updatedVisibleTags !== visibleTags)
      setVisibleTags(updatedVisibleTags);
    }
    if (!coreValueEquals(updatedVisibleTags, visibleTags)) {
      setHiddenTags(updatedHiddenTags);
      setOverflow(hasOverflow);
    }
  };

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      recalculateTagVisibility();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, []);

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
      {visibleTags.map((tag, index) => (
        <div ref={(el) => tagsRef.current.set(tag, el)} key={index}>
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
      {overflow && (
        <Tooltip
          text={hiddenTags.map((tag) => tag.getVertexProxy().name).join(', ')}
          position="top"
          align="center"
        >
          <TagPillView className={cn(styles.tag)} />
        </Tooltip>
      )}

      <TagButton
        onTagged={onTag}
        className={cn(styles.visibleOnHover)}
        noteId={note}
      />
    </div>
  );
};

// const recalculateTagVisibility = () => {
//   const containerWidth =
//     containerRef.current?.getBoundingClientRect().width || 0;
//   let cumulativeWidth = 0;
//   const updatedVisibleTags: VertexManager<Tag>[] = [];
//   const updatedHiddenTags: VertexManager<Tag>[] = [];
//   let hasOverflow = false;
//   managers.forEach((manager, index) => {
//     const tagElement = tagsRef.current.get(manager);

//     const tagWidth =
//       tagsRef.current.get(manager)?.getBoundingClientRect().width || 0;
//     debugger;

//     if (cumulativeWidth + tagWidth <= containerWidth) {
//       cumulativeWidth += tagWidth;
//       updatedVisibleTags.push(manager);
//       if (tagElement) tagElement.style.visibility = 'visible';
//     } else {
//       updatedHiddenTags.push(manager);
//       hasOverflow = true;
//       if (tagElement) tagElement.style.visibility = 'hidden';
//     }
//   });
//   setOverflow(hasOverflow);
//   setVisibleTags(updatedVisibleTags);
//   setHiddenTags(updatedHiddenTags);
// };

// useLayoutEffect(() => {
//   const updateTagsDisplay = () => {
//     const containerWidth = containerRef.current.offsetWidth;
//     let availableWidth = containerWidth;
//     const updatedVisibleTags: VertexManager<Tag>[] = [];
//     const updatedHiddenTags: VertexManager<Tag>[] = [];
//     managers.forEach((tag) => {
//       const tagWidth = tagsRef.current.get(tag)?.offsetWidth || 0;
//       if (availableWidth >= tagWidth) {
//         updatedVisibleTags.push(tag);
//         availableWidth -= tagWidth;
//       } else {
//         updatedHiddenTags.push(tag);
//       }
//     });
//     setVisibleTags(updatedVisibleTags);
//     setHiddenTags(updatedHiddenTags);
//     setOverflow(updatedHiddenTags.length > 0);
//   };

//   const resizeObserver = new ResizeObserver(() => {
//     updateTagsDisplay();
//   });
//   if (containerRef.current) {
//     resizeObserver.observe(containerRef.current);
//   }

//   return () => resizeObserver.disconnect();
// }, [managers]);

const TagsCellCore = ({ note }: { note: VertexManager<Note> }) => {
  const styles = useStyles();
  const [containerWidth, setContainerWidth] = useState(0);
  const [visibleTags, setVisibleTags] = useState<VertexManager<Tag>[]>([]);
  const [hiddenTags, setHiddenTags] = useState<VertexManager<Tag>[]>([]);
  const [overflow, setOverflow] = useState(false);

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
  const containerRef = useRef<HTMLDivElement>(null);
  const lastWidthRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const calculateVisibleTags = () => {
      let availableWidth = containerWidth;
      const updatedVisibleTags = [];
      const updatedHiddenTags = [];
      let hasOverflow = false;
      const tagWidth = 60;

      for (const tag of managers) {
        if (availableWidth >= tagWidth) {
          updatedVisibleTags.push(tag);
          availableWidth -= tagWidth;
        } else {
          updatedHiddenTags.push(tag);
          hasOverflow = true;
        }
      }
      setVisibleTags(updatedVisibleTags);
      setHiddenTags(updatedHiddenTags);
      setOverflow(hasOverflow);
    };
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const newWidth = entry.contentRect.width;
        if (lastWidthRef.current !== newWidth) {
          setContainerWidth(newWidth);
          lastWidthRef.current = newWidth;
          calculateVisibleTags();
        }
      }
    });

    if (containerRef.current) {
      const initialWidth = containerRef.current.offsetWidth;
      if (lastWidthRef.current !== initialWidth) {
        setContainerWidth(initialWidth);
        lastWidthRef.current = initialWidth;
      }
      resizeObserver.observe(containerRef.current);
    }
    return () => {
      resizeObserver.disconnect();
    };
  }, [managers]);

  const hiddenTagsText = hiddenTags
    .map((tag) => tag.getVertexProxy().name)
    .join(', ');

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
    <div ref={containerRef} className={cn(styles.tagsColumn)}>
      {visibleTags.map((x) => (
        <TagView
          className={cn(styles.tag)}
          showMenu="hover"
          key={x.key}
          tag={x}
          onSelected={onTag}
          onDelete={onDelete}
        />
      ))}
      {overflow && (
        <Tooltip text={hiddenTagsText} position="top" align="center">
          <div className={cn(styles.tag, styles.tagName)}>...</div>
        </Tooltip>
      )}

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
  onClick?: (note: VertexManager<Note>) => void;
  isChild?: boolean;
  groupBy?: string;
  nestingLevel: number;
}

export const ItemRow = React.forwardRef<HTMLTableRowElement, ItemRowProps>(
  function (
    { groupBy, note, isChild, onClick = () => {}, nestingLevel, attributes },
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
    return (
      <React.Fragment>
        <div className={cn(isChild ? styles.isChild : undefined)}>
          <div
            className={cn(
              isChild ? styles.childRow : styles.row,
              styles.itemRow,
              styles.hoverableRow
            )}
            style={{
              width: isChild ? childWidth : undefined,
              left: isChild ? leftIndentation : undefined,
            }}
            ref={ref}
            onMouseOver={onMouseOver}
            onMouseLeave={onMouseLeave}
          >
            {isChild ? (
              <React.Fragment>
                <TypeCell note={note} />
                <TitleCell note={note} onClick={onClickImpl} />
                <div className={cn(styles.wsColumn)} style={{ left: '2px' }} />
              </React.Fragment>
            ) : (
              <React.Fragment>
                <TypeCell note={note} />
                <TitleCell note={note} onClick={onClickImpl} />
                <WorkspaceIndicatorCell
                  note={note}
                  groupBy={groupBy}
                  nestingLevel={nestingLevel}
                />
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
              source={'list'}
              isMouseOver={isMouseOver}
            />
            <PinCell isChild={isChild} note={note} isMouseOver={isMouseOver} />
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
            />
          ))}
      </React.Fragment>
    );
  }
);
