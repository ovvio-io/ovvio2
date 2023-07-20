import React, { useEffect, useState } from 'react';
import { layout, styleguide } from '../../../../../../styles/index.ts';
import { H2 } from '../../../../../../styles/components/typography.tsx';
import { cn, makeStyles } from '../../../../../../styles/css-objects/index.ts';
import { MediaQueries } from '../../../../../../styles/responsive.ts';
import { createUseStrings } from '../../../../core/localization/index.tsx';
import { ToolbarCenterItem } from '../toolbar/index.tsx';
import { BoardView } from './board-view/index.tsx';
import localization from './cards-display.strings.json' assert { type: 'json' };
import {
  DisplayBar,
  MOBILE_PADDING,
  SIDES_PADDING,
  TABLET_PADDING,
  ViewType,
} from './display-bar/index.tsx';
import { FiltersView } from './display-bar/filters/index.tsx';
import { ActiveFiltersView } from './display-bar/filters/active-filters.tsx';
import { SearchField } from './display-bar/search-field.tsx';
import { ListView } from './list-view/index.tsx';
import { SearchResults } from './search-results/index.tsx';
import { useFilter } from '../../../index.tsx';
import { useSharedQuery } from '../../../../core/cfds/react/query.ts';

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

const useStrings = createUseStrings(localization);

export function CardsDisplay() {
  const styles = useStyles();
  const [viewType, setViewType] = useState(ViewType.List);
  // const [noteType, setNoteType] = useState(NoteType.Task);
  // const [sortBy, setSortBy] = useState(SortBy.Priority);
  // const [groupBy, setGroupBy] = useState<GroupBy>(
  //   selectedWorkspaces.length < 1 ? { type: 'workspace' } : { type: 'assignee' }
  // );
  // const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const strings = useStrings();
  const filter = useFilter();
  const selectedWorkspacesQuery = useSharedQuery('selectedWorkspaces');
  // const length = useReffedValue(selectedWorkspaces.length);
  // const tasksFilter = useFiltersController(selectedWorkspaces);
  // const notesFilter = useFiltersController(selectedWorkspaces);
  // const filtersController =
  //   noteType === NoteType.Task ? tasksFilter : notesFilter;
  useEffect(() => {
    if (viewType === ViewType.Board) {
      filter.groupBy =
        selectedWorkspacesQuery.count > 1 ? 'workspace' : 'assignee';
    }
  }, [viewType, filter, selectedWorkspacesQuery]);
  // useSyncUrlParam(
  //   'filter',
  //   true,
  //   filtersController.activeFilters,
  //   filtersController.setActiveFilters,
  //   {
  //     isReady: !filtersController.isLoading,
  //     route: '/',
  //   }
  // );

  let content = null;
  const isInSearch = (filter.textQuery?.length || 0) > 0;
  if (isInSearch) {
    content = <SearchResults className={cn(styles.contentView)} />;
  } else {
    if (viewType === ViewType.List) {
      content = <ListView className={cn(styles.contentView)} />;
    } else if (viewType === ViewType.Board) {
      content = <BoardView className={cn(styles.contentView)} />;
    }
  }

  return (
    <div className={cn(styles.displayRoot)}>
      <div className={cn(styles.displayMain)}>
        {!isInSearch ? (
          <DisplayBar
            viewType={viewType}
            setViewType={setViewType}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
          />
        ) : (
          <H2 className={cn(styles.title)}>{strings.searchResults}</H2>
        )}
        <ToolbarCenterItem className={cn(layout.flexSpacer)}>
          <SearchField
            query={filter.textQuery}
            setQuery={(q) => {
              filter.textQuery = q;
            }}
          />
        </ToolbarCenterItem>
        <FiltersView
          isVisible={showFilters}
          setIsVisible={setShowFilters}
          className={cn(styles.filters)}
        />
        <ActiveFiltersView className={cn(styles.activeFilters)} />
        <div className={cn(styles.displayContent)}>{content}</div>
      </div>
    </div>
  );
}
