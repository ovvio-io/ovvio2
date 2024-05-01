import React, {
  MouseEventHandler,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import {
  Note,
  NoteType,
} from '../../../../../../../cfds/client/graph/vertices/note.ts';
import {
  usePartialVertex,
  useVertex,
} from '../../../../../core/cfds/react/vertex.ts';
import { useDocumentRouter } from '../../../../../core/react-utils/index.ts';
import { layout, styleguide } from '../../../../../../../styles/index.ts';
import { CheckBox } from '../../../../../../../styles/components/inputs/index.ts';
import { Text } from '../../../../../../../styles/components/texts.tsx';
import {
  makeStyles,
  cn,
} from '../../../../../../../styles/css-objects/index.ts';
import { useTheme } from '../../../../../../../styles/theme.tsx';
import { UISource } from '../../../../../../../logging/client-events.ts';
import { useLogger } from '../../../../../core/cfds/react/logger.tsx';
import { NoteStatus } from '../../../../../../../cfds/base/scheme-types.ts';
import { TaskCheckbox } from '../../../../../../../components/checkbox.tsx';
import { WorkspaceIndicator } from '../../../../../../../components/workspace-indicator.tsx';
import { CardFooter, DueDateIndicator } from '../card-item/card-footer.tsx';
import { PinCell, SelectIconContainer } from '../list-view/table/item.tsx';
import { usePartialView } from '../../../../../core/cfds/react/graph.tsx';
import { IconCollapseExpand } from '../../../../../../../styles/components/new-icons/icon-collapse-expand.tsx';
import { Button } from '../../../../../../../styles/components/buttons.tsx';
import { View } from '../../../../../../../cfds/client/graph/vertices/view.ts';
import CardMenuView from '../../../../../shared/item-menu/index.tsx';
import { VertexId } from '../../../../../../../cfds/client/graph/vertex.ts';
import { Workspace } from '../../../../../../../cfds/client/graph/vertices/workspace.ts';
import { useWorkspaceColor } from '../../../../../shared/workspace-icon/index.tsx';
import { IconMore } from '../../../../../../../styles/components/new-icons/icon-more.tsx';

export enum CardSize {
  Regular = 'regular',
  Small = 'small',
}

const useStyles = makeStyles((theme) => ({
  cardContainer: {
    position: 'relative',
  },
  card: {
    position: 'relative',
    backgroundColor: '#FFF',
    border: '1px solid #FFF',
    cursor: 'pointer',
    padding: styleguide.gridbase,
    boxSizing: 'border-box',
    margin: '1px',
    boxShadow: '0px 0px 4px 0px rgba(151, 132, 97, 0.25)',
    display: 'flex',
    flexDirection: 'column',
    ':hover': {
      border: '1px solid #FBF6EF',
      itemMenu: {
        opacity: 1,
      },
    },
  },
  itemMenuOpen: {
    opacity: 1,
    position: 'relative',
    top: '3px',
  },
  [CardSize.Regular]: {
    preview: {
      paddingRight: styleguide.gridbase * 12,
    },
  },
  [CardSize.Small]: {},
  taskCard: {
    preview: {
      marginLeft: styleguide.gridbase * 4.5,
    },
  },
  header: {
    position: 'relative',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: styleguide.gridbase,
    basedOn: [layout.row],
  },
  menu: {
    opacity: 0,
    transition: `${styleguide.transition.duration.short}ms linear opacity`,
  },
  menuVisible: {
    opacity: 1,
  },
  titleRow: {
    alignItems: 'flex-start',
    basedOn: [layout.row],
    '::before': {},
  },
  titleTextContainer: {
    padding: '0px 8px',
    position: 'relative',
  },
  strikethroughDone: {
    textDecoration: 'line-through',
  },
  status: {
    marginRight: styleguide.gridbase,
    height: styleguide.gridbase * 3,
    width: styleguide.gridbase * 3,
    basedOn: [layout.column, layout.centerCenter],
  },
  titleText: {
    fontSize: 13,
    fontWeight: '400',
    display: 'inline',
    ...styleguide.transition.short,
  },
  preview: {
    marginTop: styleguide.gridbase * 1.25,
    marginLeft: styleguide.gridbase * 4,
    display: 'flex',
  },
  childList: {
    paddingLeft: styleguide.gridbase * 4,
    ...styleguide.transition.short,
    backgroundColor: '#CCE3ED',
  },
  taskCheckbox: {
    marginTop: 2,
    marginRight: styleguide.gridbase,
  },
  taskCheckBoxContainer: {
    display: 'flex',
    alignItems: 'flex-start',
  },
  headerContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardMiddle: {
    padding: '8px 0px 0px 0px',
    display: 'flex',
    alignItems: 'center',
  },
  breadCrumbsTitle: {
    fontSize: '10px',
    color: '#262626',
    position: 'relative',
    top: '1px',
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
  footerAndExpand: {
    display: 'flex',
    width: '100%',
    justifyContent: 'space-between',
    marginTop: styleguide.gridbase * 1.25,
  },
  expanderAndDate: {
    display: 'flex',
    flexGrow: 2,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexDirection: 'column',
  },
  workspaceIndicator: {
    // maxWidth: styleguide.gridbase * 12,
  },
  RightHoverMoreButton: {
    position: 'absolute',
    top: '8px',
    right: '-15px',
  },
  cardTab: {
    height: styleguide.gridbase * 3,
    width: styleguide.gridbase * 2,
    flexShrink: 0,
    basedOn: [layout.row],
  },
  cardMoreTabSelected: {
    cardMoreTab: {
      backgroundColor: 'var(--ws-background)',
    },
  },
  cardMoreTab: {
    cursor: 'pointer',
    userSelect: 'none',
    height: '100%',
    width: '100%',
    borderBottomRightRadius: styleguide.gridbase * 2,
    borderTopRightRadius: styleguide.gridbase * 2,
    maxWidth: styleguide.gridbase * 20.5,
    paddingLeft: styleguide.gridbase * 0.5,
    paddingRight: styleguide.gridbase * 0.5,
    boxSizing: 'border-box',
    alignItems: 'center',
    whiteSpace: 'nowrap',
  },
  SelectIconContainerzIndex: {
    zIndex: 0,
  },
  selectedRow: {
    backgroundColor: '#F5F9FB',
    border: '1px solid #CCE3ED',
    hover: 'none',
  },
  InAction: {
    backgroundColor: '#FBEAC8',
  },
  multiIsActive: {
    pointerEvents: 'none',
  },
}));

function CardHeader({
  card,
  showWorkspaceOnCard,
}: {
  card: VertexManager<Note>;
  showWorkspaceOnCard?: boolean;
}) {
  const styles = useStyles();
  const pCard = usePartialVertex(card, ['type', 'workspace', 'titlePlaintext']);
  const note = useVertex(card);
  const isTask = pCard.type === NoteType.Task;

  return (
    <div className={styles.cardMiddle}>
      {showWorkspaceOnCard && (
        <WorkspaceIndicator
          className={cn(styles.workspaceIndicator)}
          workspace={pCard.workspace.manager}
          ofSettings={false}
        />
      )}
      {isTask && (
        <>
          {note.parentNote && (
            <>
              <span className={cn(styles.breadCrumbsSlash)}>/</span>
              <Text className={cn(styles.breadCrumbsTitle)}>
                {note.parentNote.titlePlaintext}
              </Text>
            </>
          )}
        </>
      )}
      <div className={cn(layout.flexSpacer)} />
    </div>
  );
}

export function StatusCheckbox({
  card,
  source,
}: {
  card: VertexManager<Note>;
  source: UISource;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const logger = useLogger();
  const pCard = usePartialVertex(card, [
    'tags',
    'workspace',
    'type',
    'isChecked',
  ]);
  if (pCard.type !== NoteType.Task || !pCard.isChecked) {
    return <div className={cn(styles.status)} />;
  }

  const onChange = useCallback(() => {
    pCard.isChecked = !pCard.isChecked;
    logger.log({
      severity: 'EVENT',
      event: 'MetadataChanged',
      type: 'status',
      vertex: pCard.key,
      status: pCard.isChecked ? NoteStatus.Checked : NoteStatus.Unchecked,
      source,
    });
  }, [pCard, logger, source, pCard.isChecked]);

  return (
    <div className={cn(styles.status)}>
      <CheckBox
        color={theme.background.text}
        checked={pCard.isChecked}
        onChange={onChange}
        name="status"
      />
    </div>
  );
}
const CollapseExpanderToggle = ({
  isExpanded,
  toggleExpanded,
}: {
  isExpanded: boolean;
  toggleExpanded: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) => {
  return (
    <Button onClick={toggleExpanded}>
      <IconCollapseExpand on={isExpanded} />
    </Button>
  );
};

const calculateIsExpanded = (
  card: VertexManager<Note>,
  view: Pick<View, 'notesExpandOverride' | 'notesExpandBase'>
) => {
  const hasOverride = view.notesExpandOverride.has(card.key);

  return (
    (view.notesExpandBase && !hasOverride) ||
    (!view.notesExpandBase && hasOverride)
  );
};

export interface MoreButtonCardProps {
  workspace: VertexId<Workspace>;
  children: ReactNode;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}
export function MoreButtonCard({
  workspace,
  children,
  onClick,
}: MoreButtonCardProps) {
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
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onClick;
  };
  return (
    <div
      className={cn(
        styles.cardTab,
        styles.cardMoreTabSelected,
        styles.RightHoverMoreButton
      )}
      style={style}
      onClick={handleClick}
    >
      <div className={cn(styles.cardMoreTab)}>{children}</div>
    </div>
  );
}

const CardMenu = ({
  card,
  isMouseOver,
}: {
  card: VertexManager<Note>;
  isMouseOver?: boolean;
}) => {
  const pCard = usePartialVertex(card, ['workspace']);
  const cardWs = pCard.workspace.manager;
  const colorWs = useWorkspaceColor(cardWs);
  const [menuOpen, setMenuOpen] = useState(false);
  const styles = useStyles();

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const renderButton = useCallback(
    ({ isOpen }: { isOpen: boolean }) => (
      <div className={styles.itemMenuOpen}>
        <IconMore color={colorWs.active} />
      </div>
    ),
    []
  );
  return (
    <MoreButtonCard workspace={cardWs}>
      <CardMenuView
        visible={isMouseOver}
        cardManager={card}
        source="board"
        isOpen={menuOpen}
        toggleMenu={toggleMenu}
        renderButton={renderButton}
      />
    </MoreButtonCard>
  );
};

interface ChildCardProps {
  card: VertexManager<Note>;
  index: number;
  size: CardSize;
  isVisible: boolean;
  isSelected: boolean;
  isInAction: boolean;
  multiIsActive: boolean;
}

function ChildCard({
  card,
  size,
  isSelected,
  isInAction,
  multiIsActive,
}: ChildCardProps) {
  const styles = useStyles();

  return (
    <KanbanCard
      size={size}
      card={card}
      className={cn()}
      handleSelectClick={() => {}}
      multiIsActive={multiIsActive}
      isSelected={isSelected}
      isInAction={isInAction}
      isChild={true}
    />
  );
}

export interface KanbanCardProps {
  card: VertexManager<Note>;
  size: CardSize;
  showChildCards?: boolean;
  className?: string;
  showWorkspaceOnCard?: boolean;
  handleSelectClick: (card: Note) => void;
  isSelected: boolean;
  multiIsActive: boolean;
  isInAction: boolean;
  isChild?: boolean;
}

export const KanbanCard = React.forwardRef(function CardItemView(
  {
    card,
    className,
    size,
    showWorkspaceOnCard,
    isSelected,
    multiIsActive,
    isInAction,
    isChild,
    handleSelectClick,
  }: KanbanCardProps,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const styles = useStyles();
  const childListRef = useRef(null);
  const documentRouter = useDocumentRouter();
  const pCard = usePartialVertex(card, [
    'childCards',
    'tags',
    'type',
    'isChecked',
    'titlePlaintext',
  ]);

  const { childCards } = pCard;
  const view = usePartialView('notesExpandOverride', 'notesExpandBase');
  const source: UISource = 'board';
  const isTask = pCard.type === NoteType.Task;
  const isDone = pCard.isChecked;
  const logger = useLogger();
  const [isMouseOver, setIsMouseOver] = useState(false);
  const onMouseOver = useCallback(() => setIsMouseOver(true), []);
  const onMouseLeave = useCallback(() => setIsMouseOver(false), []);
  const hasOverride = view.notesExpandOverride.has(card.key);
  const { dueDate } = usePartialVertex(card, ['dueDate']);
  const { workspace } = usePartialVertex(card, ['workspace']);

  const [expanded, setExpanded] = useState(() =>
    calculateIsExpanded(card, view)
  );

  useEffect(() => {
    setExpanded(calculateIsExpanded(card, view));
  }, [card, view]);

  const toggleExpanded: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation();
    view.setNoteExpandOverride(card.key, !hasOverride);
    setExpanded((x) => !x);
  };

  const onClick = useCallback(() => {
    documentRouter.goTo(card);
    logger.log({
      severity: 'EVENT',
      event: 'Navigation',
      type: 'open',
      source,
      destination: 'editor',
      vertex: card.key,
    });
  }, [card, documentRouter, logger, source]);

  const handleSelectInMulti: MouseEventHandler<HTMLDivElement> = (e) => {
    if (multiIsActive) {
      e.stopPropagation();
      handleSelectClick(card.vertex);
    }
  };
  return (
    <div
      className={cn(
        styles.cardContainer,
        multiIsActive && !isSelected && styles.hoverableRow,
        className
      )}
      ref={ref}
      onMouseEnter={onMouseOver}
      onMouseLeave={onMouseLeave}
      onClick={handleSelectInMulti}
    >
      {(isMouseOver || isSelected) && !isChild && (
        <SelectIconContainer
          className={styles.SelectIconContainerzIndex}
          workspace={workspace.manager}
          isSelected={isSelected}
          handleSelectClick={handleSelectClick}
          cardKey={card.key}
        />
      )}
      {isMouseOver && !multiIsActive && (
        <CardMenu card={card} isMouseOver={isMouseOver} />
      )}
      <div className={cn(multiIsActive && styles.multiIsActive)}>
        <div
          className={cn(
            styles.card,
            isInAction && isSelected && styles.InAction,
            isSelected ? styles.selectedRow : styles.hoverableRow
          )}
          onClick={onClick}
        >
          <div className={cn(styles.headerContainer)}>
            <div className={cn(styles.taskCheckBoxContainer)}>
              {isTask ? (
                <TaskCheckbox task={card} className={cn(styles.taskCheckbox)} />
              ) : (
                <img
                  key="NoteIconBoard"
                  src="/icons/board/Note.svg"
                  className={cn(styles.taskCheckbox)}
                />
              )}
              <div className={cn(styles.titleTextContainer)}>
                {pCard.titlePlaintext.split(' ').map((word, index) => (
                  <Text
                    key={index}
                    className={cn(
                      styles.titleText,
                      isDone && styles.strikethroughDone
                    )}
                  >
                    {word}{' '}
                  </Text>
                ))}
              </div>
            </div>
            {!multiIsActive && (
              <PinCell isChild={false} note={card} isMouseOver={isMouseOver} />
            )}
          </div>
          <CardHeader card={card} showWorkspaceOnCard={showWorkspaceOnCard} />
          <div className={cn(styles.footerAndExpand)}>
            <CardFooter
              isExpanded={isMouseOver}
              size={size}
              card={card}
              source={source}
              multiIsActive={multiIsActive}
            />
            <div className={cn(styles.expanderAndDate)}>
              {childCards.length > 0 ? (
                <CollapseExpanderToggle
                  isExpanded={expanded}
                  toggleExpanded={toggleExpanded}
                />
              ) : (
                <div></div>
              )}
              <DueDateIndicator
                card={card}
                source={source}
                isMouseOver={isMouseOver}
              />
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className={cn(styles.childList)} ref={childListRef}>
          {childCards.map((child, index) => (
            <ChildCard
              size={size}
              key={child.key}
              card={child.manager as VertexManager<Note>}
              index={index}
              isVisible={expanded}
              isSelected={isSelected}
              isInAction={isInAction}
              multiIsActive={multiIsActive}
            />
          ))}
        </div>
      )}
    </div>
  );
});
