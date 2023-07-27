import React, { useCallback } from 'react';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import { layout, styleguide } from '../../../../../../../styles/index.ts';
import { IconGroup } from '../../../../../../../styles/components/new-icons/icon-group.tsx';
import Menu, {
  MenuItem,
  SecondaryMenuItem,
} from '../../../../../../../styles/components/menu.tsx';
import { Text } from '../../../../../../../styles/components/texts.tsx';
import {
  cn,
  makeStyles,
} from '../../../../../../../styles/css-objects/index.ts';
import { createUseStrings } from '../../../../../core/localization/index.tsx';
import localization from '../cards-display.strings.json' assert { type: 'json' };
import { useLogger } from '../../../../../core/cfds/react/logger.tsx';
import { usePartialFilter } from '../../../../index.tsx';
import { useSharedQuery } from '../../../../../core/cfds/react/query.ts';
import { Tag } from '../../../../../../../cfds/client/graph/vertices/tag.ts';
import { usePartialVertex } from '../../../../../core/cfds/react/vertex.ts';
import { FilterGroupBy } from '../../../../../../../cfds/base/scheme-types.ts';
import { VertexId } from '../../../../../../../cfds/client/graph/vertex.ts';

const useStyles = makeStyles((theme) => ({
  dropDownButtonText: {
    marginLeft: styleguide.gridbase,
  },
  dropDownButton: {
    marginRight: styleguide.gridbase * 3,
    basedOn: [layout.row, layout.centerCenter],
  },
}));

const useStrings = createUseStrings(localization);

interface GroupByTagButtonProps {
  tag: VertexId<Tag>;
}

function GroupByTagButton({ tag }: GroupByTagButtonProps) {
  const { parentTag, name: childName } = usePartialVertex(tag, [
    'parentTag',
    'name',
  ]);
  const { name: parentName } = usePartialVertex(parentTag!.manager, ['name']);
  return <Text>{`${parentName}/${childName}`}</Text>;
}

export function GroupByDropDown() {
  const styles = useStyles();
  const logger = useLogger();
  const strings = useStrings();
  const partialFilter = usePartialFilter(['groupBy', 'groupByPivot']);
  const parentTagsQuery = useSharedQuery('parentTags');

  const setGroup = useCallback(
    (group: 'assignee' | 'workspace') => {
      logger.log({
        severity: 'INFO',
        event: 'FilterChange',
        type: ('groupBy:' + group) as FilterGroupBy,
      });
      partialFilter.groupBy = group;
    },
    [logger, partialFilter]
  );
  const renderButton = useCallback(() => {
    const content =
      partialFilter.groupBy === 'tag' ? (
        <GroupByTagButton
          tag={partialFilter.groupByPivot!.manager as VertexManager<Tag>}
        />
      ) : (
        <Text>{strings[partialFilter.groupBy!]}</Text>
      );

    return (
      <div className={cn(styles.dropDownButton)}>
        <IconGroup />
        <Text className={cn(styles.dropDownButtonText)}>
          {strings.groupBy}:&nbsp;
        </Text>
        {content}
      </div>
    );
  }, [strings, partialFilter, styles]);

  const setTag = useCallback(
    (tag: Tag) => {
      logger.log({
        severity: 'INFO',
        event: 'FilterChange',
        type: 'groupBy:tag',
        vertex: tag.key,
      });
      partialFilter.groupBy = 'tag';
      partialFilter.groupByPivot = tag;
    },
    [logger, partialFilter]
  );

  return (
    <Menu renderButton={renderButton} align="start">
      <MenuItem onClick={() => setGroup('workspace')}>
        {strings.workspace}
      </MenuItem>
      <MenuItem onClick={() => setGroup('assignee')}>
        {strings.assignee}
      </MenuItem>
      <SecondaryMenuItem text={strings.groupByTag}>
        {parentTagsQuery.map((tag) => (
          <MenuItem key={tag.key} onClick={() => setTag(tag)}>
            {tag.name}
          </MenuItem>
        ))}
      </SecondaryMenuItem>
    </Menu>
  );
}
