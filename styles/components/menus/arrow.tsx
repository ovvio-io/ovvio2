import React from "react";
import { makeStyles } from "../../css-objects/index.ts";

interface ArrowProps {
  position: "left" | "right" | "bottom";
  shadowPosition: "leftShadow" | "rightShadow" | "bottomShadow";
  oneCellMenu?: boolean;
}

const useStyles = makeStyles((theme) => {
  const styles = {
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
      borderLeftColor: "#F5ECDC",
      borderBottomColor: "#F5ECDC",
    },

    left: {
      right: "-6px",
      borderLeftColor: "transparent",
      borderBottomColor: "transparent",
      borderRightColor: "#F5ECDC",
      borderTopColor: "#F5ECDC",
    },

    bottom: {
      right: "6px",
      top: "-6px",
      borderRightColor: "transparent",
      borderBottomColor: "transparent",
      borderLeftColor: "#F5ECDC",
      borderTopColor: "#F5ECDC",
    },

    arrowShadow: {
      //TODO: need to set the shadow only to the arrow's direction.
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
        className={`${styles.arrow} ${styles[position]} ${
          oneCellMenu ? styles.oneCellMenu : ""
        }`}
      />
      <div
        className={`${styles.arrowShadow} ${styles[shadowPosition]} ${
          oneCellMenu ? styles.oneCellMenu : ""
        }`}
      />
    </div>
  );
};

export default Arrow;
