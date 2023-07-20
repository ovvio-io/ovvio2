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
import { NoteType } from '@ovvio/cfds/lib/client/graph/vertices/note';
import IconDropDownArrow from '@ovvio/styles/lib/components/icons/IconDropDownArrow';
import { usePartialView } from 'core/cfds/react/graph';
import { GroupBy } from '@ovvio/cfds/lib/base/scheme-types';
import { useSharedQuery } from 'core/cfds/react/query';

const useStyles = makeStyles(theme => ({
  dropDownButtonText: {
    marginLeft: styleguide.gridbase,
  },
  dropDownButton: {
    // marginRight: styleguide.gridbase * 3,
    padding: styleguide.gridbase,
    basedOn: [layout.row, layout.centerCenter],
  },
}));

const useStrings = createUseStrings(localization);

export function GroupByDropDown() {
  const styles = useStyles();
  const eventLogger = useEventLogger();
  const strings = useStrings();
  const view = usePartialView(
    'groupBy',
    'pivot',
    'selectedWorkspaces',
    'noteType'
  );
  const parentTagsByName = useSharedQuery('parentTagsByName');
  const parentNames = parentTagsByName.groups().filter(gid => {
    for (const mgr of parentTagsByName.group(gid)) {
      if (view.selectedWorkspaces.has(mgr.getVertexProxy().workspace)) {
        return true;
      }
    }
    return false;
  });

  const setGroup = (group: 'assignee' | 'workspace' | 'dueDate' | 'note') => {
    eventLogger.action('SET_GROUP_BY', {
      data: {
        groupBy: group,
      },
    });
    view.groupBy = group;
    delete view.pivot;
  };
  const renderButton = useCallback(() => {
    const content =
      view.groupBy === 'tag' ? (
        <Text>{view.pivot}</Text>
      ) : (
        <Text>{strings[view.groupBy]}</Text>
      );

    return (
      <div className={cn(styles.dropDownButton)}>
        <IconGroup />
        <Text className={cn(styles.dropDownButtonText)}>
          {strings.groupBy}:&nbsp;
        </Text>
        {content}
        <IconDropDownArrow />
      </div>
    );
  }, [strings, styles, view]);

  const setTag = (tagName: string) => {
    eventLogger.action('SET_GROUP_BY', {
      data: { groupBy: 'tag', tag: tagName },
    });
    view.groupBy = 'tag';
    view.pivot = tagName;
  };

  const parentNoteGrouping =
    view.noteType === NoteType.Task ? (
      <MenuItem onClick={() => setGroup('note')}>{strings.parentNote}</MenuItem>
    ) : null;

  return (
    <Menu renderButton={renderButton} align="start">
      <MenuItem onClick={() => setGroup('workspace')}>
        {strings.workspace}
      </MenuItem>
      <MenuItem onClick={() => setGroup('assignee')}>
        {strings.assignee}
      </MenuItem>
      <MenuItem onClick={() => setGroup('dueDate')}>{strings.dueDate}</MenuItem>
      {parentNoteGrouping}
      <SecondaryMenuItem text={strings.groupByTag}>
        {parentNames.map(name =>
          name === 'Status' ? null : (
            <MenuItem onClick={() => setTag(name)}>{name}</MenuItem>
          )
        )}
      </SecondaryMenuItem>
    </Menu>
  );
}
