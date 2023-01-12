import React, { useEffect, useState } from 'https://esm.sh/react@18.2.0';
import { VertexManager } from '../../../../../../cfds/client/graph/vertex-manager.ts';
import { Workspace } from '../../../../../../cfds/client/graph/vertices/workspace.ts';
import { NoteType } from '../../../../../../cfds/client/graph/vertices/note.ts';
import { layout, styleguide } from '../../../../../../styles/index.ts';
import { H2 } from '../../../../../../styles/components/typography.tsx';
import { cn, makeStyles } from '../../../../../../styles/css-objects/index.ts';
import { MediaQueries } from '../../../../../../styles/responsive.ts';
import { createUseStrings } from '../../../../core/localization/index.tsx';
import { useReffedValue } from '../../../../core/react-utils/index.ts';
import { useSyncUrlParam } from '../../../../core/react-utils/history/use-sync-url-param.ts';
import { useDemoInfo } from '../../../../shared/demo/index.tsx';
import { ToolbarCenterItem } from '../toolbar/index.tsx';
import { BoardView } from './board-view/index.tsx';
import localization from './cards-display.strings.json' assert { type: 'json' };
import {
  DisplayBar,
  GroupBy,
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
import { Filter } from '../../../../../../cfds/client/graph/vertices/filter.ts';
import { useGraphManager } from '../../../../core/cfds/react/graph.tsx';
import { useContext } from 'https://esm.sh/v99/@types/react@18.0.25/index.d.ts';
import { NS_FILTER } from '../../../../../../cfds/base/scheme-types.ts';
import { useVertex } from '../../../../core/cfds/react/vertex.ts';

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

export interface CardsDisplayProps {
  selectedWorkspaces: VertexManager<Workspace>[];
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
