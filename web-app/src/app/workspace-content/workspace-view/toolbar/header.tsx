// import React, { useCallback } from "react";
// import { useNavigate } from "react-router";
// import { Button } from "../../../../../../styles/components/buttons.tsx";
// import IconOverflow from "../../../../../../styles/components/icons/IconOverflow.tsx";
// import Menu, {
//   MenuItemStyle,
//   MenuItem,
// } from "../../../../../../styles/components/menu.tsx";
// import { useTypographyStyles } from "../../../../../../styles/components/typography.tsx";
// import { makeStyles, cn } from "../../../../../../styles/css-objects/index.ts";
// import { layout } from "../../../../../../styles/layout.ts";
// import { styleguide } from "../../../../../../styles/styleguide.ts";
// import { useGraphManager } from "../../../../core/cfds/react/graph.tsx";
// import { useExistingQuery } from "../../../../core/cfds/react/query.ts";
// import { usePartialVertices } from "../../../../core/cfds/react/vertex.ts";
// import { isWindowsOS } from "../../../../utils.ts";
// import { useLogger } from "../../../../core/cfds/react/logger.tsx";

// const useStyles = makeStyles((theme) => ({
//   headerRoot: {
//     basedOn: [layout.column],
//   },
//   headerContent: {
//     height: styleguide.gridbase * 9,
//     alignItems: "center",
//     basedOn: [layout.row],
//   },
//   headerText: {
//     marginLeft: styleguide.gridbase * 2.5,
//     fontSize: 18,
//     lineHeight: `${styleguide.gridbase * 3}px`,
//     letterSpacing: "1px",
//     basedOn: [useTypographyStyles.bold],
//   },
//   menu: {
//     maxHeight: MenuItemStyle.rules.height * 8,
//     // overflowY: "auto", //TODO: need to be removed because the arrow must be out of the box.
//   },
//   iconAvatar: {
//     backgroundColor: "var(--secondarys-3)",
//     border: "2px solid",
//     borderColor: "var(--secondarys-7)",
//     borderRadius: "20px",
//     height: "40px",
//     width: "40px",
//   },
//   group: {
//     height: "24px",
//     left: "7px",
//     position: "relative",
//     top: "6px",
//     width: "26px",
//   },
//   overlapGroup: {
//     height: "24px",
//     position: "relative",
//     width: "22px",
//   },
//   textWrapper: {
//     color: "var(--primaryp9-icon)",
//     fontFamily: "var(--headline-h3-font-family)",
//     fontSize: "var(--headline-h3-font-size)",
//     fontStyle: "var(--headline-h3-font-style)",
//     fontWeight: "var(--headline-h3-font-weight)",
//     height: "24px",
//     left: "0",
//     letterSpacing: "var(--headline-h3-letter-spacing)",
//     lineHeight: "var(--headline-h3-line-height)",
//     opacity: 0.6,
//     position: "absolute",
//     top: "0",
//     whiteSpace: "nowrap",
//   },
//   div: {
//     color: "var(--primaryp9-icon)",
//     fontFamily: "var(--headline-h3-font-family)",
//     fontSize: "var(--headline-h3-font-size)",
//     fontStyle: "var(--headline-h3-font-style)",
//     fontWeight: "var(--headline-h3-font-weight)",
//     height: "24px",
//     left: "11px",
//     letterSpacing: "var(--headline-h3-letter-spacing)",
//     lineHeight: "var(--headline-h3-line-height)",
//     opacity: 0.6,
//     position: "absolute",
//     top: "0",
//     whiteSpace: "nowrap",
//   },
// }));

// const isWindows = isWindowsOS();
// const OPEN_APP_ENABLED = isWindows; // && !isElectron();

// export interface ToolbarMenuProps {
//   className?: string;
// }

// export function ToolbarMenu({ className }: ToolbarMenuProps) {
//   const styles = useStyles();
//   const logger = useLogger();

//   return (
//     <>
//       <Menu
//         className={className}
//         popupClassName={cn(styles.menu)}
//         renderButton={() => <IconAvatar />}
//         position="bottom"
//       >
//         <MenuItem>Settings</MenuItem>
//         <MenuItem>Sign out of Ovvio</MenuItem>
//       </Menu>
//     </>
//   );
// }

// export interface OvvioHeaderProps {
//   className?: any;
// }

// export const IconAvatar: React.FC = () => {
//   const styles = useStyles();

//   return (
//     <div className={styles.iconAvatar}>
//       <div className={styles.group}>
//         <div className={styles.overlapGroup}>
//           <div className={styles.textWrapper}>M</div>
//           <div className={styles.div}>S</div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default function OvvioHeader({ className }: OvvioHeaderProps) {
//   const styles = useStyles();
//   const graph = useGraphManager();
//   const { results } = useExistingQuery(graph.sharedQueriesManager.workspaces);
//   const navigate = useNavigate();
//   const logger = useLogger();
//   const workspaces = usePartialVertices(results, ["name", "selected"]);
//   const selected = workspaces.filter((x) => x.selected);

//   const title = (function () {
//     switch (selected.length) {
//       case workspaces.length: {
//         return "AlWWWWl Workspaces";
//       }
//       case 0: {
//         return "";
//       }
//       case 1: {
//         return selected[0].name;
//       }
//       default: {
//         return "Multiple Workspaces";
//       }
//     }
//   })();

//   const ovvioHeaderClicked = useCallback(() => {
//     logger.log({
//       severity: "INFO",
//       event: "Click",
//       source: "toolbar:logo",
//     });
//     navigate("/");
//   }, [logger, navigate]);

//   return (
//     <div className={cn(styles.headerRoot)}>
//       <div className={cn(styles.headerContent)}>
//         <Button className={cn(styles.headerText)} onClick={ovvioHeaderClicked}>
//           {title}
//         </Button>
//       </div>
//     </div>
//   );
// }

import React, { useCallback } from "react";
import { useNavigate } from "react-router";
import { Button } from "../../../../../../styles/components/buttons.tsx";
import IconOverflow from "../../../../../../styles/components/icons/IconOverflow.tsx";
import Menu, {
  MenuItemStyle,
  MenuItem,
} from "../../../../../../styles/components/menu.tsx";
import { useTypographyStyles } from "../../../../../../styles/components/typography.tsx";
import { makeStyles, cn } from "../../../../../../styles/css-objects/index.ts";
import { layout } from "../../../../../../styles/layout.ts";
import { styleguide } from "../../../../../../styles/styleguide.ts";
import {
  useGraphManager,
  usePartialRootUser,
} from "../../../../core/cfds/react/graph.tsx";
import { useExistingQuery } from "../../../../core/cfds/react/query.ts";
import { usePartialVertices } from "../../../../core/cfds/react/vertex.ts";
import { isWindowsOS } from "../../../../utils.ts";
import { useLogger } from "../../../../core/cfds/react/logger.tsx";
import { brandLightTheme as theme } from "../../../../../../styles/theme.tsx";
import { userDefinedRules } from "../../../../../../cfds/richtext/normalize/setup.ts";

const useStyles = makeStyles(() => ({
  headerRoot: {
    basedOn: [layout.column],
  },
  headerContent: {
    height: styleguide.gridbase * 9,
    alignItems: "center",
    basedOn: [layout.row],
  },
  headerText: {
    marginLeft: styleguide.gridbase * 2.5,
    fontSize: 18,
    lineHeight: `${styleguide.gridbase * 3}px`,
    letterSpacing: "1px",
    basedOn: [useTypographyStyles.bold],
  },
  menu: {
    maxHeight: MenuItemStyle.rules.height * 8,
    // overflowY: "auto", //TODO: need to be removed because the arrow must be out of the box.
  },
  iconAvatar: {
    backgroundColor: theme.secondary.s3,
    border: "2px solid",
    borderColor: theme.secondary.s7,
    borderRadius: "24px",
    height: "40px",
    width: "40px",
  },
  group: {
    height: "24px",
    left: "9px",
    position: "relative",
    top: "8px",
    width: "26px",
  },
  overlapGroup: {
    height: "24px",
    position: "relative",
    width: "22px",
  },
  textWrapper: {
    color: theme.primary.p9,
    fontFamily: styleguide.textStyles["h3-headline"].fontFamily,
    fontSize: styleguide.textStyles["h3-headline"].fontSize,
    fontStyle: styleguide.textStyles["h3-headline"].fontStyle,
    fontWeight: styleguide.textStyles["h3-headline"].fontWeight,
    height: "24px",
    left: "0",
    letterSpacing: styleguide.textStyles["h3-headline"].letterSpacing,
    lineHeight: styleguide.textStyles["h3-headline"].lineHeight,
    opacity: 0.6,
    position: "absolute",
    top: "0",
    whiteSpace: "nowrap",
  },

  div: {
    color: theme.primary.p9,
    fontFamily: styleguide.textStyles["h3-headline"].fontFamily,
    fontSize: styleguide.textStyles["h3-headline"].fontSize,
    fontStyle: styleguide.textStyles["h3-headline"].fontStyle,
    fontWeight: styleguide.textStyles["h3-headline"].fontWeight,
    height: "24px",
    left: "11px",
    letterSpacing: styleguide.textStyles["h3-headline"].letterSpacing,
    lineHeight: styleguide.textStyles["h3-headline"].lineHeight,
    opacity: 0.6,
    position: "absolute",
    top: "0",
    whiteSpace: "nowrap",
  },
}));

const isWindows = isWindowsOS();
const OPEN_APP_ENABLED = isWindows; // && !isElectron();

export interface ToolbarMenuProps {
  className?: string;
}

export function ToolbarMenu({ className }: ToolbarMenuProps) {
  const styles = useStyles();
  const logger = useLogger();

  return (
    <>
      <Menu
        className={className}
        popupClassName={cn(styles.menu)}
        renderButton={() => <IconAvatar />}
        position="bottom"
      >
        <MenuItem>Settings</MenuItem>
        <MenuItem>Sign out of Ovvio</MenuItem>
      </Menu>
    </>
  );
}

export interface OvvioHeaderProps {
  className?: any;
}

export const IconAvatar: React.FC = () => {
  const styles = useStyles();
  const userData = usePartialRootUser("name", "email");

  const initials = getInitials(userData.name, userData.email);

  return (
    <div className={styles.iconAvatar}>
      <div className={styles.group}>
        <div className={styles.overlapGroup}>
          <div className={styles.textWrapper}>{initials[0]}</div>
          <div className={styles.div}>{initials[1]}</div>
        </div>
      </div>
    </div>
  );
};

function getInitials(name: string, email: string): string {
  if (!name && email) {
    return email.substring(0, 2).toUpperCase();
  }

  const names = name.split(" ");
  let initials = names[0].substring(0, 1).toUpperCase();

  if (names.length > 1) {
    initials += names[names.length - 1].substring(0, 1).toUpperCase();
  } else if (names[0].length > 1) {
    initials += names[0].substring(1, 2).toUpperCase();
  }

  return initials;
}

export default function OvvioHeader({ className }: OvvioHeaderProps) {
  const styles = useStyles();
  const graph = useGraphManager();
  const { results } = useExistingQuery(graph.sharedQueriesManager.workspaces);
  const navigate = useNavigate();
  const logger = useLogger();
  const workspaces = usePartialVertices(results, ["name", "selected"]);
  const selected = workspaces.filter((x) => x.selected);

  const title = (function () {
    switch (selected.length) {
      case workspaces.length: {
        return "AlWWWWl Workspaces";
      }
      case 0: {
        return "";
      }
      case 1: {
        return selected[0].name;
      }
      default: {
        return "Multiple Workspaces";
      }
    }
  })();

  const ovvioHeaderClicked = useCallback(() => {
    logger.log({
      severity: "INFO",
      event: "Click",
      source: "toolbar:logo",
    });
    navigate("/");
  }, [logger, navigate]);

  return (
    <div className={cn(styles.headerRoot)}>
      <div className={cn(styles.headerContent)}>
        <Button className={cn(styles.headerText)} onClick={ovvioHeaderClicked}>
          {title}
        </Button>
      </div>
    </div>
  );
}
