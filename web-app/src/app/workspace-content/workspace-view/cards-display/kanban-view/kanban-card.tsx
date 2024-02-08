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
import { useAnimateHeight } from '../../../../../core/react-utils/animate.ts';
import { layout, styleguide } from '../../../../../../../styles/index.ts';
import { CheckBox } from '../../../../../../../styles/components/inputs/index.ts';
import { Text } from '../../../../../../../styles/components/texts.tsx'; //TODO: check
import {
  makeStyles,
  cn,
} from '../../../../../../../styles/css-objects/index.ts';
import { useTheme } from '../../../../../../../styles/theme.tsx';
import { UISource } from '../../../../../../../logging/client-events.ts';
import { useLogger } from '../../../../../core/cfds/react/logger.tsx';
import { NoteStatus } from '../../../../../../../cfds/base/scheme-types.ts';
import { TaskCheckbox } from '../../../../../../../components/task.tsx';
import { WorkspaceIndicator } from '../../../../../../../components/workspace-indicator.tsx';
import { CardFooter, DueDateIndicator } from '../card-item/card-footer.tsx';
import { PinCell } from '../list-view/table/item.tsx';
import { usePartialView } from '../../../../../core/cfds/react/graph.tsx';
import { IconCollapseExpand } from '../../../../../../../styles/components/new-icons/icon-collapse-expand.tsx';
import { Button } from '../../../../../../../styles/components/buttons.tsx';
import { View } from '../../../../../../../cfds/client/graph/vertices/view.ts';
import CardMenuView from '../../../../../shared/item-menu/index.tsx';
import { VertexId } from '../../../../../../../cfds/client/graph/vertex.ts';
import { Workspace } from '../../../../../../../cfds/client/graph/vertices/workspace.ts';
import { useWorkspaceColor } from '../../../../../shared/workspace-icon/index.tsx';
import { IconMore } from '../../../../../../../styles/components/new-icons/icon-more.tsx';
import Tooltip from '../../../../../../../styles/components/tooltip/index.tsx';

const TITLE_LINE_HEIGHT = styleguide.gridbase * 3;

export enum CardSize {
  Regular = 'regular',
  Small = 'small',
}

const useStyles = makeStyles((theme) => ({
  cardContainer: {
    position: 'relative',
  },

  card: {
    backgroundColor: '#FFF',
    cursor: 'pointer',
    padding: styleguide.gridbase,
    boxSizing: 'border-box',
    margin: '1px',
    boxShadow: '0px 0px 4px 0px rgba(151, 132, 97, 0.25)',
    display: 'flex',
    flexDirection: 'column',
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
    padding: [0, styleguide.gridbase * 0],
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
    transitionProperty: 'height',
    paddingBottom: '4px',
  },
  hide: {
    overflow: 'hidden',
  },
  child: {
    margin: [styleguide.gridbase * 2, 0],
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
  },
  cardMiddle: {
    padding: [styleguide.gridbase, 0, 0, 0],
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
    justifyContent: 'space-between',
  },
  expanderAndDate: {
    display: 'flex',
    justifyContent: 'space-between',
    flexDirection: 'Column',
    alignItems: 'flex-end',
  },

  RightHoverMoreButton: {
    position: 'absolute',
    top: '8px',
    right: '-15px',
  },

  listItem: {
    height: styleguide.gridbase * 3,
    width: styleguide.gridbase * 2,
    flexShrink: 0,
    basedOn: [layout.row],
  },
  listItemSelected: {
    itemTab: {
      backgroundColor: 'var(--ws-background)',
    },
  },
  itemTab: {
    cursor: 'pointer',
    userSelect: 'none',
    height: '100%',
    width: '100%',
    // minWidth: styleguide.gridbase * 18.5,
    borderBottomRightRadius: styleguide.gridbase * 2,
    borderTopRightRadius: styleguide.gridbase * 2,
    maxWidth: styleguide.gridbase * 20.5,
    paddingLeft: styleguide.gridbase * 0.5,
    paddingRight: styleguide.gridbase * 0.5,
    boxSizing: 'border-box',
    alignItems: 'center',
    whiteSpace: 'nowrap',
    // basedOn: [layout.row],
  },
  itemToggle: {
    marginLeft: styleguide.gridbase * 0.5,
    height: styleguide.gridbase * 2,
    width: styleguide.gridbase * 2,
    borderRadius: styleguide.gridbase,
    flexShrink: 0,
    background: 'var(--ws-inactive)',
    basedOn: [layout.column, layout.centerCenter],
  },
}));

export interface CardHeaderPartProps extends KanbanCardProps {
  isExpanded?: boolean;
  source: UISource;
  hideMenu?: boolean;
}

export function CardHeader({ card, showWorkspaceOnCard }: CardHeaderPartProps) {
  const styles = useStyles();
  const pCard = usePartialVertex(card, ['type', 'workspace', 'titlePlaintext']);
  const note = useVertex(card);
  const isTask = pCard.type === NoteType.Task;

  return (
    <div className={styles.cardMiddle}>
      {showWorkspaceOnCard && (
        <WorkspaceIndicator workspace={pCard.workspace.manager} />
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
const CollapseExpanderToggle = ({ isExpanded }: { isExpanded: boolean }) => {
  return (
    <Button>
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

export interface KanbanCardProps {
  card: VertexManager<Note>;
  size: CardSize;
  showChildCards?: boolean;
  className?: string;
  showWorkspaceOnCard?: boolean;
}

export const KanbanCard = React.forwardRef(function CardItemView(
  { card, className, size, showWorkspaceOnCard, ...rest }: KanbanCardProps,
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

  const [expanded, setExpanded] = useState(() =>
    calculateIsExpanded(card, view)
  );

  useEffect(() => {
    setExpanded(calculateIsExpanded(card, view));
  }, [card, view]);

  const style = useAnimateHeight(childListRef, expanded);
  const isTask = pCard.type === NoteType.Task;
  const isDone = pCard.isChecked;
  const logger = useLogger();
  const [isMouseOver, setIsMouseOver] = useState(false);
  const onMouseOver = useCallback(() => setIsMouseOver(true), []);
  const onMouseLeave = useCallback(() => setIsMouseOver(false), []);
  const hasOverride = view.notesExpandOverride.has(card.key);
  const { dueDate } = usePartialVertex(card, ['dueDate']);

  const source: UISource = 'board';

  const handleExpandCard: MouseEventHandler = (e) => {
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

  return (
    <div className={cn(styles.cardContainer, className)} ref={ref} {...rest}>
      <div
        className={cn(
          styles.card,
          isTask && styles.taskCard,
          styles[size],
          styles.hoverableRow
        )}
        onMouseEnter={onMouseOver}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      >
        {isMouseOver && (
          <div className={cn(styles.RightHoverMoreButton)}>
            <CardMenu card={card} isMouseOver={isMouseOver} />
          </div>
        )}
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
                    isDone && isTask && styles.strikethroughDone
                  )}
                >
                  {word}{' '}
                </Text>
              ))}
            </div>
          </div>
          <PinCell isChild={false} note={card} isMouseOver={isMouseOver} />
        </div>
        <CardHeader
          size={size}
          card={card}
          isExpanded={isMouseOver}
          source={source}
          showWorkspaceOnCard={showWorkspaceOnCard}
        />
        <div className={cn(styles.preview)} />
        <div className={cn(styles.footerAndExpand)}>
          <CardFooter
            isExpanded={isMouseOver}
            size={size}
            card={card}
            source={source}
          />
          <div className={cn(styles.expanderAndDate)}>
            {!!childCards.length && (
              <div onClick={(e) => handleExpandCard(e)}>
                <CollapseExpanderToggle isExpanded={expanded} />
              </div>
            )}
            {childCards.length == 0 && <div></div>}
            {dueDate && <DueDateIndicator card={card} source={source} />}
          </div>
        </div>
      </div>
      <div
        className={cn(styles.childList, !expanded && styles.hide)}
        ref={childListRef}
        style={style}
      >
        {expanded &&
          childCards.map((child, index) => (
            <ChildCard
              size={size}
              key={child.key}
              card={child.manager as VertexManager<Note>}
              index={index}
              isVisible={expanded}
            />
          ))}
      </div>
    </div>
  );
});

interface ChildCardProps {
  card: VertexManager<Note>;
  index: number;
  size: CardSize;
  isVisible: boolean;
}

function ChildCard({ card, size, index, isVisible }: ChildCardProps) {
  const styles = useStyles();

  return <KanbanCard size={size} card={card} className={cn(styles.child)} />;
}

export interface MoreButtonCardProps {
  workspace: VertexId<Workspace>;
  children: ReactNode;
}
export function MoreButtonCard({ workspace, children }: MoreButtonCardProps) {
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
  return (
    <div className={cn(styles.listItem, styles.listItemSelected)} style={style}>
      <Tooltip text={'name'} disabled={true} position="right">
        <div className={cn(styles.itemTab)}>{children}</div>
      </Tooltip>
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
  const styles = useStyles();
  const pCard = usePartialVertex(card, ['workspace']);
  const cardWs = pCard.workspace.manager;
  const colorWs = useWorkspaceColor(cardWs);

  return (
    <MoreButtonCard workspace={cardWs}>
      <CardMenuView
        visible={isMouseOver}
        cardManager={card}
        source="board"
        colorWs={colorWs.inactive}
      />
    </MoreButtonCard>
  );
};
