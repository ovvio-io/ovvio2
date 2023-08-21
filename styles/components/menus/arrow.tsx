import React from "react";
import { makeStyles } from "../../css-objects/index.ts";

const useStyles = makeStyles((theme) => ({
  arrow: {
    position: "absolute",
    width: "8px",
    height: "8px",
    backgroundColor: "white",
    transform: "rotate(45deg)",
    top: "7px",
    borderWidth: "2px",
    borderStyle: "solid",
  },

  right: {
    left: "-4px",
    borderRightColor: "transparent",
    borderTopColor: "transparent",
    borderLeftColor: "#F5ECDC",
    borderBottomColor: "#F5ECDC",
  },

  left: {
    right: "-4px",
    borderLeftColor: "transparent",
    borderTopColor: "transparent",
    borderRightColor: "#F5ECDC",
    borderBottomColor: "#F5ECDC",
  },

  rightTop: {
    left: "-4px",
    top: "-4px",
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "#F5ECDC",
    borderTopColor: "#F5ECDC",
  },

  leftTop: {
    right: "-4px",
    top: "-4px",
    borderLeftColor: "transparent",
    borderBottomColor: "transparent",
    borderRightColor: "#F5ECDC",
    borderTopColor: "#F5ECDC",
  },

  arrowShadow: {
    position: "absolute",
    width: "10px",
    height: "11px",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    transform: "rotate(45deg)",
    top: "7px",
    zIndex: -2,
  },

  leftShadow: {
    left: "-4px",
    boxShadow: "-1px 0px 3px 0px rgba(0, 0, 0, 0.25)",
  },

  rightShadow: {
    right: "-4px",
    boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.3)",
  },
}));

const Arrow = ({ position, shadowPosition }) => {
  const styles = useStyles();

  return (
    <div>
      <div className={`${styles.arrow} ${styles[position]}`} />
      <div className={`${styles.arrowShadow} ${styles[shadowPosition]}`} />
    </div>
  );
};

export default Arrow;
