import React, { useCallback } from 'https://esm.sh/react@18.2.0';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import { Workspace } from '../../../../../../../cfds/client/graph/vertices/workspace.ts';
import { NoteType } from '../../../../../../../cfds/client/graph/vertices/note.ts';
import { layout, styleguide } from '../../../../../../../styles/index.ts';
import {
  Button,
  useButtonStyles,
} from '../../../../../../../styles/components/buttons.tsx';
import { IconSort } from '../../../../../../../styles/components/new-icons/icon-sort.tsx';
import { IconFilter } from '../../../../../../../styles/components/new-icons/icon-filter.tsx';
import DropDown, {
  DropDownItem,
} from '../../../../../../../styles/components/inputs/drop-down.tsx';
import {
  TabButton,
  TabsHeader,
} from '../../../../../../../styles/components/tabs/index.tsx';
import { Text } from '../../../../../../../styles/components/texts.tsx';
import {
  cn,
  makeStyles,
} from '../../../../../../../styles/css-objects/index.ts';
import { brandLightTheme as theme } from '../../../../../../../styles/theme.tsx';
import { MediaQueries } from '../../../../../../../styles/responsive.ts';
import { createUseStrings } from '../../../../../core/localization/index.tsx';
import { ToolbarRightItem } from '../../toolbar/index.tsx';
import localization from '../cards-display.strings.json' assert { type: 'json' };
import { ComposeButton } from './compose-button.tsx';
import { GroupByDropDown } from './group-by-drop-down.tsx';
import { ViewToggle } from './view-toggle.tsx';
import {
  FilterSortBy,
  FilterSortByValues,
} from '../../../../../../../cfds/base/scheme-types.ts';
import { Filter } from '../../../../../../../cfds/client/graph/vertices/index.ts';
import { useLogger } from '../../../../../core/cfds/react/logger.tsx';
import {
  useFilter,
  useFilterContext,
  usePartialFilter,
} from '../../../../index.tsx';
import {
  FilterType,
  UISource,
} from '../../../../../../../logging/client-events.ts';
import { useGraphManager } from '../../../../../core/cfds/react/graph.tsx';

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
  // Grouped = 'grouped',
  Board = 'board',
}

type ExtraFiltersProps = {
  // filters: FiltersStateController;
  viewType: ViewType;
  // sortBy: SortBy;
  // setSortBy: (sortBy: SortBy) => void;
  // groupBy: GroupBy;
  // setGroupBy: (groupBy: GroupBy) => void;
  // selectedWorkspaces: VertexManager<Workspace>[];
};

function SortByDropDown({ source }: { source?: UISource }) {
  const styles = useStyles();
  const strings = useStrings();
  const logger = useLogger();
  const partialFilter = usePartialFilter(['sortBy']);
  const sortBy = partialFilter.sortBy;

  const renderSelected = useCallback(
    () => (
      <div className={cn(styles.dropDownButton)}>
        <IconSort />
        <Text className={cn(styles.dropDownButtonText)}>{strings[sortBy]}</Text>
      </div>
    ),
    [strings, sortBy, styles]
  );

  const onChange = useCallback(
    (val: FilterSortBy) => {
      logger.log({
        severity: 'INFO',
        event: 'FilterChange',
        type: ('sortBy:' + val) as FilterType,
        vertex: partialFilter.key,
        source,
      });
      partialFilter.sortBy = val;
    },
    [logger, partialFilter, source]
  );

  return (
    <DropDown
      value={sortBy}
      onChange={onChange}
      renderSelected={renderSelected}
    >
      {FilterSortByValues.map((x) => (
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
    content = <SortByDropDown />;
  } else {
    content = <GroupByDropDown />;
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
  const logger = useLogger();

  const filterButtonClicked = useCallback(() => {
    logger.log({
      severity: 'INFO',
      event: 'Click',
      source: 'toolbar:filterButton',
      flag: !showFilters,
    });
    setShowFilters((x) => !x);
  }, [logger, showFilters, setShowFilters]);

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

// interface NoteTypeToggleProps {
//   noteType: NoteType;
//   setNoteType: (noteType: NoteType) => void;
// }

// function parseNoteType(val: string): NoteType {
//   if (val && val.toLowerCase() === NoteType.Note) {
//     return NoteType.Note;
//   }
//   return NoteType.Task;
// }

function NoteTypeToggle() {
  const strings = useStrings();
  const styles = useStyles();
  const filterContext = useFilterContext();
  const graph = useGraphManager();
  // useSyncUrlParam('type', false, noteType, (val) =>
  //   setNoteType(parseNoteType(val))
  // );
  return (
    <TabsHeader
      selected={filterContext.filter.getVertexProxy().noteType!}
      setSelected={(type: NoteType) =>
        filterContext.setFilter(
          graph.getVertexManager(
            type === NoteType.Note ? 'NotesFilter' : 'TasksFilter'
          )
        )
      }
      className={cn(styles.noteTypeToggle)}
    >
      <TabButton value={NoteType.Task}>{strings.task}</TabButton>
      <TabButton value={NoteType.Note}>{strings.note}</TabButton>
    </TabsHeader>
  );
}

export type DisplayBarProps = ExtraFiltersProps &
  FilterButtonProps & {
    setViewType: (viewType: ViewType) => void;
    className?: string;
  };

// const After = [VideoTutorialId];

export function DisplayBar(props: DisplayBarProps) {
  const { setViewType, className, showFilters, setShowFilters, ...rest } =
    props;
  const { viewType } = props;
  const styles = useStyles();
  // const steps = useDisplayBarTutorialSteps();
  // useSyncedFilter(props);

  return (
    // <UserOnboard playAfter={After} tutorialId="DISPLAY_BAR" steps={steps}>
    <div className={cn(styles.bar, className)}>
      <div className={cn(styles.barRow, styles.viewRow)}>
        <NoteTypeToggle />
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
        <ExtraFilters {...rest} />
        <ToolbarRightItem>
          <ComposeButton />
        </ToolbarRightItem>
      </div>
    </div>
    // </UserOnboard>
  );
}
