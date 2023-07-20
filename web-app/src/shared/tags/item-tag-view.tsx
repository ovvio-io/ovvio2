import React from 'react';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { styleguide, layout } from '@ovvio/styles/lib';
import TagView from './tag-view';
import * as tagUtils from './tag-utils';
import TagButton from './tag-button';
import { Note, Tag, Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { useEventLogger } from 'core/analytics';
import { CARD_SOURCE } from 'shared/card';
import { usePartialVertex } from 'core/cfds/react/vertex';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';

const useStyles = makeStyles((theme, resolveClass) => ({
  tagsView: {
    height: styleguide.gridbase * 3,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    basedOn: [layout.row],
  },
  reverse: {
    flexDirection: 'row',
  },
  tag: {
    marginRight: styleguide.gridbase / 2,
  },
}));

interface TagsViewProps {
  cardManager: VertexManager<Note>;
  reverse?: boolean;
  className?: string;
  tagClassName?: string;
  showTagButton?: boolean;
  visibleOnHoverClassName?: string;
  source: CARD_SOURCE;
  isInHover?: boolean;
}
export default function TagsView({
  cardManager,
  reverse = false,
  className,
  tagClassName = '',
  showTagButton = false,
  visibleOnHoverClassName,
  source,
  isInHover = false,
  ...props
}: TagsViewProps) {
  const styles = useStyles();
  const pCard = usePartialVertex(cardManager, ['tags', 'workspace']);
  const cardTags = pCard && Array.from(pCard.tags.values());
  const tags =
    (cardTags &&
      cardTags.filter(
        t =>
          !t.isLoading &&
          !t.isDeleted &&
          (!t.parentTag || !t.parentTag.isLoading)
      )) ||
    [];
  const eventLogger = useEventLogger();

  const onDelete = (tag: Tag) => {
    const newTags = pCard.tags;
    const tagToDelete = tag.parentTag || tag;
    newTags.delete(tagToDelete);
    pCard.tags = newTags;

    eventLogger.cardAction('CARD_TAG_REMOVED', cardManager, {
      source,
      tagId: tag.key,
      parentTagId: tag.parentTagKey,
    });
  };

  const onTagged = (tag: Tag) => {
    const newTags = pCard.tags;

    const tagKey = tag.parentTag || tag;

    const exists = newTags.has(tagKey);
    newTags.set(tagKey, tag);
    pCard.tags = newTags;

    eventLogger.cardAction(
      exists ? 'CARD_TAG_REPLACED' : 'CARD_TAG_ADDED',
      cardManager,
      {
        source,
        tagId: tag.key,
        parentTagId: tag.parentTagKey,
      }
    );
  };

  const tagsMng = new Map<VertexManager<Tag>, VertexManager<Tag>>();
  for (const [p, c] of pCard.tags) {
    tagsMng.set(
      p.manager as VertexManager<Tag>,
      c.manager as VertexManager<Tag>
    );
  }

  return (
    <div
      className={cn(className, styles.tagsView, reverse && styles.reverse)}
      {...props}
    >
      {tags.sort(tagUtils.sortTags).map(tag => (
        <TagView
          key={tag.key}
          tag={tag.manager as VertexManager<Tag>}
          onDelete={onDelete}
          className={cn(styles.tag, tagClassName)}
          onSelected={onTagged}
          showMenu={isInHover}
        />
      ))}
      {showTagButton && (
        <TagButton
          onTagged={onTagged}
          className={visibleOnHoverClassName}
          workspaceManager={pCard.workspace.manager as VertexManager<Workspace>}
          cardTagsMng={tagsMng}
        />
      )}
    </div>
  );
}
