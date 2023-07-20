import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Tag, Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { useEventLogger } from 'core/analytics';
import { usePartialVertex } from 'core/cfds/react/vertex';
import { useCallback, useMemo } from 'react';
import { Pill, PillStyle, PillContent, PillAction } from 'shared/pill';
import TagButton from 'shared/tags/tag-button';
import { sortTags } from 'shared/tags/tag-utils';
import TagView from 'shared/tags/tag-view';
import { styleguide, layout } from '@ovvio/styles/lib';
import { IconDropDownArrow } from '@ovvio/styles/lib/components/icons';
import { Text } from '@ovvio/styles/lib/components/texts';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { CardHeaderPartProps, CardSize } from '.';

const useStyles = makeStyles(theme => ({
  tagsView: {
    // height: styleguide.gridbase * 3,
    alignItems: 'center',
    basedOn: [layout.row],
  },
  tagsWrap: {
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    marginBottom: styleguide.gridbase,
    tag: {
      marginBottom: styleguide.gridbase,
    },
  },
  tag: {
    marginRight: styleguide.gridbase * 0.5,
  },
  hide: {
    opacity: 0,
  },
}));

interface TagPillProps {
  tag: VertexManager<Tag>;
  setTag: (tag: VertexManager<Tag>) => void;
  isExpanded: boolean;
  onDelete: () => void;
}

function TagPill({ tag, setTag, onDelete, isExpanded }: TagPillProps) {
  const styles = useStyles();
  const { color, name } = usePartialVertex(tag, ['color', 'name']);
  const renderSelected = useCallback(
    () => (
      <Pill
        className={cn(styles.tag)}
        color={color}
        extended={isExpanded}
        pillStyle={isExpanded ? PillStyle.Border : PillStyle.None}
      >
        <PillContent>
          <Text>#{name}</Text>
        </PillContent>
        <PillAction>
          <IconDropDownArrow fill={color} />
        </PillAction>
      </Pill>
    ),
    [color, name, isExpanded, styles]
  );

  return (
    <TagView
      key={tag.key}
      tag={tag}
      onDelete={onDelete}
      renderSelected={renderSelected}
      onSelected={(tag: Tag) => setTag(tag.manager as VertexManager<Tag>)}
    />
  );
}

export function CardTags({
  card,
  size,
  isExpanded,
  source,
}: CardHeaderPartProps) {
  const { tags, workspace } = usePartialVertex(card, ['tags', 'workspace']);
  const styles = useStyles();
  const eventLogger = useEventLogger();
  const cardTags = Array.from(tags.values()).filter(
    tag =>
      !tag.isLoading &&
      !tag.isDeleted &&
      (!tag.parentTag || !tag.parentTag.isDeleted) &&
      tag.parentTag &&
      tag.parentTag !== tag &&
      tag.parentTag?.name !== 'Status'
  );

  const tagManagers = useMemo(
    () =>
      new Map(
        Array.from(tags.entries()).map(([parent, child]) => [
          parent.manager as VertexManager<Tag>,
          child.manager as VertexManager<Tag>,
        ])
      ),
    [tags]
  );

  const onDelete = (tagManager: VertexManager<Tag>) => {
    const tag = tagManager.getVertexProxy();
    const proxy = card.getVertexProxy();
    const newTags = proxy.tags;
    const tagToDelete = tag.parentTag || tag;
    newTags.delete(tagToDelete);
    proxy.tags = newTags;

    eventLogger.cardAction('CARD_TAG_REMOVED', card, {
      source,
      tagId: tag.key,
      parentTagId: tag.parentTagKey,
    });
  };

  const onTag = (tagManager: VertexManager<Tag>) => {
    const proxy = card.getVertexProxy();
    const tag = tagManager.getVertexProxy();
    const newTags = proxy.tags;

    const tagKey = tag.parentTag || tag;

    const exists = newTags.has(tagKey);
    newTags.set(tagKey, tag);
    proxy.tags = newTags;

    eventLogger.cardAction(
      exists ? 'CARD_TAG_REPLACED' : 'CARD_TAG_ADDED',
      card,
      {
        source,
        tagId: tag.key,
        parentTagId: tag.parentTagKey,
      }
    );
  };

  return (
    <div
      className={cn(
        styles.tagsView,
        size === CardSize.Small && styles.tagsWrap
      )}
    >
      {cardTags.sort(sortTags).map(tag => (
        <TagPill
          key={tag.key}
          tag={tag.manager as VertexManager<Tag>}
          onDelete={() => onDelete(tag.manager as VertexManager<Tag>)}
          setTag={onTag}
          isExpanded={isExpanded}
        />
      ))}
      <TagButton
        onTagged={t => onTag(t.manager as VertexManager<Tag>)}
        cardTagsMng={tagManagers}
        workspaceManager={workspace.manager as VertexManager<Workspace>}
        className={cn(!isExpanded && styles.hide)}
      />
    </div>
  );
}
