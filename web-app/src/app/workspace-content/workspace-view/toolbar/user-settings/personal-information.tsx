import React, { useCallback, useContext, useEffect, useState } from "react";
import { styleguide } from "../../../../../../../styles/styleguide.ts";
import { layout } from "../../../../../../../styles/layout.ts";
import { brandLightTheme as theme } from "../../../../../../../styles/theme.tsx";
import {
  makeStyles,
  cn,
} from "../../../../../../../styles/css-objects/index.ts";
import { useButtonStyles } from "../../../../../../../styles/components/buttons.tsx";
import { TabId } from "../../../../../../../cfds/base/scheme-types.ts";
import {
  usePartialRootUser,
  usePartialView,
} from "../../../../../core/cfds/react/graph.tsx";
import {
  Tab,
  TabButton,
  TabsHeader,
} from "../../../../../../../styles/components/tabs/index.tsx";
import { createUseStrings } from "../../../../../core/localization/index.tsx";
import localization from "../user-settings/settings.strings.json" assert { type: "json" };

import { usePartialVertex } from "../../../../../core/cfds/react/vertex.ts";

const BUTTON_HEIGHT = styleguide.gridbase * 4;
export const SIDES_PADDING = styleguide.gridbase * 11;
export const MOBILE_PADDING = styleguide.gridbase;
export const TABLET_PADDING = styleguide.gridbase;

const useStyles = makeStyles(() => ({
  bar: {
    justifyContent: "flex-end",
    alignItems: "stretch",
    boxSizing: "border-box",
    basedOn: [layout.column],
  },
  barRow: {
    padding: ["40px", SIDES_PADDING],
    height: styleguide.gridbase * 5,
    basedOn: [layout.column],
  },
  viewRow: {
    borderBottom: `${theme.supporting.O1} 1px solid`,
    marginBottom: styleguide.gridbase,
    padding: [0, SIDES_PADDING],
  },

  dropDownButtonText: {
    marginLeft: styleguide.gridbase,
    marginRight: styleguide.gridbase,
  },

  noteTypeToggleSmall: {
    width: styleguide.gridbase * 40,
  },
  separator: {
    height: BUTTON_HEIGHT,
    width: 1,
    margin: [0, styleguide.gridbase],
    background: theme.secondary.s5,
  },
  iconItem: {
    padding: styleguide.gridbase,
  },
  extraFiltersSeparator: {
    display: "inline-block",
    width: "2px",
    height: "24px",
    backgroundColor: theme.secondary.s5,
    borderRadius: "2px",
    // margin: [0, styleguide.gridbase * 2],
  },
  dialogHeader: {
    width: "100%",
    height: styleguide.gridbase * 14,
    boxSizing: "border-box",
    alignItems: "center",
    padding: [0, SIDES_PADDING],
    basedOn: [layout.row],
  },
  title: {
    fontSize: "13px",
    fontStyle: "normal",
    fontWeight: "600",
    lineHeight: "normal",
    letterSpacing: " 0.075px",
    padding: [0, 0, "40px", 0],
  },
  info: {
    fontSize: "13px",
    fontStyle: "normal",
    fontWeight: "400",
    lineHeight: "normal",
    letterSpacing: " 0.075px",
  },
}));
const useStrings = createUseStrings(localization);

function TabView() {
  const styles = useStyles();
  const strings = useStrings();

  const view = usePartialView("noteType", "selectedTabId");

  const setSelected = useCallback(
    (tabId: TabId) => {
      view.selectedTabId = tabId;
      if (tabId !== "overview") {
        console.log("BABA");
      }
      view.closeFiltersDrawer();
    },
    [view]
  );
  const tabs: React.ReactElement[] = [];
  for (const tabId of ["general", "details"] as TabId[]) {
    tabs.push(<TabButton value={tabId}>{strings[tabId]}</TabButton>);
  }
  // const [tab, setTab] = useState(tabs["general"]);
  // useEffect(() => {
  //   setTab(tabs["general"]);
  // }, []);

  return (
    <TabsHeader
      selected={view.selectedTabId}
      setSelected={setSelected}
      className={cn(styles.noteTypeToggleSmall)}
    >
      {...tabs}
    </TabsHeader>
  );
}

export type PersonalSettingsProps = {
  className?: string;
};

export function PersonalSettings(props?: PersonalSettingsProps) {
  const { className, ...rest } = props || {};
  const styles = useStyles();
  const view = usePartialView("selectedTabId");

  const userData = usePartialRootUser("name", "email");

  return (
    <div className={cn(styles.bar, className)}>
      <div className={cn(styles.dialogHeader)}>Personal Information</div>
      <div className={cn(styles.barRow, styles.viewRow)}>
        <TabView />
      </div>

      <div className={cn(styles.barRow)}>
        <div className={cn(styles.title)}>
          Full Name
          <div className={cn(styles.info)}>{userData.name}</div>
        </div>
        <div className={cn(styles.title)}>
          Email Address
          <div className={cn(styles.info)}>{userData.email}</div>
        </div>
        <div className={cn(styles.title)}>
          <div className={cn(styles.info)}>Forgot your password?</div>
        </div>
      </div>
    </div>
  );
}
