import React, { useCallback, useEffect } from 'https://esm.sh/react@18.2.0';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import { Workspace } from '../../../../../../../cfds/client/graph/vertices/workspace.ts';
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
        {Object.values(filters.tags).map((x) => (
          <MenuItem key={x.key} onClick={() => setTag(x)}>
            {x.displayName}
          </MenuItem>
        ))}
      </SecondaryMenuItem>
    </Menu>
  );
}
