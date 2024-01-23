import React, { useCallback } from 'react';
import { NoteType } from '../../../../../../../cfds/client/graph/vertices/note.ts';
import IconDropDownArrow from '../../../../../../../styles/components/icons/IconDropDownArrow.tsx';
import Menu, {
  MenuItem,
  SecondaryMenuItem,
} from '../../../../../../../styles/components/menu.tsx';
import { IconGroup } from '../../../../../../../styles/components/new-icons/icon-group.tsx';
import {
  cn,
  makeStyles,
} from '../../../../../../../styles/css-objects/index.ts';
import { layout } from '../../../../../../../styles/layout.ts';
import { styleguide } from '../../../../../../../styles/styleguide.ts';
// import { Text } from '../../../../../../../styles/components/texts.tsx';
import { Text } from '../../../../../../../styles/components/typography.tsx';
import { usePartialView } from '../../../../../core/cfds/react/graph.tsx';
import { useSharedQuery } from '../../../../../core/cfds/react/query.ts';
import { createUseStrings } from '../../../../../core/localization/index.tsx';
import { useLogger } from '../../../../../core/cfds/react/logger.tsx';
import localization from '../cards-display.strings.json' assert { type: 'json' };

const useStyles = makeStyles((theme) => ({
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
  const logger = useLogger();
  const strings = useStrings();
  const view = usePartialView(
    'groupBy',
    'pivot',
    'selectedWorkspaces',
    'noteType',
  );
  const parentTagsByName = useSharedQuery('parentTagsByName');
  const parentNames = parentTagsByName.groups().filter((gid) => {
    for (const mgr of parentTagsByName.group(gid)) {
      if (view.selectedWorkspaces.has(mgr.getVertexProxy().workspace)) {
        return true;
      }
    }
    return false;
  });

  const setGroup = (
    group: 'assignee' | 'workspace' | 'dueDate' | 'note' | 'team',
  ) => {
    logger.log({
      severity: 'EVENT',
      event: 'FilterChange',
      type: `groupBy:${group}`,
      source: 'toolbar:groupBy',
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

  const setTag = useCallback(
    (tagName: string) => {
      logger.log({
        severity: 'EVENT',
        event: 'FilterChange',
        groupBy: 'tag',
        source: 'toolbar:groupBy',
        pivot: tagName,
      });
      view.groupBy = 'tag';
      view.pivot = tagName;
    },
    [logger, view],
  );

  const parentNoteGrouping =
    view.noteType === NoteType.Task ? (
      <MenuItem onClick={() => setGroup('note')}>{strings.parentNote}</MenuItem>
    ) : null;

  return (
    <Menu renderButton={renderButton} align="start" position="bottom">
      <MenuItem onClick={() => setGroup('workspace')}>
        {strings.workspace}
      </MenuItem>
      <MenuItem onClick={() => setGroup('assignee')}>
        {strings.assignee}
      </MenuItem>
      <MenuItem onClick={() => setGroup('dueDate')}>{strings.dueDate}</MenuItem>
      <MenuItem onClick={() => setGroup('team')}>{strings.team}</MenuItem>
      {parentNoteGrouping}
      <SecondaryMenuItem text={strings.groupByTag}>
        {parentNames.map((name) =>
          name === 'Status' ? null : (
            <MenuItem onClick={() => setTag(name!)}>{name}</MenuItem>
          ),
        )}
      </SecondaryMenuItem>
    </Menu>
  );
}
