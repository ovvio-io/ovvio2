import React, { useCallback, useMemo } from 'react';
import { VertexManager } from '../../../../../cfds/client/graph/vertex-manager.ts';
import {
  Note,
  Tag,
  Workspace,
} from '../../../../../cfds/client/graph/vertices/index.ts';
import { styleguide } from '../../../../../styles/index.ts';
import { cn, makeStyles } from '../../../../../styles/css-objects/index.ts';
import {
  isTag,
  useQuery,
  useQuery2,
  useSharedQuery,
} from '../../cfds/react/query.ts';
import { usePartialVertex } from '../../cfds/react/vertex.ts';
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
import { Query, QueryOptions } from '../../../../../cfds/client/graph/query.ts';
import { VertexSource } from '../../../../../cfds/client/graph/vertex-source.ts';

const useStyles = makeStyles((theme) => ({
  tagIndicator: {
    width: styleguide.gridbase,
    height: styleguide.gridbase,
    borderRadius: '50%',
    marginRight: styleguide.gridbase,
  },
}));

// function CreateNewItem(props: {
//   isSelected: boolean;
//   onItemSelected: () => void;
// }) {
//   return (
//     <SuggestionItem {...props}>
//       <SuggestionItemIcon>
//         <IconCreateNew />
//       </SuggestionItemIcon>
//       <Text>Create New</Text>
//     </SuggestionItem>
//   );
// }

function TagSuggestion({
  item,
  ...rest
}: {
  item: VertexManager<Tag>;
  isSelected: boolean;
  onItemSelected: (item: VertexManager<Tag>) => void;
}) {
  const styles = useStyles();
  const { name } = usePartialVertex(item, ['name']);
  return (
    <SuggestionItem item={item} {...rest}>
      <SuggestionItemIcon>
        <div className={cn(styles.tagIndicator)} />
      </SuggestionItemIcon>
      {name}
    </SuggestionItem>
  );
}

function TagItemComponent({
  item,
  ...rest
}: {
  item: VertexManager<Tag>;
  isSelected: boolean;
  onItemSelected: (item: VertexManager<Tag>) => void;
}) {
  // if (item === CREATE_NEW_TAG) {
  //   return <CreateNewItem {...rest} />;
  // }

  return <TagSuggestion item={item} {...rest} />;
}

function TagsSuggestionComponent({
  filter,
  SuggestionComponent,
  closeMention,
}: RenderMentionPopupProps<VertexManager<Tag>>) {
  const card = useCurrentCard()!;
  const partial = usePartialVertex(card, ['tags']);
  const sharedTags = useSharedQuery('tags');
  const childTagsQuery = useQuery2({
    source: sharedTags as VertexSource,
    predicate: (tag: Tag) => {
      if (!tag.parentTag) {
        return false;
      }
      const cardTagChild = partial.tags.get(tag.parentTag);
      return !cardTagChild || tag !== cardTagChild;
    },
  });

  const filteredTags = filterSortMentions(
    childTagsQuery.results,
    filter,
    (t) => t.getVertexProxy().name
  );

  const onItemSelected = (mgr: VertexManager<Tag>) => {
    closeMention();
    const { tags } = partial;
    const tag = mgr.getVertexProxy();
    tags.set(tag.parentTag!, tag);
    partial.tags = tags;
  };

  return (
    <SuggestionComponent
      items={filteredTags}
      keyForItem={(mgr: VertexManager<Tag>) => mgr.key}
      onItemSelected={onItemSelected}
      ItemSuggestionComponent={TagItemComponent}
    />
  );
}

export type TagsPluginOptions = Pick<MentionOptions<Tag>, 'canOpen' | 'editor'>;

export function createTagsPlugin(options: TagsPluginOptions): Partial<Plugin> {
  return createMentionsPlugin<VertexManager<Tag>>({
    ...options,
    trigger: '#',
    MentionComponent: TagsSuggestionComponent,
  });
}
