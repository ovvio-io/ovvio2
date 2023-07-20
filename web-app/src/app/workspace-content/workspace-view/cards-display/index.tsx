import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { NoteType } from '@ovvio/cfds/lib/client/graph/vertices/note';
import { layout, styleguide } from '@ovvio/styles/lib';
import { H2 } from '@ovvio/styles/lib/components/typography';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { MediaQueries } from '@ovvio/styles/lib/responsive';
import { createUseStrings } from 'core/localization';
import { useSyncUrlParam } from 'core/react-utils/history/use-sync-url-param';
import { useEffect, useState } from 'react';
import { useDemoInfo } from 'shared/demo';
import { ToolbarCenterItem } from '../toolbar';
import { BoardView } from './board-view';
import localization from './cards-display.strings.json';
import {
  DisplayBar,
  MOBILE_PADDING,
  SIDES_PADDING,
  TABLET_PADDING,
} from './display-bar';
import { FiltersView } from './display-bar/filters';
import { ActiveFiltersView } from './display-bar/filters/active-filters';
import { ListView } from './list-view';
import { VideoTutorial } from './video-demo';
import { usePartialView } from 'core/cfds/react/graph';
import { SortBy } from '@ovvio/cfds/lib/base/scheme-types';
import { Dashboard } from './dashboard/dashboard';

const useStyles = makeStyles(theme => ({
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

const useStrings = createUseStrings(localization);

function isQueryValid(query: string): boolean {
  return query && query.length >= 2;
}

let firstLoad = true;

export function CardsDisplay() {
  const styles = useStyles();
  const view = usePartialView('viewType', 'selectedTabId');
  const strings = useStrings();

  let content = null;
  const isInSearch = false; //isQueryValid(query);
  if (isInSearch) {
    // content = (
    //   <SearchResults
    //     className={cn(styles.contentView)}
    //     searchTerm={query}
    //   />
    // );
  } else if (view.selectedTabId === 'overview') {
    content = <Dashboard />;
  } else {
    if (view.viewType === 'list') {
      content = <ListView key={'list'} className={cn(styles.contentView)} />;
    } else if (view.viewType === 'board') {
      content = <BoardView className={cn(styles.contentView)} />;
    }
  }

  return (
    <div className={cn(styles.displayRoot)}>
      <VideoTutorial />
      <div className={cn(styles.displayMain)}>
        {!isInSearch ? (
          <DisplayBar />
        ) : (
          <H2 className={cn(styles.title)}>{strings.searchResults}</H2>
        )}
        <ToolbarCenterItem className={cn(layout.flexSpacer)}>
          {/* <SearchField query={query} setQuery={setQuery} /> */}
        </ToolbarCenterItem>
        <FiltersView className={cn(styles.filters)} />
        <ActiveFiltersView className={cn(styles.activeFilters)} />
        <div className={cn(styles.displayContent)}>{content}</div>
      </div>
    </div>
  );
}
