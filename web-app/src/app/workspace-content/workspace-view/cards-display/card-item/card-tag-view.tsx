import React, { useCallback, useMemo } from 'react';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import {
  Tag,
  Workspace,
} from '../../../../../../../cfds/client/graph/vertices/index.ts';
import { usePartialVertex } from '../../../../../core/cfds/react/vertex.ts';
import {
  Pill,
  PillStyle,
  PillContent,
  PillAction,
} from '../../../../../shared/pill/index.tsx';
import TagButton from '../../../../../shared/tags/tag-button.tsx';
import TagView from '../../../../../shared/tags/tag-view.tsx';
import { styleguide, layout } from '../../../../../../../styles/index.ts';
import { IconDropDownArrow } from '../../../../../../../styles/components/icons/index.ts';
import { Text } from '../../../../../../../styles/components/texts.tsx';
import {
  makeStyles,
  cn,
} from '../../../../../../../styles/css-objects/index.ts';
import { CardHeaderPartProps, CardSize } from './index.tsx';
import { useLogger } from '../../../../../core/cfds/react/logger.tsx';
import { coreValueCompare } from '../../../../../../../base/core-types/comparable.ts';
import {
  brandLightTheme,
  lightColorWheel,
} from '../../../../../../../styles/theme.tsx';

const useStyles = makeStyles((theme) => ({
  tagsView: {
    // height: styleguide.gridbase * 3,
    alignItems: 'center',
    // basedOn: [layout.row],
    display: 'flex',
    flexDirection: 'row',
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
  tagText: {
    color: lightColorWheel.mono.m4,
  },
}));

interface TagPillProps {
  tag: VertexManager<Tag>;
  setTag: (tag: VertexManager<Tag>) => void;
  isExpanded: boolean;
  onDelete: () => void;
  ofBoard?: boolean;
}

function TagPill({ tag, setTag, onDelete, isExpanded, ofBoard }: TagPillProps) {
  const styles = useStyles();
  const { name } = usePartialVertex(tag, ['name']);
  const renderSelected = useCallback(
    () => (
      <Pill
        className={cn(styles.tag)}
        extended={isExpanded}
        pillStyle={isExpanded ? PillStyle.Border : PillStyle.None}
      >
        <PillContent>
          {ofBoard && !ofBoard ? (
            <Text>#{name}</Text>
          ) : (
            <div className={styles.tagText}>#{name}</div>
          )}
        </PillContent>
        <PillAction>
          <IconDropDownArrow />
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

export function CardTags({
  card,
  size,
  isExpanded,
  source,
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

  // const tagManagers = useMemo(
  //   () =>
  //     new Map(
  //       Array.from(tags.entries()).map(([parent, child]) => [
  //         parent.manager as VertexManager<Tag>,
  //         child.manager as VertexManager<Tag>,
  //       ])
  //     ),
  //   [tags]
  // );

  const onDelete = useCallback(
    (tagManager: VertexManager<Tag>) => {
      const tag = tagManager.getVertexProxy();
      const proxy = card.getVertexProxy();
      const newTags = proxy.tags;
      const tagToDelete = tag.parentTag || tag;
      newTags.delete(tagToDelete);
      proxy.tags = newTags;

      logger.log({
        severity: 'INFO',
        event: 'MetadataChanged',
        type: 'tag',
        removed: tag.key,
        vertex: card.key,
        source,
      });
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

      logger.log({
        severity: 'INFO',
        event: 'MetadataChanged',
        type: 'tag',
        vertex: card.key,
        removed: currentTag?.key,
        added: tag.key,
        source,
      });
    },
    [card, logger]
  );

  return (
    <div
      className={cn(
        styles.tagsView,
        size === CardSize.Small && styles.tagsWrap
      )}
    >
      {cardTags.sort(coreValueCompare).map((tag) => (
        <TagPill
          key={tag.key}
          tag={tag.manager as VertexManager<Tag>}
          onDelete={() => onDelete(tag.manager as VertexManager<Tag>)}
          setTag={onTag}
          isExpanded={isExpanded}
          ofBoard={true}
        />
      ))}
      <TagButton
        onTagged={(t) => onTag(t.manager as VertexManager<Tag>)}
        noteId={card}
        className={cn(!isExpanded && styles.hide)}
      />
    </div>
  );
}
