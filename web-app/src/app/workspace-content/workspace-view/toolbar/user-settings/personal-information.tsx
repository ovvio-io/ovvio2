// import React, { useCallback } from "react";

// import { styleguide } from "../../../../../../../styles/styleguide.ts";
// import { layout } from "../../../../../../../styles/layout.ts";
// import { brandLightTheme as theme } from "../../../../../../../styles/theme.tsx";
// import { MediaQueries } from "../../../../../../../styles/responsive.ts";
// import {
//   makeStyles,
//   cn,
// } from "../../../../../../../styles/css-objects/index.ts";
// import { useButtonStyles } from "../../../../../../../styles/components/buttons.tsx";
// import {
//   SortBy,
//   ShowChecked,
//   kShowChecked,
//   DateFilter,
//   kDateFilters,
//   TabId,
//   kTabIds,
// } from "../../../../../../../cfds/base/scheme-types.ts";
// import { usePartialView } from "../../../../../core/cfds/react/graph.tsx";

// const BUTTON_HEIGHT = styleguide.gridbase * 4;
// export const SIDES_PADDING = styleguide.gridbase * 11;
// export const MOBILE_PADDING = styleguide.gridbase;
// export const TABLET_PADDING = styleguide.gridbase;

// const useStyles = makeStyles(() => ({
//   bar: {
//     justifyContent: "flex-end",
//     alignItems: "stretch",
//     marginTop: styleguide.gridbase * 4,
//     boxSizing: "border-box",
//     basedOn: [layout.column],
//   },
//   barRow: {
//     padding: [0, SIDES_PADDING],
//     height: styleguide.gridbase * 5,
//     basedOn: [layout.row, layout.centerCenter],
//   },
//   viewRow: {
//     borderBottom: `${theme.supporting.O1} 1px solid`,
//     marginBottom: styleguide.gridbase,
//     padding: 0,
//   },
//   filters: {
//     padding: [0, SIDES_PADDING],
//     [MediaQueries.TabletOnly]: {
//       padding: [0, TABLET_PADDING],
//     },
//     [MediaQueries.Mobile]: {
//       padding: [0, MOBILE_PADDING],
//     },
//   },
//   dropDownButtonText: {
//     marginLeft: styleguide.gridbase,
//     marginRight: styleguide.gridbase,
//   },
//   dropDownButton: {
//     // marginRight: styleguide.gridbase * 3,
//     basedOn: [layout.row, layout.centerCenter],
//   },

//   viewToggle: {},
//   noteTypeToggleBig: {
//     width: styleguide.gridbase * 60,
//   },
//   noteTypeToggleSmall: {
//     width: styleguide.gridbase * 40,
//   },
//   separator: {
//     height: BUTTON_HEIGHT,
//     width: 1,
//     margin: [0, styleguide.gridbase],
//     background: theme.secondary.s5,
//   },
//   filterButton: {
//     height: BUTTON_HEIGHT,
//     borderRadius: BUTTON_HEIGHT * 0.5,
//     padding: [0, styleguide.gridbase * 2],
//     background: theme.colors.secondaryButton,
//     color: theme.colors.text,
//     basedOn: [useButtonStyles.button],
//   },
//   hasFilters: {
//     backgroundColor: theme.colors.secondaryButtonActive,
//   },
//   iconItem: {
//     padding: styleguide.gridbase,
//   },
//   extraFiltersSeparator: {
//     display: "inline-block",
//     width: "2px",
//     height: "24px",
//     backgroundColor: theme.secondary.s5,
//     borderRadius: "2px",
//     // margin: [0, styleguide.gridbase * 2],
//   },
// }));

// function TabView() {
//   const strings = useStrings();
//   const styles = useStyles();
//   const view = usePartialView("noteType", "selectedTabId");

//   const setSelected = useCallback(
//     (tabId: TabId) => {
//       view.selectedTabId = tabId;
//       if (tabId !== "overview") {
//         view.noteType = tabId === "tasks" ? NoteType.Task : NoteType.Note;
//       }
//       view.closeFiltersDrawer();
//     },
//     [view]
//   );
//   const tabs: React.ReactElement[] = [];
//   for (const tabId of ["tasks", "notes"] as TabId[]) {
//     tabs.push(<TabButton value={tabId}>{strings[tabId]}</TabButton>);
//   }
//   return (
//     <TabsHeader
//       selected={view.selectedTabId}
//       setSelected={setSelected}
//       className={cn(styles.noteTypeToggleSmall)}
//     >
//       {...tabs}
//     </TabsHeader>
//   );
// }

// export type DisplayBarProps = {
//   className?: string;
// };

// export function DisplayBar(props?: DisplayBarProps) {
//   const { className, ...rest } = props || {};
//   const styles = useStyles();
//   const view = usePartialView("selectedTabId");
//   // useSyncedFilter(props);

//   const leftHand = (
//     <>
//       <FilterButton />
//       <div className={cn(styles.separator)} />
//       <ViewToggle className={cn(styles.viewToggle)} />
//     </>
//   );

//   return (
//     <div className={cn(styles.bar, className)}>
//       <div className={cn(styles.barRow, styles.viewRow)}>
//         <TabView />
//       </div>
//       <div className={cn(styles.barRow)}>
//         {view.selectedTabId !== "overview" ? leftHand : null}
//         <div className={cn(layout.flexSpacer)} />
//         <ExtraFilters {...rest} />
//         <ToolbarRightItem>
//           <ComposeButton />
//         </ToolbarRightItem>
//       </div>
//     </div>
//   );
// }
