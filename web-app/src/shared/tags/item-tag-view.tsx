import React, { useCallback } from 'react';
import { cn, makeStyles } from '../../../../styles/css-objects/index.ts';
import { layout, styleguide } from '../../../../styles/index.ts';
import { Note, Tag } from '../../../../cfds/client/graph/vertices/index.ts';
import { VertexManager } from '../../../../cfds/client/graph/vertex-manager.ts';
import { usePartialVertex } from '../../core/cfds/react/vertex.ts';
import TagView from './tag-view.tsx';
import TagButton from './tag-button.tsx';
import { UISource } from '../../../../logging/client-events.ts';
import { useLogger } from '../../core/cfds/react/logger.tsx';
import { coreValueCompare } from '../../../../base/core-types/comparable.ts';

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
  source: UISource;
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
  const tags = (cardTags &&
    cardTags.filter(
      (t) => !t.isNull && !t.isDeleted && (!t.parentTag || !t.parentTag.isNull),
    )) ||
    [];
  const logger = useLogger();

  const onDelete = useCallback(
    (tag: Tag) => {
      const newTags = pCard.tags;
      const tagToDelete = tag.parentTag || tag;
      newTags.delete(tagToDelete);
      pCard.tags = newTags;

      logger.log({
        severity: 'EVENT',
        event: 'MetadataChanged',
        type: 'tag',
        vertex: pCard.key,
        removed: tag.key,
      });
    },
    [pCard, logger],
  );

  const onTagged = useCallback(
    (tag: Tag) => {
      const newTags = pCard.tags;

      const tagKey = tag.parentTag || tag;

      const currentSubtag = newTags.get(tagKey);
      newTags.set(tagKey, tag);
      pCard.tags = newTags;

      logger.log({
        severity: 'EVENT',
        event: 'MetadataChanged',
        type: 'tag',
        vertex: pCard.key,
        added: tag.key,
        removed: currentSubtag?.key,
      });
    },
    [pCard, logger],
  );

  const tagsMng = new Map<VertexManager<Tag>, VertexManager<Tag>>();
  for (const [p, c] of pCard.tags) {
    tagsMng.set(
      p.manager as VertexManager<Tag>,
      c.manager as VertexManager<Tag>,
    );
  }

  return (
    <div
      className={cn(className, styles.tagsView, reverse && styles.reverse)}
      {...props}
    >
      {tags.sort(coreValueCompare).map((tag) => (
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
          noteId={cardManager}
        />
      )}
    </div>
  );
}
