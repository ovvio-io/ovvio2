import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Note, Tag, Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { styleguide } from '@ovvio/styles/lib';
import { IconCreateNew } from '@ovvio/styles/lib/components/icons';
import { Text } from '@ovvio/styles/lib/components/texts';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { isTag, useQuery } from 'core/cfds/react/query';
import { usePartialVertex } from 'core/cfds/react/vertex';
import React, { useCallback, useMemo } from 'react';
import { useCreateTag } from 'shared/tags/create-tag-context';
import { createMentionsPlugin, filterSortMentions, MentionOptions } from '.';
import { useCurrentCard } from '../elements/card.element';
import { Plugin } from '../plugins';
import {
  RenderMentionPopupProps,
  SuggestionItem,
  SuggestionItemIcon,
} from './mention-node';

const CREATE_NEW_TAG = 'CREATE_NEW_TAG';

type TagItem = VertexManager<Tag> | typeof CREATE_NEW_TAG;

const useStyles = makeStyles(theme => ({
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
    x => isTag(x) && x.parentTag && x.workspaceKey === partial?.workspaceKey,
    [partial?.workspaceKey]
  );

  const { requestCreateTag } = useCreateTag();

  const items = childTags.filter(child => {
    const tag = child.getVertexProxy();
    const cardTagChild = partial.tags[tag.parentTagKey];
    return !cardTagChild || child.key !== cardTagChild;
  });

  const filteredTags = (
    filterSortMentions(items, filter, t => t.getVertexProxy().name) as TagItem[]
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
