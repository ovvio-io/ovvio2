import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { NoteType } from '@ovvio/cfds/lib/client/graph/vertices/note';
import { layout, styleguide } from '@ovvio/styles/lib';
import { H2 } from '@ovvio/styles/lib/components/typography';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { MediaQueries } from '@ovvio/styles/lib/responsive';
import { createUseStrings } from 'core/localization';
import { useReffedValue } from 'core/react-utils';
import { useSyncUrlParam } from 'core/react-utils/history/use-sync-url-param';
import { useEffect, useState } from 'react';
import { useDemoInfo } from 'shared/demo';
import { ToolbarCenterItem } from '../toolbar';
import { BoardView } from './board-view';
import localization from './cards-display.strings.json';
import {
  DisplayBar,
  GroupBy,
  MOBILE_PADDING,
  SIDES_PADDING,
  TABLET_PADDING,
  ViewType,
} from './display-bar';
import { FiltersView } from './display-bar/filters';
import { ActiveFiltersView } from './display-bar/filters/active-filters';
import { useFiltersController } from './display-bar/filters/state';
import { SearchField } from './display-bar/search-field';
import { ListView, SortBy } from './list-view';
import { SearchResults } from './search-results';
import { VideoTutorial } from './video-demo';

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

export interface CardsDisplayProps {
  selectedWorkspaces: VertexManager<Workspace>[];
}

function isQueryValid(query: string): boolean {
  return query && query.length >= 2;
}

let firstLoad = true;

export function CardsDisplay({ selectedWorkspaces }: CardsDisplayProps) {
  const styles = useStyles();
  const { isInDemo } = useDemoInfo();
  const [viewType, setViewType] = useState(
    isInDemo ? ViewType.Board : ViewType.List
  );
  const [noteType, setNoteType] = useState(NoteType.Task);
  const [sortBy, setSortBy] = useState(SortBy.Priority);
  const [groupBy, setGroupBy] = useState<GroupBy>(
    selectedWorkspaces.length < 1 ? { type: 'workspace' } : { type: 'assignee' }
  );
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const strings = useStrings();
  const length = useReffedValue(selectedWorkspaces.length);
  const tasksFilter = useFiltersController(selectedWorkspaces);
  const notesFilter = useFiltersController(selectedWorkspaces);
  const filtersController =
    noteType === NoteType.Task ? tasksFilter : notesFilter;
  useEffect(() => {
    if (viewType === ViewType.Board) {
      setGroupBy(
        length.current > 1 ? { type: 'workspace' } : { type: 'assignee' }
      );
    }
  }, [viewType, length]);

  useEffect(() => {
    if (isInDemo && firstLoad) {
      firstLoad = false;
      setViewType(ViewType.Board);
    }
  }, [isInDemo]);

  useSyncUrlParam(
    'filter',
    true,
    filtersController.activeFilters,
    filtersController.setActiveFilters,
    {
      isReady: !filtersController.isLoading,
      route: '/',
    }
  );

  let content = null;
  const isInSearch = isQueryValid(query);
  if (isInSearch) {
    content = (
      <SearchResults
        className={cn(styles.contentView)}
        query={query}
        selectedWorkspaces={selectedWorkspaces}
      />
    );
  } else {
    if (viewType === ViewType.List) {
      const sort = isInSearch ? SortBy.LastModified : sortBy;
      content = (
        <ListView
          noteType={noteType}
          className={cn(styles.contentView)}
          selectedWorkspaces={selectedWorkspaces}
          sortBy={sort}
          filters={filtersController}
        />
      );
    } else if (viewType === ViewType.Board) {
      content = (
        <BoardView
          noteType={noteType}
          className={cn(styles.contentView)}
          selectedWorkspaces={selectedWorkspaces}
          groupBy={groupBy}
          filters={filtersController}
        />
      );
    }
  }

  return (
    <div className={cn(styles.displayRoot)}>
      <VideoTutorial />
      <div className={cn(styles.displayMain)}>
        {!isInSearch ? (
          <DisplayBar
            filters={filtersController}
            noteType={noteType}
            setNoteType={setNoteType}
            viewType={viewType}
            setViewType={setViewType}
            groupBy={groupBy}
            setGroupBy={setGroupBy}
            sortBy={sortBy}
            setSortBy={setSortBy}
            selectedWorkspaces={selectedWorkspaces}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
          />
        ) : (
          <H2 className={cn(styles.title)}>{strings.searchResults}</H2>
        )}
        <ToolbarCenterItem className={cn(layout.flexSpacer)}>
          <SearchField query={query} setQuery={setQuery} />
        </ToolbarCenterItem>
        <FiltersView
          filters={filtersController}
          isVisible={showFilters}
          setIsVisible={setShowFilters}
          className={cn(styles.filters)}
        />
        <ActiveFiltersView
          filters={filtersController}
          className={cn(styles.activeFilters)}
        />
        <div className={cn(styles.displayContent)}>{content}</div>
      </div>
    </div>
  );
}
