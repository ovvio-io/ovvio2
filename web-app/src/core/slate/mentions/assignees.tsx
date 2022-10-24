import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Note, User, Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { IconCreateNew } from '@ovvio/styles/lib/components/icons';
import { Text } from '@ovvio/styles/lib/components/texts';
import { usePartialVertex } from 'core/cfds/react/vertex';
import { useMountedIndicator } from 'core/react-utils/base-utils';
import { useCallback } from 'react';
import AvatarView from 'shared/avatar';
import { useInvitations } from 'shared/invitation';
import { createMentionsPlugin, filterSortMentions, MentionOptions } from '.';
import { useCurrentCard } from '../elements/card.element';
import { Plugin } from '../plugins';
import {
  RenderMentionPopupProps,
  SuggestionItem,
  SuggestionItemIcon,
} from './mention-node';

const INVITE_USER = 'INVITE_USER';

type UserItem = VertexManager<User> | typeof INVITE_USER;

function InviteUserItem(props: {
  isSelected: boolean;
  onItemSelected: () => void;
}) {
  return (
    <SuggestionItem {...props}>
      <SuggestionItemIcon>
        <IconCreateNew />
      </SuggestionItemIcon>
      <Text>Invite</Text>
    </SuggestionItem>
  );
}

function UserSuggestion({
  item,
  ...rest
}: {
  item: VertexManager<User>;
  isSelected: boolean;
  onItemSelected: () => void;
}) {
  const { name } = usePartialVertex(item, ['name']);

  return (
    <SuggestionItem {...rest}>
      <SuggestionItemIcon>
        <AvatarView user={item} size="small" />
      </SuggestionItemIcon>
      {name}
    </SuggestionItem>
  );
}

function UserItemComponent({
  item,
  ...rest
}: {
  item: UserItem;
  isSelected: boolean;
  onItemSelected: () => void;
}) {
  if (item === INVITE_USER) {
    return <InviteUserItem {...rest} />;
  }

  return <UserSuggestion item={item} {...rest} />;
}

function AssigneesSuggestionComponent({
  filter,
  SuggestionComponent,
  closeMention,
}: RenderMentionPopupProps<UserItem>) {
  const card = useCurrentCard();
  const partial = usePartialVertex(card as VertexManager<Note>, [
    'assignees',
    'workspace',
    'workspaceKey',
  ]);

  const wsMng = partial.workspace.manager as VertexManager<Workspace>;
  const isMounted = useMountedIndicator();
  const { openInvite } = useInvitations();
  const availableAssignees = Array.from(partial.workspace.users);
  const items = availableAssignees
    .filter(u => !partial.assignees.has(u))
    .map(x => x.manager as VertexManager<User>);

  const filteredTags = (
    filterSortMentions(
      items,
      filter,
      t => t.getVertexProxy().name
    ) as UserItem[]
  ).concat(INVITE_USER);
  const keyForItem = useCallback(
    (item: UserItem) => (item === INVITE_USER ? INVITE_USER : item.key),
    []
  );

  const onItemSelected = (userItem: UserItem) => {
    closeMention();
    if (userItem === INVITE_USER) {
      (async () => {
        const r = await openInvite({
          workspace: wsMng,
        });
        if (isMounted.current && r.userInvited) {
          const currentCard = card.getVertexProxy();
          const { assignees } = currentCard;
          r.users.forEach(u => assignees.add(u.getVertexProxy()));
          currentCard.assignees = assignees;
        }
      })();
      return;
    }

    const user = userItem.getVertexProxy();

    const { assignees } = partial;
    if (assignees.size === 1) {
      assignees.clear();
    }
    assignees.add(user);
    partial.assignees = assignees;
  };

  return (
    <SuggestionComponent
      items={filteredTags}
      keyForItem={keyForItem}
      onItemSelected={onItemSelected}
      ItemSuggestionComponent={UserItemComponent}
    />
  );
}

interface AssigneesPluginOptions
  extends Pick<MentionOptions<User>, 'canOpen' | 'editor'> {}

export function createAssigneesPlugin(
  options: AssigneesPluginOptions
): Partial<Plugin> {
  return createMentionsPlugin<UserItem>({
    ...options,
    trigger: '@',
    MentionComponent: AssigneesSuggestionComponent,
  });
}
