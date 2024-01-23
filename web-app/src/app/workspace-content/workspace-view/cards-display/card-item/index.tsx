import React, { useCallback, useRef, useState } from 'react';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import {
  Note,
  NoteType,
} from '../../../../../../../cfds/client/graph/vertices/note.ts';
import { usePartialVertex } from '../../../../../core/cfds/react/vertex.ts';
import { useDocumentRouter } from '../../../../../core/react-utils/index.ts';
import { useAnimateHeight } from '../../../../../core/react-utils/animate.ts';
import CardMenuView from '../../../../../shared/item-menu/index.tsx';
import AssigneesView from '../../../../../shared/card/assignees-view.tsx';
import { layout, styleguide } from '../../../../../../../styles/index.ts';
import { IconExpander } from '../../../../../../../styles/components/icons/index.ts';
import { CheckBox } from '../../../../../../../styles/components/inputs/index.ts';
// import { Text } from '../../../../../../../styles/components/texts.tsx'; //TODO: check
import { Text } from '../../../../../../../styles/components/typography.tsx';
import {
  makeStyles,
  cn,
} from '../../../../../../../styles/css-objects/index.ts';
import { useTheme } from '../../../../../../../styles/theme.tsx';
import { CardFooter } from './card-footer.tsx';
import { CardTags } from './card-tag-view.tsx';
import { CardWorkspaceIndicator } from './workspace-indicator.tsx';
import { UISource } from '../../../../../../../logging/client-events.ts';
import { useLogger } from '../../../../../core/cfds/react/logger.tsx';
import { NoteStatus } from '../../../../../../../cfds/base/scheme-types.ts';
import { TaskCheckbox } from '../../../../../../../components/task.tsx';

const TITLE_LINE_HEIGHT = styleguide.gridbase * 3;

export enum CardSize {
  Regular = 'regular',
  Small = 'small',
}

function getStrikethroughSVG(fill: string) {
  return encodeURIComponent(
    `
  <svg xmlns='http://www.w3.org/2000/svg' 
    width='${TITLE_LINE_HEIGHT}' 
    height='${TITLE_LINE_HEIGHT}'
    viewBox='0 0 ${TITLE_LINE_HEIGHT} ${TITLE_LINE_HEIGHT}'>
    <line x1='0' y1='${TITLE_LINE_HEIGHT / 2}' x2='${TITLE_LINE_HEIGHT}' y2='${
      TITLE_LINE_HEIGHT / 2
    }' stroke='${fill}'/>
  </svg>
  `.replace(/\n/g, ''),
  );
}

const useStyles = makeStyles((theme) => ({
  cardContainer: {
    position: 'relative',
  },
  expander: {
    position: 'absolute',
    cursor: 'pointer',
    top: styleguide.gridbase,
    left: 0,
    transform: `translateX(calc(-100% - ${styleguide.gridbase * 0.5}px))`,
  },
  expanderIcon: {
    ...styleguide.transition.short,
    transitionProperty: 'transform',
    transform: 'rotate(0)',
  },
  expanderIconExpanded: {
    transform: 'rotate(180deg)',
  },
  card: {
    backgroundColor: theme.background[0],
    cursor: 'pointer',
    padding: styleguide.gridbase,
    boxSizing: 'border-box',
    boxShadow: theme.shadows.z2,
    borderRadius: 6,
    basedOn: [layout.column],
  },
  [CardSize.Regular]: {
    preview: {
      paddingRight: styleguide.gridbase * 12,
    },
  },
  [CardSize.Small]: {},
  taskCard: {
    preview: {
      // marginLeft: styleguide.gridbase * 4.5,
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
  },
  titleTextContainer: {
    // padding: [0, styleguide.gridbase * 0],
    position: 'relative',
  },
  strikethrough: {
    width: '100%',
    position: 'absolute',
    left: '0',
    top: '0',
    height: '100%',
    // height: 1,
    // top: '50%',
    // backgroundColor: theme.background.text,
    ...styleguide.transition.short,
    transitionProperty: 'transform',
    transform: 'scale(0)',
    transformOrigin: 'left center',
    backgroundImage: `url("data:image/svg+xml;utf8,${getStrikethroughSVG(
      theme.background.text,
    )}")`,
  },
  strikethroughDone: {
    transform: 'scale(1)',
  },
  checkboxPlaceholder: {
    width: styleguide.gridbase * 3,
    height: styleguide.gridbase * 3,
  },
  status: {
    marginRight: styleguide.gridbase,
    height: styleguide.gridbase * 3,
    width: styleguide.gridbase * 3,
    basedOn: [layout.column, layout.centerCenter],
  },
  titleText: {
    fontSize: 16,
    lineHeight: `${TITLE_LINE_HEIGHT}px`,
  },
  preview: {
    marginTop: styleguide.gridbase * 1.25,
    marginLeft: styleguide.gridbase * 4,
  },
  childList: {
    paddingLeft: styleguide.gridbase * 4,
    ...styleguide.transition.short,
    transitionProperty: 'height',
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
}));

interface TitleElementProps {
  className?: string;
}

const TitleNode = React.forwardRef(
  (
    { className, ...props }: TitleElementProps,
    ref: React.ForwardedRef<HTMLSpanElement>,
  ) => {
    const styles = useStyles();
    return (
      <Text ref={ref} className={cn(styles.titleText, className)} {...props} />
    );
  },
);

function Title({
  card,
  source,
}: {
  card: VertexManager<Note>;
  source: UISource;
}) {
  const styles = useStyles();
  const { titlePlaintext } = usePartialVertex(card, ['titlePlaintext']);

  return (
    <div>
      <Text className={cn(styles.titleText)}>{titlePlaintext}</Text>
    </div>
  );
}

export interface CardHeaderPartProps extends CardItemProps {
  isExpanded: boolean;
  source: UISource;
  hideMenu?: boolean;
}

export function CardHeader({
  card,
  className,
  isExpanded,
  source,
  hideMenu,
  size,
}: CardHeaderPartProps) {
  const styles = useStyles();
  return (
    <div className={className}>
      <div className={cn(styles.header)}>
        <CardWorkspaceIndicator
          card={card}
          source={source}
          isExpanded={isExpanded}
        />
        {size === CardSize.Regular && (
          <CardTags
            size={size}
            card={card}
            isExpanded={isExpanded}
            source={source}
          />
        )}
        <div className={cn(layout.flexSpacer)} />
        <AssigneesView
          cardManager={card}
          cardType="small"
          source={source}
          isExpanded={isExpanded}
        />
        {!hideMenu && (
          <CardMenuView
            cardManager={card}
            allowsEdit={true}
            source={source}
            className={cn(styles.menu, isExpanded && styles.menuVisible)}
          />
        )}
      </div>
      {size === CardSize.Small && (
        <CardTags
          size={size}
          card={card}
          isExpanded={isExpanded}
          source={source}
        />
      )}
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
    return <div className={cn(styles.checkboxPlaceholder, styles.status)} />;
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

export interface CardItemProps {
  card: VertexManager<Note>;
  size: CardSize;
  showChildCards?: boolean;
  className?: string;
  style?: {};
}

export const CardItem = React.forwardRef(function CardItemView(
  { card, className, showChildCards, size, ...rest }: CardItemProps,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  const styles = useStyles();
  const childListRef = useRef(null);
  const documentRouter = useDocumentRouter();
  const pCard = usePartialVertex(card, [
    'childCards',
    'tags',
    'type',
    'isChecked',
  ]);
  const { childCards } = pCard;
  const [expanded, setExpanded] = useState(false);
  const style = useAnimateHeight(childListRef, expanded);
  const [isInHover, setIsInHover] = useState(false);
  const isTask = pCard.type === NoteType.Task;
  const isDone = pCard.isChecked;
  const logger = useLogger();

  const onMouseEnter = useCallback(() => {
    setIsInHover(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    setIsInHover(false);
  }, []);

  const source: UISource = 'list';

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
    <div
      className={cn(styles.cardContainer, className)}
      ref={ref}
      // style={style}

      {...rest}
    >
      <div
        className={cn(styles.card, isTask && styles.taskCard, styles[size])}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      >
        <CardHeader
          size={size}
          card={card}
          isExpanded={isInHover}
          source={source}
        />
        <div className={cn(styles.titleRow)}>
          {/* <StatusCheckbox source={source} card={card} /> */}
          <TaskCheckbox task={card} className={cn(styles.taskCheckbox)} />
          <div className={cn(styles.titleTextContainer)}>
            <Title source={source} card={card} />
            <div
              className={cn(
                styles.strikethrough,
                isDone && styles.strikethroughDone,
              )}
            />
          </div>
        </div>
        {/* {size === CardSize.Regular ? (
          <BodyPreview card={card} className={cn(styles.preview)} />
        ) : ( */}
        <div className={cn(styles.preview)} />
        {/* )} */}
        <CardFooter size={size} card={card} source={source} />
      </div>
      {showChildCards && !!childCards.length && (
        <div
          className={cn(styles.expander)}
          onClick={() => setExpanded((x) => !x)}
        >
          <IconExpander
            className={cn(
              styles.expanderIcon,
              expanded && styles.expanderIconExpanded,
            )}
          />
        </div>
      )}
      {showChildCards && (
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
      )}
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
  // const style = useMemo(() => {
  //   return {
  //     transform: isVisible
  //       ? 'translateY(0)'
  //       : `translateY(${-(index + 1) * (16 + 64)}px)`,
  //   };
  // }, [index, isVisible]);
  return <CardItem size={size} card={card} className={cn(styles.child)} />;
}
