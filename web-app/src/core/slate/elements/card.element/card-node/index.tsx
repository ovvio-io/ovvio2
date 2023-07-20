import { Vertex } from '@ovvio/cfds/lib/client/graph/vertex';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import {
  Note,
  Tag,
  User,
  Workspace,
} from '@ovvio/cfds/lib/client/graph/vertices';
import { layout, styleguide } from '@ovvio/styles/lib';
import { getColorForUserId } from '@ovvio/styles/lib/colors';
import { IconDropDownArrow } from '@ovvio/styles/lib/components/icons';
import { CheckBox } from '@ovvio/styles/lib/components/inputs';
import { Text } from '@ovvio/styles/lib/components/texts';
import { cn, keyframes, makeStyles } from '@ovvio/styles/lib/css-objects';
import { useTheme } from '@ovvio/styles/lib/theme';
import { useGraphManager } from 'core/cfds/react/graph';
import { usePartialVertex } from 'core/cfds/react/vertex';
import { useAnimateHeight, useAnimateWidth } from 'core/react-utils/animate';
import { ElementUtils } from 'core/slate/utils/element-utils';
import { SelectionUtils } from 'core/slate/utils/selection-utils';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CARD_SOURCE } from 'shared/card';
import AssigneesView, {
  Assignee,
  RenderAssignee,
} from 'shared/card/assignees-view';
import { useCardPlaceholderText } from 'shared/card/placeholder';
import { Pill, PillAction, PillContent, PillStyle } from 'shared/pill';
import TagButton from 'shared/tags/tag-button';
import { isCardActionable } from 'shared/tags/tag-utils';
import {
  default as TagPillView,
  default as TagView,
} from 'shared/tags/tag-view';
import { useStatusTags } from 'shared/tags/use-status-tags';
import { Node } from 'slate';
import {
  ReactEditor,
  RenderElementProps,
  useFocused,
  useSelected,
  useSlateStatic,
} from 'slate-react';
import {
  CardElement,
  EditableCardContext,
  LoadingCardElement,
  useCurrentCard,
} from '../';
import { AssigneesIcon } from '../assignees-icon';
import { TagIcon } from '../tag-icon';
import { CardActions } from './card-actions';

const animName = keyframes({
  from: {
    backgroundPosition: [styleguide.gridbase * -14, 0],
  },
  to: {
    backgroundPosition: [styleguide.gridbase * 14, 0],
  },
});

const useStyles = makeStyles((theme, resolveClass) => ({
  root: {
    margin: [styleguide.gridbase, 0],
    [`& + ${resolveClass('root')}`]: {
      marginBottom: 0,
    },
  },
  card: {
    borderBottom: `1px solid ${theme.background.placeholderText}`,
    boxSizing: 'border-box',
    ...styleguide.transition.short,
    transitionProperty: 'height, color',
    basedOn: [layout.column],
    ':hover': {
      actionsContainer: {
        opacity: 1,
      },
    },
  },
  skeleton: {
    animationDuration: '1s',
    animationFillMode: 'forwards',
    animationIterationCount: 'infinite',
    animationName: animName,
    animationTimingFunction: 'linear',
    backgroundColor: theme.background[300],
    background:
      'linear-gradient(to left, #f0f3f7 8%, #ced8e5 18%, #f0f3f7 33%)',
    backgroundSize: ['100%', '100%'],
  },
  cardDone: {
    color: theme.background.placeholderText,
  },
  noteLine: {
    position: 'relative',
    height: styleguide.gridbase * 4,
    flexShrink: 0,
    flexGrow: 0,
    flexBasis: styleguide.gridbase * 4,
    alignItems: 'center',
    basedOn: [layout.row],
  },
  actionsContainer: {
    position: 'absolute',
    top: 0,
    right: styleguide.gridbase * 0.5,
    opacity: 0,
    ...styleguide.transition.short,
    transitionProperty: 'opacity',
  },
  selected: {
    backgroundColor: theme.background[100],
  },
  checkbox: {
    userSelect: 'none',
    marginRight: styleguide.gridbase,
  },
  inlineMetadata: {
    userSelect: 'none',
    marginLeft: styleguide.gridbase,
    basedOn: [layout.row],
  },
  tagButton: {
    userSelect: 'none',
    marginLeft: styleguide.gridbase * 0.5,
    padding: 0,
  },
  inlineTag: {
    height: styleguide.gridbase * 3,
    boxSizing: 'border-box',
    border: '1px solid transparent',
    padding: [0, styleguide.gridbase * 0.5],
    borderRadius: styleguide.gridbase * 1.5,
    alignItems: 'center',
    whiteSpace: 'nowrap',
    ...styleguide.transition.short,
    transitionProperty: 'width border-color',
    basedOn: [layout.row],
  },
  cardText: {
    minWidth: 2,
  },
  inlineTagArrow: {
    marginLeft: styleguide.gridbase * 0.5,
  },
  hideArrow: {
    display: 'none',
  },
  extendedMetadata: {
    paddingLeft: styleguide.gridbase * 4,
    overflow: 'hidden',
    userSelect: 'none',
    basedOn: [layout.column],
  },
  tag: {
    userSelect: 'none',
    margin: [0, styleguide.gridbase * 0.5],
  },
  metadataRow: {
    height: styleguide.gridbase * 3,
    alignItems: 'center',
    marginBottom: styleguide.gridbase,
    basedOn: [layout.row],
  },
  assigneesIcon: {
    marginRight: styleguide.gridbase * 0.5,
  },
  strikethroughAnchor: {
    position: 'relative',
    basedOn: [layout.row],
  },
  strikethrough: {
    position: 'absolute',
    height: 1,
    backgroundColor: theme.background.placeholderText,
    width: '100%',
    left: 0,
    top: '50%',
    transform: 'scale(0)',
    transformOrigin: 'left center',
    ...styleguide.transition.standard,
    transitionProperty: 'transform',
  },
  cardPlaceholder: {
    position: 'relative',
    left: -2,
    whiteSpace: 'nowrap',
    color: theme.background.placeholderText,
    userSelect: 'none',
    pointerEvents: 'none',
    // position: 'absolute',
    // top: '50%',
    // left: '50%',
    // transform: 'translate(-50%, -50%)'
  },
  strikeEnabled: {
    transform: 'scale(1)',
  },
  hide: {
    height: 0,
  },
  assigneePill: {
    marginRight: styleguide.gridbase,
  },
}));

export interface CardElementProps extends RenderElementProps {
  element: CardElement;
}

export interface LoadingCardElementProps extends RenderElementProps {
  element: LoadingCardElement;
}

export function LoadingCardNode({
  attributes,
  children,
}: LoadingCardElementProps) {
  const styles = useStyles();
  return (
    <div {...attributes} className={cn(styles.root)}>
      <div className={cn(styles.card)}>
        <div className={cn(styles.noteLine, styles.skeleton)}>{children}</div>
      </div>
    </div>
  );
}

function Placeholder({ element }: { element: CardElement }) {
  const styles = useStyles();
  const isEmpty = !Node.string(element);
  const placeholder = useCardPlaceholderText();

  if (!isEmpty) {
    return null;
  }

  return (
    <Text className={cn(styles.cardPlaceholder)} contentEditable={false}>
      {placeholder}
    </Text>
  );
}

export const CardNode = function ({
  element,
  attributes,
  children,
}: CardElementProps) {
  const styles = useStyles();
  const editor = useSlateStatic();
  const rootCard = useCurrentCard();
  const cardId = element.ref;
  const graph = useGraphManager();
  const cardManager = graph.getVertexManager<Note>(cardId);
  const card = usePartialVertex(cardManager, [
    'tags',
    'title',
    'workspace',
    'type',
    'isChecked',
  ]);

  const theme = useTheme();
  const divRef = useRef<HTMLDivElement>();
  const selected = useSelected();
  const focused = useFocused();
  const [isExpanded, setIsExpanded] = useState(false);
  useEffect(() => {
    if (!ReactEditor.isFocused(editor)) {
      return;
    }
    if (!selected) {
      setIsExpanded(false);
      return;
    }
    const [node, path] = SelectionUtils.extractSingleElement(editor);
    if (!node) {
      setIsExpanded(false);
      return;
    }
    const thisNode = ElementUtils.getClosestNode(
      editor,
      path,
      (node => CardElement.isCard(node) && node.ref === cardId) as (
        node: Node
      ) => node is CardElement
    );
    return setIsExpanded(!!thisNode);
  }, [selected, editor, focused, cardId]);

  // const statusTags = useStatusTags(card.workspace);

  const isActionable = isCardActionable(card);

  const done = card.isChecked;
  const onChecked = () => {
    // toggleDone(card, statusTags, !done);
    card.isChecked = !card.isChecked;
  };

  const style = useAnimateHeight(divRef, isExpanded);

  return (
    <EditableCardContext cardManager={cardManager}>
      <div className={cn(styles.root)}>
        <div
          className={cn(
            styles.card,
            isExpanded && styles.selected,
            done && styles.cardDone
          )}
          ref={divRef}
          style={style}
        >
          <div className={cn(styles.noteLine)}>
            {isActionable && (
              <CheckBox
                name={cardId}
                checked={done}
                onChange={onChecked}
                contentEditable={false}
                className={cn(styles.checkbox)}
                color={theme.background[600]}
              />
            )}
            <div className={cn(styles.strikethroughAnchor)}>
              <div {...attributes} className={cn(styles.cardText)}>
                {children}
              </div>
              <div
                contentEditable={false}
                className={cn(
                  styles.strikethrough,
                  done && styles.strikeEnabled
                )}
              />
              <Placeholder element={element} />
            </div>
            {!isExpanded && <ShortCardMetadata cardManager={cardManager} />}
            <CardActions
              card={cardManager}
              editorRootKey={rootCard.key}
              className={cn(styles.actionsContainer)}
            />
          </div>
          <ExtendedCardMetadata
            cardManager={cardManager}
            className={cn(!isExpanded && styles.hide)}
          />
        </div>
      </div>
    </EditableCardContext>
  );
};

type AssignableVertexManager = VertexManager<Vertex & { name: string }>;

interface AssigneeDropDownProps {
  assignable: AssignableVertexManager;
  showExpanded?: boolean;
  color: string;
  prefix: string;
}

function AssigneeDropDown({
  assignable,
  color,
  prefix,
  showExpanded = false,
}: AssigneeDropDownProps) {
  const styles = useStyles();
  const { name } = usePartialVertex(assignable, ['name']);
  const ref = useRef();

  const width = useAnimateWidth(ref, showExpanded);
  const style = useMemo(() => {
    const s: Record<string, any> = {
      color,
      ...width,
    };
    if (showExpanded) {
      s.borderColor = color;
    }
    return s;
  }, [color, showExpanded, width]);

  return (
    <div
      contentEditable={false}
      className={cn(styles.inlineTag)}
      style={style}
      ref={ref}
    >
      <Text>
        {prefix}
        {name}
      </Text>
      <IconDropDownArrow
        className={cn(styles.inlineTagArrow, !showExpanded && styles.hideArrow)}
        fill={color}
      />
    </div>
  );
}

function InlineAssignee({
  user,
  workspaceManager,
  cardManager,
}: {
  user: VertexManager<User>;
  workspaceManager: VertexManager<Workspace>;
  cardManager: VertexManager<Note>;
}) {
  const styles = useStyles();
  const { users } = usePartialVertex(workspaceManager, ['users']);
  const userManagers = useMemo(
    () => Array.from(users).map(u => u.manager as VertexManager<User>),
    [users]
  );

  const { assignees } = usePartialVertex(cardManager, ['assignees']);
  const assigneesManagers = useMemo(
    () => Array.from(assignees).map(u => u.manager as VertexManager<User>),
    [assignees]
  );

  const [expanded, setExpanded] = useState(false);
  const userKey = user.key;
  const color = useMemo(() => getColorForUserId(`${userKey}`), [userKey]);
  const renderSelected = useCallback(
    ({ user }) => (
      <AssigneeDropDown
        assignable={user}
        showExpanded={expanded}
        color={color}
        prefix="@"
      />
    ),
    [expanded, color]
  );

  return (
    <div
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onClick={() => setExpanded(false)}
    >
      <Assignee
        user={user}
        users={userManagers}
        cardManager={cardManager}
        assignees={assigneesManagers}
        source={CARD_SOURCE.TITLE}
        onInviteUserSelected={() => {}}
        renderSelected={renderSelected}
        className={cn(styles.tagButton)}
      />
    </div>
  );
}

function InlineTag({
  tag,
  cardManager,
}: {
  tag: VertexManager<Tag>;
  cardManager: VertexManager<Note>;
}) {
  const { color } = usePartialVertex(tag, ['color']);
  const [expanded, setExpanded] = useState(false);

  const renderSelected = useCallback(
    (tagMng: VertexManager<Tag>) => (
      <AssigneeDropDown
        assignable={tagMng}
        color={color}
        showExpanded={expanded}
        prefix="#"
      />
    ),
    [expanded, color]
  );

  const onSelected = useCallback(
    (t: Tag) => {
      const proxy = cardManager.getVertexProxy();
      const tags = proxy.tags;
      tags.set(t.parentTag, t);
      proxy.tags = tags;
    },
    [cardManager]
  );

  const onDelete = useCallback(
    (t: Tag) => {
      const proxy = cardManager.getVertexProxy();
      const tags = proxy.tags;
      tags.delete(t.parentTag);
      proxy.tags = tags;
    },
    [cardManager]
  );

  return (
    <div
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onClick={() => setExpanded(false)}
    >
      <TagView
        tag={tag}
        onSelected={onSelected}
        onDelete={onDelete}
        renderSelected={renderSelected}
      />
    </div>
  );
}

const ShortCardMetadata = React.memo(function ({
  cardManager,
}: {
  cardManager: VertexManager<Note>;
}) {
  const styles = useStyles();
  const { workspace, tags, assignees } = usePartialVertex(cardManager, [
    'workspace',
    'tags',
    'assignees',
  ]);

  return (
    <div className={cn(styles.inlineMetadata)} contentEditable={false}>
      {Array.from(assignees).map(user => (
        <InlineAssignee
          key={user.key}
          user={user.manager as VertexManager<User>}
          workspaceManager={workspace.manager as VertexManager<Workspace>}
          cardManager={cardManager}
        />
      ))}
      {Array.from(tags)
        .filter(([parent, child]) => parent.name !== 'Status')
        .map(([parentTag, tag]) => (
          <InlineTag
            key={tag.key}
            tag={tag.manager as VertexManager<Tag>}
            cardManager={cardManager}
          />
        ))}
    </div>
  );
});

function AssigneePill({ user }: { user: VertexManager<User> }) {
  const styles = useStyles();
  const { name } = usePartialVertex(user, ['name']);
  const color = getColorForUserId(user.key);

  return (
    <Pill
      color={color}
      pillStyle={PillStyle.Border}
      extended={true}
      className={cn(styles.assigneePill)}
    >
      <PillContent>{name}</PillContent>
      <PillAction>
        <IconDropDownArrow fill={color} />
      </PillAction>
    </Pill>
  );
}

interface ExtendedCardProps {
  cardManager: VertexManager<Note>;
  className?: string;
}

const ExtendedCardMetadata = React.forwardRef<
  HTMLDivElement,
  ExtendedCardProps
>(function ({ cardManager, className }, ref) {
  const styles = useStyles();
  const card = usePartialVertex(cardManager, ['tags', 'workspace']);

  const wsMng = card.workspace.manager as VertexManager<Workspace>;

  const tagsMng = new Map<VertexManager<Tag>, VertexManager<Tag>>();
  for (const [p, c] of card.tags) {
    tagsMng.set(
      p.manager as VertexManager<Tag>,
      c.manager as VertexManager<Tag>
    );
  }

  const renderAssignee = useCallback<RenderAssignee>(
    ({ user }) => <AssigneePill user={user} />,
    []
  );

  const onTagSelected = (tag: Tag) => {
    const currentTags = card.tags;
    currentTags.set(tag.parentTag || tag, tag);
    card.tags = currentTags;
  };

  const onTagDeleted = (tag: Tag) => {
    const currentTags = card.tags;
    currentTags.delete(tag.parentTag || tag);
    card.tags = currentTags;
  };
  return (
    <div
      contentEditable={false}
      ref={ref}
      className={cn(className, styles.extendedMetadata)}
    >
      <div className={cn(styles.metadataRow)}>
        <TagIcon />
        {Array.from(card.tags)
          .filter(([parent, child]) => parent.name !== 'Status')
          .map(([_, tag]) => (
            <TagPillView
              buttonClassName={cn(styles.tag)}
              key={tag.key}
              tag={tag.manager as VertexManager<Tag>}
              onSelected={onTagSelected}
              onDelete={onTagDeleted}
              showMenu={true}
            />
          ))}
        <TagButton
          cardTagsMng={tagsMng}
          onTagged={onTagSelected}
          workspaceManager={wsMng}
          className={cn(styles.tag)}
        />
      </div>
      <div className={cn(styles.metadataRow)}>
        <AssigneesIcon className={cn(styles.assigneesIcon)} />
        <AssigneesView
          cardManager={cardManager}
          cardType="regular"
          source={CARD_SOURCE.CHILD}
          reverse={true}
          renderAssignee={renderAssignee}
        />
      </div>
    </div>
  );
});
