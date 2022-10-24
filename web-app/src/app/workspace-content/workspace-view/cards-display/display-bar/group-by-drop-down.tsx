import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { layout, styleguide } from '@ovvio/styles/lib';
import { IconGroup } from '@ovvio/styles/lib/components/new-icons/icon-group';
import Menu, {
  MenuItem,
  SecondaryMenuItem,
} from '@ovvio/styles/lib/components/menu';
import { Text } from '@ovvio/styles/lib/components/texts';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { useEventLogger } from 'core/analytics';
import { createUseStrings } from 'core/localization';
import { useSyncUrlParam } from 'core/react-utils/history/use-sync-url-param';
import React, { useCallback, useEffect } from 'react';
import localization from '../cards-display.strings.json';
import { FiltersStateController, SharedParentTag } from './filters/state';

const useStyles = makeStyles(theme => ({
  dropDownButtonText: {
    marginLeft: styleguide.gridbase,
  },
  dropDownButton: {
    marginRight: styleguide.gridbase * 3,
    basedOn: [layout.row, layout.centerCenter],
  },
}));

const useStrings = createUseStrings(localization);

export type GroupBy =
  | {
      type: 'assignee' | 'workspace';
    }
  | {
      type: 'tag';
      tag: SharedParentTag;
    };

interface GroupByTagButtonProps {
  tag: SharedParentTag;
  setGroupBy: (groupBy: GroupBy) => void;
  selectedWorkspaces: VertexManager<Workspace>[];
  className?: string;
  filters: FiltersStateController;
}

function GroupByTagButton({
  tag,
  filters,
  className,
  setGroupBy,
  selectedWorkspaces,
}: GroupByTagButtonProps) {
  const equivalent = filters.tags[tag.key];

  useEffect(() => {
    if (filters.isLoading) {
      return;
    }

    if (equivalent && equivalent !== tag) {
      setGroupBy({ type: 'tag', tag: equivalent });
    }
  }, [filters.isLoading, equivalent, tag, setGroupBy]);
  return <Text>{tag.displayName}</Text>;
}

export interface GroupByDropDownProps {
  filters: FiltersStateController;
  groupBy: GroupBy;
  setGroupBy: (groupBy: GroupBy) => void;
  selectedWorkspaces: VertexManager<Workspace>[];
}

function formatGroupBy(groupBy: GroupBy) {
  if (groupBy.type === 'tag') {
    return `${groupBy.type}/${groupBy.tag.key}`;
  }
  return groupBy.type;
}

export function GroupByDropDown({
  groupBy,
  setGroupBy,
  selectedWorkspaces,
  filters,
}: GroupByDropDownProps) {
  const styles = useStyles();
  const eventLogger = useEventLogger();
  const strings = useStrings();

  const mapQuery = (val: string) => {
    if (!val) {
      return;
    }
    const [type, tag] = val.split('/');
    if (type === 'assignee' || type === 'workspace') {
      setGroupBy({ type });
    } else if (tag) {
      const entry = Object.entries(filters.tags).find(
        ([key, x]) => key === tag
      );
      if (!entry) {
        return;
      }
      const [, tagSection] = entry;
      setGroupBy({ type: 'tag', tag: tagSection });
    }
  };
  useSyncUrlParam('groupBy', false, formatGroupBy(groupBy), mapQuery, {
    isReady: !filters.isLoading,
  });

  const setGroup = (group: 'assignee' | 'workspace') => {
    eventLogger.action('SET_GROUP_BY', {
      data: {
        groupBy: group,
      },
    });
    setGroupBy({ type: group });
  };
  const renderButton = useCallback(() => {
    const content =
      groupBy.type === 'tag' ? (
        <GroupByTagButton
          filters={filters}
          tag={groupBy.tag}
          selectedWorkspaces={selectedWorkspaces}
          setGroupBy={setGroupBy}
        />
      ) : (
        <Text>{strings[groupBy.type]}</Text>
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
  }, [strings, groupBy, selectedWorkspaces, setGroupBy, styles, filters]);

  const setTag = (tag: SharedParentTag) => {
    eventLogger.action('SET_GROUP_BY', {
      data: { groupBy: 'tag', tag: tag.displayName },
    });
    setGroupBy({
      type: 'tag',
      tag,
    });
  };

  return (
    <Menu renderButton={renderButton} align="start">
      <MenuItem onClick={() => setGroup('workspace')}>
        {strings.workspace}
      </MenuItem>
      <MenuItem onClick={() => setGroup('assignee')}>
        {strings.assignee}
      </MenuItem>
      <SecondaryMenuItem text={strings.groupByTag}>
        {Object.values(filters.tags).map(x => (
          <MenuItem key={x.key} onClick={() => setTag(x)}>
            {x.displayName}
          </MenuItem>
        ))}
      </SecondaryMenuItem>
    </Menu>
  );
}
