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
  TabButton,
  TabsHeader,
} from "../../../../../../../styles/components/tabs/index.tsx";
import { createUseStrings } from "../../../../../core/localization/index.tsx";
import localization from "../user-settings/settings.strings.json" assert { type: "json" };
import { IconCompose } from "../../../../../../../styles/components/new-icons/icon-compose.tsx";
import { IconDuplicate } from "../../../../../../../styles/components/new-icons/icon-duplicate.tsx";
import { IconCompose2 } from "../../../../../../../styles/components/new-icons/icon-compose2.tsx";

const BUTTON_HEIGHT = styleguide.gridbase * 4;
export const SIDES_PADDING = styleguide.gridbase * 11;
export const MOBILE_PADDING = styleguide.gridbase;
export const TABLET_PADDING = styleguide.gridbase;

const useStyles = makeStyles(() => ({
  root: {
    height: "100vh", // 100% of the viewport height
    background: "var(--secondary-secondary-s-0, #FFFBF5)",
    overflow: "auto", // In case the content is taller than the viewport
  },

  bar: {
    justifyContent: "flex-end",
    alignItems: "stretch",
    boxSizing: "border-box",
    basedOn: [layout.column],
  },
  barRow: {
    padding: ["40px", 0],
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
  },
  infoLight: {
    color: "var(--monochrom-m-3, #B3B3B3)",
    fontSize: "13px",
    fontStyle: "normal",
    fontWeight: "400",
    lineHeight: "normal",
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
    },
    [view]
  );
  const tabs: React.ReactElement[] = [];
  for (const tabId of ["general", "details"] as TabId[]) {
    tabs.push(<TabButton value={tabId}>{strings[tabId]}</TabButton>);
  }

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

  function GeneralTabContent() {
    const styles = useStyles();
    const userData = usePartialRootUser("name", "email");
    return (
      <div className={cn(styles.barRow)}>
        <div className={cn(styles.title)}>
          Full Name
          <div className={cn(styles.info)}>
            {userData.name} <IconCompose2 style={{ paddingLeft: "8px" }} />
          </div>
        </div>
        <div className={cn(styles.title)}>
          Email Address
          <div className={cn(styles.info)}>{userData.email}</div>
        </div>
        <div className={cn(styles.title)}>
          <div className={cn(styles.info)}>Forgot your password?</div>
        </div>
      </div>
    );
  }

  function DetailsTabContent() {
    const styles = useStyles();
    const userData = usePartialRootUser("name", "email");
    return (
      <div className={cn(styles.barRow)}>
        <div className={cn(styles.title)}>
          Team
          <div className={cn(styles.infoLight)}>
            Add team's name
            <IconCompose2 style={{ paddingLeft: "8px" }} />
          </div>
        </div>
        <div className={cn(styles.title)}>
          Company Roles
          <div className={cn(styles.infoLight)}>
            Add member’s role/s in the company. Separate between roles by “;”
            <IconCompose2 style={{ paddingLeft: "8px" }} />
          </div>
        </div>
        <div className={cn(styles.title)}>
          Comments
          <div className={cn(styles.infoLight)}>
            Add free text
            <IconCompose2 style={{ paddingLeft: "8px" }} />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={styles.root}>
      {" "}
      <div className={cn(styles.bar, className)}>
        <div className={cn(styles.dialogHeader)}>Personal Information</div>
        <div className={cn(styles.barRow, styles.viewRow)}>
          <TabView />
          {view.selectedTabId === "general" && <GeneralTabContent />}
          {view.selectedTabId === "details" && <DetailsTabContent />}
        </div>
      </div>
    </div>
  );
}
