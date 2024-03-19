import React, { useCallback, useMemo } from 'react';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import { Tag } from '../../../../../../../cfds/client/graph/vertices/index.ts';
import { usePartialVertex } from '../../../../../core/cfds/react/vertex.ts';
import {
  Pill,
  PillContent,
  PillAction,
} from '../../../../../shared/pill/index.tsx';
import TagButton from '../../../../../shared/tags/tag-button.tsx';
import TagView from '../../../../../shared/tags/tag-view.tsx';
import { Text } from '../../../../../../../styles/components/texts.tsx';
import {
  makeStyles,
  cn,
} from '../../../../../../../styles/css-objects/index.ts';
import { CardHeaderPartProps, CardSize } from './index.tsx';
import { useLogger } from '../../../../../core/cfds/react/logger.tsx';
import { coreValueCompare } from '../../../../../../../base/core-types/comparable.ts';
import { lightColorWheel } from '../../../../../../../styles/theme.tsx';

const useStyles = makeStyles((theme) => ({
  tagsView: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    flexDirection: 'row',
  },
  hide: {
    opacity: 0,
  },
  tagText: {
    color: lightColorWheel.mono.m4,
  },
}));

interface TagPillProps {
  tag: VertexManager<Tag>;
  setTag: (tag: VertexManager<Tag>) => void;
  isExpanded?: boolean;
  onDelete: () => void;
  ofBoard?: boolean;
}

function TagPill({ tag, setTag, onDelete, isExpanded, ofBoard }: TagPillProps) {
  const styles = useStyles();
  const { name } = usePartialVertex(tag, ['name']);
  const renderSelected = useCallback(
    () => (
      <Pill extended={isExpanded}>
        <PillAction>
          <PillContent>
            {ofBoard && !ofBoard ? (
              <Text>#{name}</Text>
            ) : (
              <div className={styles.tagText}>#{name}</div>
            )}
          </PillContent>
        </PillAction>
      </Pill>
    ),
    [name, isExpanded, styles]
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

export function CardTagsNew({
  card,
  size,
  isExpanded,
  multiIsActive,
}: CardHeaderPartProps) {
  const { tags, workspace } = usePartialVertex(card, ['tags', 'workspace']);
  const styles = useStyles();
  const logger = useLogger();
  const cardTags = Array.from(tags.values()).filter(
    (tag) =>
      !tag.isNull &&
      !tag.isDeleted &&
      (!tag.parentTag || !tag.parentTag.isDeleted)
  );

  const onDelete = useCallback(
    (tagManager: VertexManager<Tag>) => {
      const tag = tagManager.getVertexProxy();
      const proxy = card.getVertexProxy();
      const newTags = proxy.tags;
      const tagToDelete = tag.parentTag || tag;
      newTags.delete(tagToDelete);
      proxy.tags = newTags;
    },
    [card, logger]
  );

  const onTag = useCallback(
    (tagManager: VertexManager<Tag>) => {
      const proxy = card.getVertexProxy();
      const tag = tagManager.getVertexProxy();
      const newTags = proxy.tags;

      const tagKey = tag.parentTag || tag;

      const currentTag = newTags.get(tagKey);
      newTags.set(tagKey, tag);
      proxy.tags = newTags;
    },
    [card, logger]
  );

  return (
    <div className={cn(styles.tagsView, size === CardSize.Small)}>
      {!multiIsActive && (
        <TagButton
          onTagged={(t) => onTag(t.manager as VertexManager<Tag>)}
          noteId={card}
          className={cn(!isExpanded && styles.hide)}
        />
      )}
      {cardTags.sort(coreValueCompare).map((tag) => (
        <TagPill
          key={tag.key}
          tag={tag.manager as VertexManager<Tag>}
          onDelete={() => onDelete(tag.manager as VertexManager<Tag>)}
          setTag={onTag}
          isExpanded={true}
          ofBoard={true}
        />
      ))}
    </div>
  );
}
