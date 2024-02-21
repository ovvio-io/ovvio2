import React from 'react';
import { H2 } from '../../../../../../styles/components/typography.tsx';
import { makeStyles, cn } from '../../../../../../styles/css-objects/index.ts';
import { layout } from '../../../../../../styles/layout.ts';
import { MediaQueries } from '../../../../../../styles/responsive.ts';
import { styleguide } from '../../../../../../styles/styleguide.ts';
import { usePartialView } from '../../../../core/cfds/react/graph.tsx';
import { createUseStrings } from '../../../../core/localization/index.tsx';
import { ToolbarCenterItem } from '../toolbar/index.tsx';
import { BoardView } from './board-view/index.tsx';
import { ActiveFiltersView } from './display-bar/filters/active-filters.tsx';
import { FiltersView } from './display-bar/filters/index.tsx';
import {
  SIDES_PADDING,
  TABLET_PADDING,
  MOBILE_PADDING,
  DisplayBar,
} from './display-bar/index.tsx';
import { ListView } from './list-view/index.tsx';
import localization from './cards-display.strings.json' assert { type: 'json' };
import { KanbanView } from './kanban-view/index.tsx';
import { useFilteredNotes } from '../../../../core/cfds/react/filter.ts';
import { ListViewNew } from './list-view-new/index.tsx';

const useStyles = makeStyles((theme) => ({
  displayRoot: {
    flexShrink: 0,
    flexGrow: 0,
    overflowY: 'auto',
    height: '100%',
    width: '100%',
    basedOn: [layout.row],
  },
  displayMain: {
    position: 'relative',
    height: '100%',
    overflow: 'hidden',
    flexShrink: 1,
    flexGrow: 1,
    basedOn: [layout.column, layout.flex],
    backgroundColor: theme.background[100],
  },
  displayContent: {
    boxSizing: 'border-box',
    padding: [styleguide.gridbase * 2, 0],
    overflow: 'hidden',
    basedOn: [layout.flexSpacer],
  },
  title: {
    marginTop: styleguide.gridbase * 2,
    padding: [0, styleguide.gridbase * 2],
    height: styleguide.gridbase * 6,
    boxSizing: 'border-box',
  },
  contentView: {
    padding: [0, SIDES_PADDING],
    [MediaQueries.TabletOnly]: {
      padding: [0, TABLET_PADDING],
    },
    [MediaQueries.Mobile]: {
      padding: [0, MOBILE_PADDING],
    },
  },
  filters: {
    padding: [0, SIDES_PADDING],
    [MediaQueries.TabletOnly]: {
      padding: [0, TABLET_PADDING],
    },
    [MediaQueries.Mobile]: {
      padding: [0, MOBILE_PADDING],
    },
  },
  activeFilters: {
    padding: [styleguide.gridbase * 2, SIDES_PADDING],

    [MediaQueries.TabletOnly]: {
      padding: [styleguide.gridbase * 2, TABLET_PADDING],
    },
    [MediaQueries.TabletOnly]: {
      padding: [styleguide.gridbase * 2, MOBILE_PADDING],
    },
  },
}));

export function CardsDisplay() {
  const styles = useStyles();
  const view = usePartialView('viewType', 'selectedTabId');
  let content = null;
  if (view.viewType === 'list') {
    // content = <ListView key={'list'} className={cn(styles.contentView)} />;
    content = <ListViewNew key={'list'} className={cn(styles.contentView)} />;
  } else if (view.viewType === 'board') {
    content = (
      <KanbanView className={cn(styles.contentView)} />
      // <BoardView className={cn(styles.contentView)} />
    );
  }

  return (
    <div className={cn(styles.displayRoot)}>
      <div className={cn(styles.displayMain)}>
        <DisplayBar />
        <ToolbarCenterItem
          className={cn(layout.flexSpacer)}
        ></ToolbarCenterItem>
        <FiltersView className={cn(styles.filters)} />
        <ActiveFiltersView className={cn(styles.activeFilters)} />
        <div className={cn(styles.displayContent)}>{content}</div>
      </div>
    </div>
  );
}
