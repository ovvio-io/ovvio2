import React, { useCallback } from 'https://esm.sh/react@18.2.0';
import { VertexManager } from '../../../../../cfds/client/graph/vertex-manager.ts';
import {
  Note,
  User,
  Workspace,
} from '../../../../../cfds/client/graph/vertices/index.ts';
import { IconCreateNew } from '../../../../../styles/components/icons/index.ts';
import { Text } from '../../../../../styles/components/texts.tsx';
import { usePartialVertex } from '../../cfds/react/vertex.ts';
import { useMountedIndicator } from '../../react-utils/base-utils.ts';
import AvatarView from '../../../shared/avatar/index.tsx';
import {
  createMentionsPlugin,
  filterSortMentions,
  MentionOptions,
} from './index.tsx';
import { useCurrentCard } from '../elements/card.element/index.tsx';
import { Plugin } from '../plugins/index.ts';
import {
  RenderMentionPopupProps,
  SuggestionItem,
  SuggestionItemIcon,
} from './mention-node.tsx';

// const INVITE_USER = 'INVITE_USER';
type UserItem = VertexManager<User>; //| typeof INVITE_USER;

// function InviteUserItem(props: {
//   isSelected: boolean;
//   onItemSelected: () => void;
// }) {
//   return (
//     <SuggestionItem item={INVITE_USER} {...props}>
//       <SuggestionItemIcon>
//         <IconCreateNew />
//       </SuggestionItemIcon>
//       <Text>Invite</Text>
//     </SuggestionItem>
//   );
// }

function UserSuggestion({
  item,
  ...rest
}: {
  item: VertexManager<User>;
  isSelected: boolean;
  onItemSelected: (item: UserItem) => void;
}) {
  const { name } = usePartialVertex(item, ['name']);

  return (
    <SuggestionItem item={item} {...rest}>
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
  onItemSelected: (item: UserItem) => void;
}) {
  // if (item === INVITE_USER) {
  //   return <InviteUserItem {...rest} />;
  // }

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
  // const { openInvite } = useInvitations();
  const availableAssignees = Array.from(partial.workspace.users);
  const items = availableAssignees
    .filter((u) => !partial.assignees.has(u))
    .map((x) => x.manager as VertexManager<User>);

  const filteredTags = filterSortMentions(
    items,
    filter,
    (t) => t.getVertexProxy().name
  ) as UserItem[]; //.concat(INVITE_USER);
  const keyForItem = useCallback(
    (item: UserItem) => item.key, //(item === INVITE_USER ? INVITE_USER : item.key),
    []
  );

  const onItemSelected = (userItem: UserItem) => {
    closeMention();
    // if (userItem === INVITE_USER) {
    //   (async () => {
    //     const r = await openInvite({
    //       workspace: wsMng,
    //     });
    //     if (isMounted.current && r.userInvited) {
    //       const currentCard = card.getVertexProxy();
    //       const { assignees } = currentCard;
    //       r.users.forEach((u) => assignees.add(u.getVertexProxy()));
    //       currentCard.assignees = assignees;
    //     }
    //   })();
    //   return;
    // }

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
