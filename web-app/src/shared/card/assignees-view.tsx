import React, { useCallback, useMemo, useState } from 'react';
import { makeStyles, cn } from '../../../../styles/css-objects/index.ts';
import { styleguide, layout } from '../../../../styles/index.ts';
import Avatar from '../avatar/index.tsx';
import { useTheme } from '../../../../styles/theme.tsx';
import { MentionItem } from './mention.tsx';
import { assignNote } from '../utils/assignees.ts';
import {
  Note,
  User,
  Workspace,
} from '../../../../cfds/client/graph/vertices/index.ts';
import SelectionButton, { SORT_VALUES } from '../selection-button/index.tsx';
import { usePartialVertex } from '../../core/cfds/react/vertex.ts';
import { VertexManager } from '../../../../cfds/client/graph/vertex-manager.ts';
import { IconPlus } from '../../../../styles/components/new-icons/icon-plus.tsx';
import { brandLightTheme as theme } from '../../../../styles/theme.tsx';
import { UISource } from '../../../../logging/client-events.ts';
import { useLogger } from '../../core/cfds/react/logger.tsx';
import { IconClose } from '../../../../styles/components/new-icons/icon-close.tsx';
import { IconColor } from '../../../../styles/components/new-icons/types.ts';
import Menu from '../../../../styles/components/menu.tsx';
import { MemberPicker } from '../../../../components/member-picker.tsx';

const useStyles = makeStyles(() => ({
  list: {
    basedOn: [layout.row],
    height: styleguide.gridbase * 3,
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  standard: {
    flexDirection: 'row-reverse',
    assignee: {
      marginLeft: styleguide.gridbase * 0.5,
    },
  },
  reverse: {
    flexDirection: 'row',
    assignee: {
      marginRight: styleguide.gridbase * 0.5,
    },
    gap: '1px',
  },
  selectionButton: {
    ...styleguide.transition.short,
    transitionProperty: 'transform',
  },
  assignee: {},
  regular: {
    //marginTop: styleguide.gridbase * 2,
    //marginBottom: styleguide.gridbase,
    addButton: {
      width: styleguide.gridbase * 3,
      height: styleguide.gridbase * 3,
    },
  },
  small: {
    addButton: {
      width: styleguide.gridbase * 2.5,
      height: styleguide.gridbase * 2.5,
    },
  },
  addButton: {
    backgroundColor: theme.mono.m2,
    flexShrink: 0,
    borderRadius: '50%',
    border: ``,
  },
  popup: {
    backgroundColor: theme.colors.background,
    // width: styleguide.gridbase * 16.5,
    marginBottom: styleguide.gridbase * 2,
  },
  popupContent: {
    backgroundColor: theme.colors.background,
    width: '100%',
    boxSizing: 'border-box',
    basedOn: [layout.column],
  },
  input: {
    border: 'none',
    width: '100%',
    borderBottom: '1px solid rgba(156, 178, 205, 0.6)',
    borderRadius: 0,
  },
  userName: {
    flexGrow: 1,
    whiteSpace: 'nowrap',
    marginLeft: styleguide.gridbase,
    color: theme.colors.text,
    fontSize: '13px',
  },
  inviteIcon: {
    marginRight: styleguide.gridbase * 2,
  },
  addIcon: {
    opacity: 1,
  },
  hide: {
    opacity: 0,
  },
}));

function AddAssigneeIcon({
  className = '',
  fill = '#D7E3F1',
  stroke = '#C5D4E6',
}) {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      width="32"
      height="32"
      viewBox="0 0 32 32"
      className={cn(styles.addIcon, className)}
    >
      <defs>
        <circle id="cY734WTs886Gxkc8xMVJ" cx="16" cy="16" r="16" />
        <mask
          id="dAQteIXSYDMRZpa0FZiB"
          width="32"
          height="32"
          x="0"
          y="0"
          fill="#fff"
          maskContentUnits="userSpaceOnUse"
          maskUnits="objectBoundingBox"
        >
          <use xlinkHref="#cY734WTs886Gxkc8xMVJ" />
        </mask>
      </defs>
      <g fill="none" fillRule="evenodd">
        <use
          fill={theme.background[0]}
          stroke="#C5D4E6"
          strokeDasharray="2 2"
          strokeWidth="4"
          mask="url(#dAQteIXSYDMRZpa0FZiB)"
          xlinkHref="#cY734WTs886Gxkc8xMVJ"
        />
        <path
          fill="#D7E3F1"
          d="M22.016 16.683L16.683 16.683 16.683 22.016 14.933 22.016 14.933 16.683 9.6 16.683 9.6 14.933 14.933 14.933 14.933 9.6 16.683 9.6 16.683 14.933 22.016 14.933z"
        />
      </g>
    </svg>
  );
}

const REMOVE_ASSIGNEE = 'REMOVE_ASSIGNEE';
type ACTION_ITEM = typeof REMOVE_ASSIGNEE;

const RenderedItem = ({
  item,
  ...props
}: {
  item: VertexManager<User> | ACTION_ITEM;
}) => {
  const styles = useStyles();
  if (item === REMOVE_ASSIGNEE) {
    return (
      <MentionItem {...props} key={REMOVE_ASSIGNEE}>
        <IconClose color={IconColor.Primary} />
        <span className={cn(styles.userName)}>Remove Assignee</span>
      </MentionItem>
    );
  }

  return (
    <MentionItem {...props} key={item.key}>
      {/* <Avatar user={item} size="big" /> */}
      <UserSpan userManager={item} />
    </MentionItem>
  );
};

const renderItem = ({
  item,
  ...props
}: {
  item: VertexManager<User> | ACTION_ITEM;
}) => {
  return <RenderedItem item={item} {...props} />;
};

function UserSpan({ userManager }: { userManager: VertexManager<User> }) {
  const styles = useStyles();
  const user = usePartialVertex(userManager, ['name']);
  return <span className={cn(styles.userName)}>{user.name}</span>;
}

export type RenderAssignee = (props: {
  isOpen: boolean;
  user: VertexManager<User>;
  size: 'big' | 'small';
}) => JSX.Element;

interface AssigneeProps {
  user: VertexManager<User>;
  cardManager: VertexManager<Note>;
  users: VertexManager<User>[];
  assignees: VertexManager<User>[];
  className?: string;
  source: UISource;
  renderSelected?: RenderAssignee;
  size?: 'big' | 'small';
  style?: {};
}

function DefaultAvatar({
  user,
  size,
}: {
  isOpen: boolean;
  user: VertexManager<User>;
  size: 'big' | 'small';
}) {
  const styles = useStyles();
  return <Avatar user={user} size={size} className={cn(styles.assignee)} />;
}

const DEFAULT_RENDER: RenderAssignee = ({ isOpen, user, size }) => {
  return <DefaultAvatar user={user} isOpen={isOpen} size={size} />;
};

export function Assignee({
  user,
  cardManager,
  users,
  source,
  assignees,
  className,
  renderSelected = DEFAULT_RENDER,
  size = 'big',
  style = { paddingRight: '1px' },
}: AssigneeProps) {
  const styles = useStyles();
  const logger = useLogger();
  const getItems = useCallback(() => {
    return users
      .filter(
        (u) =>
          u.key !== user.key &&
          assignees.find((a) => a.key === u.key) === undefined,
      )
      .map(
        (u) =>
          ({
            value: u,
            sortValue: u.getVertexProxy().name,
          } as { value: VertexManager<User> | ACTION_ITEM; sortValue: string }),
      )
      .concat([
        {
          value: REMOVE_ASSIGNEE,
          sortValue: SORT_VALUES.BOTTOM,
        },
      ]);
  }, [users, assignees, user]);

  const onSelected = (value: VertexManager<User> | ACTION_ITEM) => {
    const card = cardManager.getVertexProxy();
    const current = user.getVertexProxy();

    if (value === REMOVE_ASSIGNEE) {
      card.assignees.delete(current);
      logger.log({
        severity: 'EVENT',
        event: 'MetadataChanged',
        uiSource: source,
        user: current.key,
        vertex: card.key,
        metadataType: 'assignee',
      });
      return;
    }

    if (value.key === user.key) {
      //Same user selected
      return;
    }

    assignNote(logger, source, card, value.getVertexProxy(), current);
  };
  return (
    <SelectionButton
      getItems={getItems}
      className={cn(styles.selectionButton, className)}
      renderItem={renderItem}
      onSelected={onSelected}
      style={style}
    >
      {({ isOpen }: { isOpen: boolean }) =>
        renderSelected({ isOpen, user, size })
      }
    </SelectionButton>
  );
}

interface AssignButtonProps {
  cardManager: VertexManager<Note>;
  users: VertexManager<User>[];
  className?: string;
  source: UISource;
  style?: {};
}
export function AssignButton({
  cardManager,
  className,
  users,
  source,
  style = {},
}: AssignButtonProps) {
  const styles = useStyles();
  const logger = useLogger();

  const onRowSelect = (user: User) => {
    // cardManager.vertex.assignees.add(user);
    const card = cardManager.getVertexProxy();
    assignNote(logger, source, card, user);
  };

  return (
    <Menu
      renderButton={() => (
        <img key="IconAddAssignee" src="/icons/board/Assignee.svg" />
      )}
      position="bottom"
      align="end"
      direction="out"
      className={className}
      popupClassName={cn(styles.popup)}
    >
      <MemberPicker showSearch={true} onRowSelect={onRowSelect} users={users} />
    </Menu>
  );
}

interface AssigneesProps {
  cardManager: VertexManager<Note>;
  className?: string;
  assignClassName?: string;
  cardType: 'small' | 'regular';
  reverse?: boolean;
  source: UISource;
  renderAssignee?: RenderAssignee;
  isExpanded?: boolean;
  multiIsActive?: boolean;
}

function calcStyle(isExpanded: boolean, reverse: boolean, index: number) {
  return isExpanded
    ? { transform: 'translateX(0)' }
    : {
        transform: `translateX(${
          styleguide.gridbase * 1.25 * index * (reverse ? -1 : 1)
        }px)`,
      };
}

export default function AssigneesView({
  cardManager,
  className,
  assignClassName,
  cardType,
  reverse = false,
  source,
  renderAssignee,
  isExpanded = true,
  multiIsActive,
}: AssigneesProps) {
  const styles = useStyles();
  const logger = useLogger();
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const partialCard = usePartialVertex(cardManager, ['workspace', 'assignees']);

  const workspaceManager = partialCard.workspace
    .manager as VertexManager<Workspace>;
  const workspaces = useMemo(() => [workspaceManager], [workspaceManager]);
  const users = Array.from(cardManager.getVertexProxy().workspace.users).map(
    (u) => u.manager as VertexManager<User>,
  );
  const assignees = Array.from(partialCard.assignees).map(
    (u) => u.manager as VertexManager<User>,
  );
  // .map(x => users.vertexManagers.find(u => u.key === x.key))
  // .filter(x => x && !x.getVertexProxy().isDeleted);

  const onInviteUserSelected = () => {
    setIsInviteOpen(true);
  };

  const onUsersInvited = (users: VertexManager<User>[]) => {
    for (const user of users) {
      assignNote(
        logger,
        source,
        cardManager.getVertexProxy(),
        user.getVertexProxy(),
      );
    }
  };
  // const size = cardType === 'regular' ? 'big' : 'small';
  const size = 'small';
  // const assignStyle = calcStyle(isExpanded, reverse, assignees.length);
  return (
    <div
      className={cn(
        styles.list,
        className,
        styles[cardType],
        !reverse ? styles.reverse : styles.standard,
      )}
    >
      {!multiIsActive && (
        <AssignButton
          source={source}
          cardManager={cardManager}
          users={users}
          className={cn(!isExpanded && styles.hide, assignClassName)}
        />
      )}
      {...assignees.map((user, index) => (
        <Assignee
          source={source}
          key={user.key}
          cardManager={cardManager}
          users={users}
          assignees={assignees}
          user={user}
          size={size}
          renderSelected={renderAssignee}
        />
      ))}
    </div>
  );
}
