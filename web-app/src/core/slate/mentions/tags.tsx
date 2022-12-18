import React, { useCallback, useMemo } from 'https://esm.sh/react@18.2.0';
import { VertexManager } from '../../../../../cfds/client/graph/vertex-manager.ts';
import {
  Note,
  Tag,
  Workspace,
} from '../../../../../cfds/client/graph/vertices/index.ts';
import { styleguide } from '../../../../../styles/index.ts';
import { IconCreateNew } from '../../../../../styles/components/icons/index.ts';
import { Text } from '../../../../../styles/components/texts.tsx';
import { cn, makeStyles } from '../../../../../styles/css-objects/index.ts';
import { isTag, useQuery } from '../../cfds/react/query.ts';
import { usePartialVertex } from '../../cfds/react/vertex.ts';
import { useCreateTag } from '../../../shared/tags/create-tag-context.tsx';
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

const CREATE_NEW_TAG = 'CREATE_NEW_TAG';

type TagItem = VertexManager<Tag> | typeof CREATE_NEW_TAG;

const useStyles = makeStyles((theme) => ({
  tagIndicator: {
    width: styleguide.gridbase,
    height: styleguide.gridbase,
    borderRadius: '50%',
    marginRight: styleguide.gridbase,
  },
}));

function CreateNewItem(props: {
  isSelected: boolean;
  onItemSelected: () => void;
}) {
  return (
    <SuggestionItem {...props}>
      <SuggestionItemIcon>
        <IconCreateNew />
      </SuggestionItemIcon>
      <Text>Create New</Text>
    </SuggestionItem>
  );
}

function TagSuggestion({
  item,
  ...rest
}: {
  item: VertexManager<Tag>;
  isSelected: boolean;
  onItemSelected: () => void;
}) {
  const styles = useStyles();
  const { color, name } = usePartialVertex(item, ['color', 'name']);
  const style = useMemo(
    () => ({
      backgroundColor: color,
    }),
    [color]
  );
  return (
    <SuggestionItem {...rest}>
      <SuggestionItemIcon>
        <div className={cn(styles.tagIndicator)} style={style} />
      </SuggestionItemIcon>
      {name}
    </SuggestionItem>
  );
}

function TagItemComponent({
  item,
  ...rest
}: {
  item: TagItem;
  isSelected: boolean;
  onItemSelected: () => void;
}) {
  if (item === CREATE_NEW_TAG) {
    return <CreateNewItem {...rest} />;
  }

  return <TagSuggestion item={item} {...rest} />;
}

function TagsSuggestionComponent({
  filter,
  SuggestionComponent,
  closeMention,
}: RenderMentionPopupProps<TagItem>) {
  const card = useCurrentCard();
  const partial = usePartialVertex(card as VertexManager<Note>, [
    'tags',
    'workspace',
    'workspaceKey',
  ]);

  const wsMng = partial.workspace.manager as VertexManager<Workspace>;
  const { results: childTags } = useQuery<Tag>(
    (x) => isTag(x) && x.parentTag && x.workspaceKey === partial?.workspaceKey,
    [partial?.workspaceKey]
  );

  const { requestCreateTag } = useCreateTag();

  const items = childTags.filter((child) => {
    const tag = child.getVertexProxy();
    const cardTagChild = partial.tags[tag.parentTagKey];
    return !cardTagChild || child.key !== cardTagChild;
  });

  const filteredTags = (
    filterSortMentions(
      items,
      filter,
      (t) => t.getVertexProxy().name
    ) as TagItem[]
  ).concat(CREATE_NEW_TAG);
  const keyForItem = useCallback(
    (item: TagItem) => (item === CREATE_NEW_TAG ? CREATE_NEW_TAG : item.key),
    []
  );

  const onItemSelected = (tagMng: TagItem) => {
    closeMention();
    if (tagMng === CREATE_NEW_TAG) {
      requestCreateTag({
        workspaceManager: wsMng,
        initialName: filter,
        onTagCreated(tag) {
          const currentTags = partial.tags;
          currentTags.set(tag.parentTag || tag, tag);
          partial.tags = currentTags;
        },
      });
      return;
    }

    const tag = tagMng.getVertexProxy();

    const { tags } = partial;
    tags.set(tag.parentTag, tag);
    partial.tags = tags;
  };

  return (
    <SuggestionComponent
      items={filteredTags}
      keyForItem={keyForItem}
      onItemSelected={onItemSelected}
      ItemSuggestionComponent={TagItemComponent}
    />
  );
}

interface TagsPluginOptions
  extends Pick<MentionOptions<Tag>, 'canOpen' | 'editor'> {}

export function createTagsPlugin(options: TagsPluginOptions): Partial<Plugin> {
  return createMentionsPlugin<TagItem>({
    ...options,
    trigger: '#',
    MentionComponent: TagsSuggestionComponent,
  });
}
