import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DateFilter,
  kDateFilters,
  kShowChecked,
  kTabIds,
  ShowChecked,
  SortBy,
  TabId,
} from '../../../../../../../cfds/base/scheme-types.ts';
import {
  Note,
  NoteType,
} from '../../../../../../../cfds/client/graph/vertices/note.ts';
import { Role } from '../../../../../../../cfds/client/graph/vertices/role.ts';
import { User } from '../../../../../../../cfds/client/graph/vertices/user.ts';
import {
  Button,
  useButtonStyles,
} from '../../../../../../../styles/components/buttons.tsx';
import IconDropDownArrow from '../../../../../../../styles/components/icons/IconDropDownArrow.tsx';
import IconFilter from '../../../../../../../styles/components/icons/IconFilter.tsx';
import DropDown, {
  DropDownItem,
} from '../../../../../../../styles/components/inputs/drop-down.tsx';
import { IconSort } from '../../../../../../../styles/components/new-icons/icon-sort.tsx';
import {
  TabButton,
  TabsHeader,
} from '../../../../../../../styles/components/tabs/index.tsx';
import {
  cn,
  makeStyles,
} from '../../../../../../../styles/css-objects/index.ts';
import { layout } from '../../../../../../../styles/layout.ts';
import { MediaQueries } from '../../../../../../../styles/responsive.ts';
import { styleguide } from '../../../../../../../styles/styleguide.ts';
// import { Text } from '../../../../../../../styles/components/texts.tsx';
import { Text } from '../../../../../../../styles/components/typography.tsx';
import { brandLightTheme as theme } from '../../../../../../../styles/theme.tsx';
import { IconShow } from '../../../../../../../styles/components/new-icons/icon-show.tsx';
import { IconPin } from '../../../../../../../styles/components/new-icons/icon-pin.tsx';
import { IconCollapseExpand } from '../../../../../../../styles/components/new-icons/icon-collapse-expand.tsx';
import {
  useGraphManager,
  usePartialView,
} from '../../../../../core/cfds/react/graph.tsx';
import { createUseStrings } from '../../../../../core/localization/index.tsx';
import { ToolbarRightItem } from '../../toolbar/index.tsx';
import { ComposeButton } from './compose-button.tsx';
import { GroupByDropDown } from './group-by-drop-down.tsx';
import { ViewToggle } from './view-toggle.tsx';
import { useLogger } from '../../../../../core/cfds/react/logger.tsx';
import localization from '../cards-display.strings.json' assert { type: 'json' };
import { IconCheck } from '../../../../../../../styles/components/new-icons/icon-check.tsx';
import {
  DueDateState,
  IconDueDate,
} from '../../../../../../../styles/components/new-icons/icon-due-date.tsx';
import Wizard from '../../../../settings/components/wizard.tsx';
import { MultiSelectBar } from '../../multi-select-bar.tsx';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import { useDisable } from '../../../../index.tsx';
import { usePartialRootUser } from '../../../../../core/cfds/react/graph.tsx';

const BUTTON_HEIGHT = styleguide.gridbase * 4;
export const SIDES_PADDING = styleguide.gridbase * 11;
export const MOBILE_PADDING = styleguide.gridbase;
export const TABLET_PADDING = styleguide.gridbase;

const useStyles = makeStyles(() => ({
  bar: {
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    marginTop: styleguide.gridbase * 4,
    boxSizing: 'border-box',
    basedOn: [layout.column],
  },
  barRow: {
    padding: `0px ${SIDES_PADDING}px`,
    height: styleguide.gridbase * 5,
    basedOn: [layout.row, layout.centerCenter],
  },
  viewRow: {
    borderBottom: `${theme.supporting.O1} 1px solid`,
    marginBottom: styleguide.gridbase,
    padding: 0,
  },
  filters: {
    padding: `0px ${SIDES_PADDING}px`,
    [MediaQueries.TabletOnly]: {
      padding: `0px ${TABLET_PADDING}px`,
    },
    [MediaQueries.Mobile]: {
      padding: `0px ${MOBILE_PADDING}px`,
    },
  },
  dropDownButtonText: {
    marginLeft: styleguide.gridbase,
    marginRight: styleguide.gridbase,
  },
  dropDownButton: {
    // marginRight: styleguide.gridbase * 3,
    basedOn: [layout.row, layout.centerCenter],
  },
  viewToggle: {},
  noteTypeToggleBig: {
    width: styleguide.gridbase * 60,
  },
  noteTypeToggleSmall: {
    width: styleguide.gridbase * 40,
  },
  separator: {
    height: BUTTON_HEIGHT,
    width: 1,
    margin: `0px ${styleguide.gridbase}px`,
    background: theme.secondary.s5,
  },
  filterButton: {
    height: BUTTON_HEIGHT,
    borderRadius: BUTTON_HEIGHT * 0.5,
    padding: `0px ${styleguide.gridbase * 2}px`,
    background: theme.colors.secondaryButton,
    color: theme.colors.text,
    basedOn: [useButtonStyles.button],
    ':hover': {
      backgroundColor: theme.secondary.s4,
    },
  },
  hasFilters: {
    backgroundColor: theme.colors.secondaryButtonActive,
  },
  iconItem: {
    padding: styleguide.gridbase,
  },
  extraFiltersSeparator: {
    display: 'inline-block',
    width: '2px',
    height: '24px',
    backgroundColor: theme.secondary.s5,
    borderRadius: '2px',
    // margin: [0, styleguide.gridbase * 2],
  },
}));

const useStrings = createUseStrings(localization);

const SORT_BY = [
  SortBy.DueDateAscending,
  SortBy.DueDateDescending,
  SortBy.LastModifiedDescending,
  SortBy.CreatedAscending,
  SortBy.CreatedDescending,
  SortBy.TitleAscending,
  SortBy.TitleDescending,
];

function SortByDropDown() {
  const styles = useStyles();
  const strings = useStrings();
  const logger = useLogger();
  const view = usePartialView('sortBy');

  const renderSelected = useCallback(
    () => (
      <div className={cn(styles.dropDownButton, styles.iconItem)}>
        <IconSort />
        <Text className={cn(styles.dropDownButtonText)}>
          {strings.sortBy}:&nbsp;{strings[view.sortBy]}
        </Text>
        <IconDropDownArrow />
      </div>
    ),
    [strings, view, styles]
  );

  const onChange = useCallback(
    (val: SortBy) => {
      logger.log({
        severity: 'EVENT',
        event: 'FilterChange',
        type: `sortBy:${val}`,
        source: 'toolbar:sortBy',
      });
      view.sortBy = val;
    },
    [view, logger]
  );

  return (
    <DropDown
      value={view.sortBy}
      onChange={onChange}
      renderSelected={renderSelected}
    >
      {SORT_BY.map((x) => (
        <DropDownItem value={x} key={x}>
          <Text>{strings[x]}</Text>
          {view.sortBy === x && <IconCheck />}
        </DropDownItem>
      ))}
    </DropDown>
  );
}

function ShowCheckedDropDown() {
  const styles = useStyles();
  const strings = useStrings();
  const view = usePartialView('showChecked');
  // const eventLogger = useEventLogger();

  const renderSelected = useCallback(
    () => (
      <div className={cn(styles.dropDownButton, styles.iconItem)}>
        <IconShow />
        <Text className={cn(styles.dropDownButtonText)}>
          {strings.showChecked}:&nbsp;{strings[view.showChecked]}
        </Text>
        <IconDropDownArrow />
      </div>
    ),
    [strings, view, styles]
  );

  const onOpen = () => {
    // eventLogger.action('SORTBY_CHANGE_STARTED', {
    //   category: EventCategory.CARD_LIST,
    // });
  };

  const onChange = useCallback(
    (val: ShowChecked) => {
      // eventLogger.action('SORTBY_CHANGE_COMPLETED', {
      //   category: EventCategory.CARD_LIST,
      //   source: val,
      // });
      view.showChecked = val;
    },
    [view]
  );

  return (
    <DropDown
      value={view.showChecked}
      onChange={onChange}
      renderSelected={renderSelected}
      onOpen={onOpen}
    >
      {kShowChecked.map((x) => (
        <DropDownItem value={x} key={`show-checked/${x}`}>
          <Text>{strings[x]}</Text>
          {view.showChecked === x && <IconCheck />}
        </DropDownItem>
      ))}
    </DropDown>
  );
}

function DateFilterDropdown() {
  const styles = useStyles();
  const strings = useStrings();
  const view = usePartialView('dateFilter', 'selectedTabId');

  const text = view.dateFilter
    ? `${
        view.selectedTabId === 'overview' ? strings.timeFrame : strings.dueBy
      } ${
        (view.selectedTabId === 'overview' ? '' : strings.thisPrefix + ' ') +
        strings[view.dateFilter]
      }`
    : view.selectedTabId === 'overview'
    ? strings.noTimeFrame
    : strings.noDateFilter;

  const renderSelected = useCallback(
    () => (
      <div className={cn(styles.dropDownButton, styles.iconItem)}>
        <IconDueDate state={DueDateState.None} />

        <Text className={cn(styles.dropDownButtonText)}>{text}</Text>
        <IconDropDownArrow />
      </div>
    ),
    [styles.dropDownButton, styles.iconItem, styles.dropDownButtonText, text]
  );

  const onOpen = () => {
    // eventLogger.action('SORTBY_CHANGE_STARTED', {
    //   category: EventCategory.CARD_LIST,
    // });
  };

  const onChange = useCallback(
    (val: DateFilter | undefined) => {
      // eventLogger.action('SORTBY_CHANGE_COMPLETED', {
      //   category: EventCategory.CARD_LIST,
      //   source: val,
      // });
      view.dateFilter = val;
    },
    [view]
  );

  return (
    <DropDown
      value={view.dateFilter}
      onChange={onChange}
      renderSelected={renderSelected}
      onOpen={onOpen}
    >
      <DropDownItem value={undefined} key={'clearDueDateFilter'}>
        <Text>{strings.all}</Text>
        {view.dateFilter === undefined && <IconCheck />}
      </DropDownItem>
      {kDateFilters.map((x) => (
        <DropDownItem value={x} key={x}>
          <Text>
            {(view.selectedTabId === 'overview'
              ? ''
              : strings.thisPrefix + ' ') + strings[x]}
          </Text>
          {view.dateFilter === x && <IconCheck />}
        </DropDownItem>
      ))}
    </DropDown>
  );
}

function ShowPinnedButton() {
  const view = usePartialView('showPinned');
  const styles = useStyles();

  const togglePinned = useCallback(() => {
    view.showPinned =
      view.showPinned === 'pinned' ? 'pinned-unpinned' : 'pinned';
  }, [view, view.showPinned]);

  return (
    <Button
      onClick={togglePinned}
      className={cn(styles.iconItem)}
      // className={cn(styles.filterButton, styles.hasFilters)}
    >
      <IconPin on={view.showPinned === 'pinned'} />
    </Button>
  );
}

export function CollapseExpandeToggle() {
  const view = usePartialView('notesExpandBase');
  const styles = useStyles();

  const togglePinned = useCallback(() => {
    view.notesExpandBase = !view.notesExpandBase;
    view.notesExpandOverride = new Set();
  }, [view]);

  return (
    <Button
      className={cn(styles.iconItem)}
      onClick={togglePinned}
      // className={cn(styles.filterButton, styles.hasFilters)}
    >
      <IconCollapseExpand on={view.notesExpandBase} />
    </Button>
  );
}

function ExtraFilters() {
  const styles = useStyles();
  const graph = useGraphManager();
  const items: JSX.Element[] = [];
  // const rootUser = graph.getRootVertex<User>();
  const view = usePartialView('noteType', 'viewType');
  // if (unassignableRole.has(rootUser) || rootUser.email.endsWith('@ovvio.io')) {
  //   if (items.length > 0) {
  //     items.push(<div className={cn(styles.extraFiltersSeparator)}></div>);
  //   }
  //   items.push(<DownloadCSVButton />);
  // }
  if (items.length > 0) {
    items.push(<div className={cn(styles.extraFiltersSeparator)}></div>);
  }
  items.push(<DateFilterDropdown />);
  if (view.selectedTabId !== 'overview') {
    if (items.length > 0) {
      items.push(<div className={cn(styles.extraFiltersSeparator)}></div>);
    }
    items.push(<ShowCheckedDropDown />);
  }
  if (view.selectedTabId !== 'overview') {
    if (items.length > 0) {
      items.push(<div className={cn(styles.extraFiltersSeparator)}></div>);
    }
    items.push(<SortByDropDown />);
  }
  if (view.selectedTabId !== 'overview') {
    if (items.length > 0) {
      items.push(<div className={cn(styles.extraFiltersSeparator)}></div>);
    }
    items.push(<GroupByDropDown />);
  }
  if (view.selectedTabId !== 'overview') {
    if (items.length > 0) {
      items.push(<div className={cn(styles.extraFiltersSeparator)}></div>);
    }
    items.push(<CollapseExpandeToggle />);
    items.push(<div className={cn(styles.extraFiltersSeparator)}></div>);
    items.push(<ShowPinnedButton />);
    items.push(<div className={cn(styles.extraFiltersSeparator)}></div>);
  }
  return <>{...items}</>;
}

function FilterButton() {
  const styles = useStyles();
  const strings = useStrings();
  const logger = useLogger();
  const view = usePartialView('showFilters');

  const filterButtonClicked = useCallback(() => {
    logger.log({
      severity: 'EVENT',
      event: view.showFilters ? 'Show' : 'Hide',
      source: 'toolbar:filterMenu',
    });
    view.showFilters = !view.showFilters;
  }, [logger, view]);

  return (
    <Button
      onClick={filterButtonClicked}
      className={cn(styles.filterButton, view.showFilters && styles.hasFilters)}
    >
      <img src="/icons/filter-small.svg" />
      <Text className={cn(styles.dropDownButtonText)}>{strings.filter}</Text>
    </Button>
  );
}

function parseNoteType(val: string): NoteType {
  if (val && val.toLowerCase() === NoteType.Note) {
    return NoteType.Note;
  }
  return NoteType.Task;
}

function TabView() {
  const strings = useStrings();
  const styles = useStyles();
  const view = usePartialView('noteType', 'selectedTabId');
  const partialUser = usePartialRootUser('permissions');

  const setSelected = useCallback(
    (tabId: TabId) => {
      view.selectedTabId = tabId;
      if (tabId !== 'overview') {
        view.noteType = tabId === 'tasks' ? NoteType.Task : NoteType.Note;
      }
      view.closeFiltersDrawer();
    },
    [view]
  );
  const tabs: React.ReactElement[] = [];
  const availableTabs: TabId[] = ['tasks', 'notes'];
  if (partialUser.permissions.has('view:dashboard')) {
    availableTabs.push('overview');
  }
  for (const tabId of availableTabs as TabId[]) {
    tabs.push(<TabButton value={tabId}>{strings[tabId]}</TabButton>);
  }
  return (
    <TabsHeader
      selected={view.selectedTabId}
      setSelected={setSelected}
      // className={cn(styles.noteTypeToggleSmall)}
    >
      {...tabs}
    </TabsHeader>
  );
}

export type DisplayBarProps = {
  className?: string;
  onCloseMultiSelect: () => void;
  selectedCards?: Set<VertexManager<Note>>;
  setSelectedCards: (card: Set<VertexManager<Note>>) => void;
};

export function DisplayBar(props?: DisplayBarProps) {
  const {
    className,
    selectedCards,
    onCloseMultiSelect,
    setSelectedCards,
    ...rest
  } = props || {};
  const styles = useStyles();
  const view = usePartialView('selectedTabId');
  // useSyncedFilter(props);

  // Hack: This component gets rendered before the top toolbar container that's
  // designed to hold the compose button. To work around it we force a delayed
  // re-render.
  const [_, setComposeButtonHackCount] = useState(0);
  useEffect(() => {
    setTimeout(() => setComposeButtonHackCount(1), 50);
  }, []);

  const leftHand = (
    <>
      <FilterButton />
      <div className={cn(styles.separator)} />
      <ViewToggle className={cn(styles.viewToggle)} />
    </>
  );

  const { setDisable } = useDisable()!;

  const multiIsOpen = useMemo(() => {
    const isOpen = !!selectedCards && selectedCards.size > 0;
    setDisable(isOpen);
    return isOpen;
  }, [selectedCards, setDisable]);

  return (
    <div className={cn(styles.bar, className)}>
      {selectedCards && multiIsOpen ? (
        <MultiSelectBar
          selectedCards={selectedCards}
          onClose={onCloseMultiSelect}
          setSelectedCards={setSelectedCards!}
        />
      ) : (
        ''
      )}
      <div className={cn(styles.barRow, styles.viewRow)}>
        <TabView />
      </div>
      <div className={cn(styles.barRow)}>
        {view.selectedTabId !== 'overview' ? leftHand : null}
        <div className={cn(layout.flexSpacer)} />
        <ExtraFilters {...rest} />
        <ToolbarRightItem>
          <ComposeButton />
        </ToolbarRightItem>
      </div>
    </div>
  );
}
