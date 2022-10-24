import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { NoteType } from '@ovvio/cfds/lib/client/graph/vertices/note';
import { layout, styleguide } from '@ovvio/styles/lib';
import { Button, useButtonStyles } from '@ovvio/styles/lib/components/buttons';
import { IconSort } from '@ovvio/styles/lib/components/new-icons/icon-sort';
import { IconFilter } from '@ovvio/styles/lib/components/new-icons/icon-filter';
import DropDown, {
  DropDownItem,
} from '@ovvio/styles/lib/components/inputs/drop-down';
import { TabButton, TabsHeader } from '@ovvio/styles/lib/components/tabs';
import { Text } from '@ovvio/styles/lib/components/texts';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { brandLightTheme as theme } from '@ovvio/styles/lib/theme';
import { createUseStrings } from 'core/localization';
import { useSyncUrlParam } from 'core/react-utils/history/use-sync-url-param';
import React, { useCallback } from 'react';
import { UserOnboard } from 'shared/tutorial';
import { EventCategory, useEventLogger } from '../../../../../core/analytics';
import { ToolbarRightItem } from '../../toolbar';
import localization from '../cards-display.strings.json';
import { SortBy } from '../list-view';
import { VideoTutorialId } from '../video-demo';
import { ComposeButton } from './compose-button';
import { FiltersStateController, SharedParentTag } from './filters/state';
import { GroupByDropDown } from './group-by-drop-down';
import { useDisplayBarTutorialSteps } from './tutorial';
import { ViewToggle } from './view-toggle';
import { MediaQueries } from '@ovvio/styles/lib/responsive';

const BUTTON_HEIGHT = styleguide.gridbase * 4;
export const SIDES_PADDING = styleguide.gridbase * 11;
export const MOBILE_PADDING = styleguide.gridbase;
export const TABLET_PADDING = styleguide.gridbase;

const useStyles = makeStyles(() => ({
  bar: {
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    marginTop: styleguide.gridbase * 2,
    boxSizing: 'border-box',
    basedOn: [layout.column],
  },
  barRow: {
    padding: [0, SIDES_PADDING],
    height: styleguide.gridbase * 6,
    basedOn: [layout.row, layout.centerCenter],
  },
  viewRow: {
    borderBottom: `${theme.supporting.O1} 1px solid`,
    marginBottom: styleguide.gridbase,
    padding: 0,
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
  dropDownButtonText: {
    marginLeft: styleguide.gridbase,
  },
  dropDownButton: {
    marginRight: styleguide.gridbase * 3,
    basedOn: [layout.row, layout.centerCenter],
  },

  viewToggle: {},
  noteTypeToggle: {
    width: styleguide.gridbase * 40,
  },
  separator: {
    height: BUTTON_HEIGHT,
    width: 1,
    margin: [0, styleguide.gridbase],
    background: theme.secondary.s5,
  },
  filterButton: {
    height: BUTTON_HEIGHT,
    borderRadius: BUTTON_HEIGHT * 0.5,
    padding: [0, styleguide.gridbase * 2],
    background: theme.colors.secondaryButton,
    color: theme.colors.text,
    basedOn: [useButtonStyles.button],
  },
  hasFilters: {
    backgroundColor: theme.colors.secondaryButtonActive,
  },
}));

const useStrings = createUseStrings(localization);

export enum ViewType {
  List = 'list',
  Grouped = 'grouped',
  Board = 'board',
}

export type GroupBy =
  | {
      type: 'assignee' | 'workspace';
    }
  | {
      type: 'tag';
      tag: SharedParentTag;
    };

type ExtraFiltersProps = {
  filters: FiltersStateController;
  viewType: ViewType;
  sortBy: SortBy;
  setSortBy: (sortBy: SortBy) => void;
  groupBy: GroupBy;
  setGroupBy: (groupBy: GroupBy) => void;
  selectedWorkspaces: VertexManager<Workspace>[];
};

const SORT_BY = [
  SortBy.Priority,
  SortBy.Created,
  SortBy.LastModified,
  SortBy.DueDate,
];
function parseSortBy(str: string): SortBy {
  if (SORT_BY.includes(str as any)) {
    return str as SortBy;
  }
  return SortBy.Priority;
}

function SortByDropDown({
  sortBy,
  setSortBy,
}: {
  sortBy: SortBy;
  setSortBy: (sortBy: SortBy) => void;
}) {
  const styles = useStyles();
  const strings = useStrings();
  const eventLogger = useEventLogger();

  useSyncUrlParam('sortBy', false, sortBy, val => setSortBy(parseSortBy(val)));

  const renderSelected = useCallback(
    () => (
      <div className={cn(styles.dropDownButton)}>
        <IconSort />
        <Text className={cn(styles.dropDownButtonText)}>{strings[sortBy]}</Text>
      </div>
    ),
    [strings, sortBy, styles]
  );

  const onOpen = () => {
    eventLogger.action('SORTBY_CHANGE_STARTED', {
      category: EventCategory.CARD_LIST,
    });
  };

  const onChange = (val: any) => {
    eventLogger.action('SORTBY_CHANGE_COMPLETED', {
      category: EventCategory.CARD_LIST,
      source: val,
    });
    setSortBy(val);
  };

  return (
    <DropDown
      value={sortBy}
      onChange={onChange}
      renderSelected={renderSelected}
      onOpen={onOpen}
    >
      {SORT_BY.map(x => (
        <DropDownItem value={x} key={x}>
          <Text>{strings[x]}</Text>
        </DropDownItem>
      ))}
    </DropDown>
  );
}

function ExtraFilters(props: ExtraFiltersProps) {
  let content = null;
  if (props.viewType === ViewType.List) {
    content = (
      <SortByDropDown sortBy={props.sortBy} setSortBy={props.setSortBy} />
    );
  } else {
    content = (
      <GroupByDropDown
        filters={props.filters}
        groupBy={props.groupBy}
        setGroupBy={props.setGroupBy}
        selectedWorkspaces={props.selectedWorkspaces}
      />
    );
  }

  return <>{content}</>;
}

interface FilterButtonProps {
  showFilters: boolean;
  setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
}

function FilterButton({ showFilters, setShowFilters }: FilterButtonProps) {
  const styles = useStyles();
  const strings = useStrings();
  const eventLogger = useEventLogger();

  const filterButtonClicked = () => {
    eventLogger.action(showFilters ? 'FILTER_BAR_HIDDEN' : 'FILTER_BAR_SHOWN', {
      category: EventCategory.FILTERS,
    });
    setShowFilters(x => !x);
  };

  return (
    <Button
      onClick={filterButtonClicked}
      className={cn(styles.filterButton, showFilters && styles.hasFilters)}
    >
      <IconFilter />
      <Text className={cn(styles.dropDownButtonText)}>{strings.filter}</Text>
    </Button>
  );
}

interface NoteTypeToggleProps {
  noteType: NoteType;
  setNoteType: (noteType: NoteType) => void;
}

function parseNoteType(val: string): NoteType {
  if (val && val.toLowerCase() === NoteType.Note) {
    return NoteType.Note;
  }
  return NoteType.Task;
}

function NoteTypeToggle({ noteType, setNoteType }: NoteTypeToggleProps) {
  const strings = useStrings();
  const styles = useStyles();
  useSyncUrlParam('type', false, noteType, val =>
    setNoteType(parseNoteType(val))
  );
  return (
    <TabsHeader
      selected={noteType}
      setSelected={setNoteType}
      className={cn(styles.noteTypeToggle)}
    >
      <TabButton value={NoteType.Task}>{strings.task}</TabButton>
      <TabButton value={NoteType.Note}>{strings.note}</TabButton>
    </TabsHeader>
  );
}

export type DisplayBarProps = ExtraFiltersProps &
  FilterButtonProps &
  NoteTypeToggleProps & {
    setViewType: (viewType: ViewType) => void;
    className?: string;
  };

const After = [VideoTutorialId];

export function DisplayBar(props: DisplayBarProps) {
  const {
    noteType,
    setNoteType,
    setViewType,
    className,
    showFilters,
    setShowFilters,
    selectedWorkspaces,
    ...rest
  } = props;
  const { viewType } = props;
  const styles = useStyles();
  const steps = useDisplayBarTutorialSteps();
  // useSyncedFilter(props);

  return (
    <UserOnboard playAfter={After} tutorialId="DISPLAY_BAR" steps={steps}>
      <div className={cn(styles.bar, className)}>
        <div className={cn(styles.barRow, styles.viewRow)}>
          <NoteTypeToggle noteType={noteType} setNoteType={setNoteType} />
        </div>
        <div className={cn(styles.barRow)}>
          <FilterButton
            showFilters={showFilters}
            setShowFilters={setShowFilters}
          />
          <div className={cn(styles.separator)} />
          <ViewToggle
            viewType={viewType}
            setViewType={setViewType}
            className={cn(styles.viewToggle)}
          />
          <div className={cn(layout.flexSpacer)} />
          <ExtraFilters {...rest} selectedWorkspaces={selectedWorkspaces} />
          <ToolbarRightItem>
            <ComposeButton selectedWorkspaces={selectedWorkspaces} />
          </ToolbarRightItem>
        </div>
      </div>
    </UserOnboard>
  );
}
