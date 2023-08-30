import React from "react";
import { makeStyles } from "../../css-objects/index.ts";
import { brandLightTheme as theme1 } from "../../theme.tsx";
import { useHoverContext } from "../menu-context.tsx";
import { cn } from "../../css-objects/index.ts";

interface ArrowProps {
  position: "left" | "right" | "bottom";
  shadowPosition: "leftShadow" | "rightShadow" | "bottomShadow";
  oneCellMenu?: boolean;
  backdropHovered?: boolean;
}

const useStyles = makeStyles((theme) => {
  const styles = {
    backdropHoveredArrow: {
      backgroundColor: theme1.secondary.s3,
    },

    arrow: {
      position: "absolute",
      width: "8px",
      height: "8px",
      backgroundColor: "white",
      transform: "rotate(45deg)",
      top: "7px",
      borderWidth: "2.2px",
      borderStyle: "solid",
    },

    right: {
      left: "-6px",
      borderRightColor: "transparent",
      borderTopColor: "transparent",
      borderLeftColor: theme1.secondary.s2,
      borderBottomColor: theme1.secondary.s2,
    },

    left: {
      right: "-6px",
      borderLeftColor: "transparent",
      borderBottomColor: "transparent",
      borderRightColor: theme1.secondary.s2,
      borderTopColor: theme1.secondary.s2,
    },

    bottom: {
      right: "6px",
      top: "-6px",
      borderRightColor: "transparent",
      borderBottomColor: "transparent",
      borderLeftColor: theme1.secondary.s2,
      borderTopColor: theme1.secondary.s2,
    },

    arrowShadow: {
      position: "absolute",
      backgroundColor: "rgba(0, 0, 0, 0.3)",
      transform: "rotate(45deg)",
      top: "7px",
      zIndex: -2,
    },

    leftShadow: {
      width: "11px",
      height: "14px",
      right: "-5px",
      boxShadow: "1px 0px 3px rgba(0, 0, 0, 0.25)",
    },

    rightShadow: {
      width: "10px",
      height: "11px",
      left: "-6px",
      boxShadow: "-1px 0px 3px rgba(0, 0, 0, 0.25)",
    },

    bottomShadow: {
      width: "11px",
      height: "14px",
      right: "7px",
      top: "-6px",
      boxShadow: "-1px 0px 3px 0px rgba(0, 0, 0, 0.25)",
    },

    oneCellMenu: {
      top: "10px",
    },
  };

  return styles;
});

const Arrow: React.FC<ArrowProps> = ({
  position,
  shadowPosition,
  oneCellMenu,
}) => {
  const styles = useStyles();

  return (
    <div>
      <div
        className={cn(
          styles.arrow,
          styles[position],
          oneCellMenu && styles.oneCellMenu
        )}
      />
      <div
        className={cn(
          styles.arrowShadow,
          styles[shadowPosition],
          oneCellMenu && styles.oneCellMenu
        )}
      />
    </div>
  );
};

// const { firstInstanceUpdated } = useHoverContext();

//   return (
//     <div className={firstInstanceUpdated != undefined ? styles.backdropHoveredArrow : ""}>
//       <div
//         className={`${styles.arrow} ${styles[position]} ${
//           oneCellMenu ? styles.oneCellMenu : ""
//         } `}
//       />

//       <div
//         className={`${styles.arrowShadow} ${styles[shadowPosition]} ${
//           oneCellMenu ? styles.oneCellMenu : ""
//         }`}
//       />
//     </div>
//   );
// };

export default Arrow;
