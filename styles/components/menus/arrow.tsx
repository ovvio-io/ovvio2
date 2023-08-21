import React from "react";
import { makeStyles } from "../../css-objects/index.ts";

const useStyles = makeStyles((theme) => ({
//   arrowContainer: {
//     display: "flex",
//     alignItems: "center",
//     position: "relative", 
//     top: "60px",
//   },

  arrow: {
    position: "absolute",
    width: "8px",
    height: "8px",
    backgroundColor: "white",
    transform: "rotate(45deg)",
    top: "4px",
    borderWidth: "2px",
    borderStyle: "solid",

  },
  right: {
    left: "-7px",
    borderRightColor: "transparent",
    borderTopColor: "transparent",
    borderLeftColor: "#F5ECDC",
    borderBottomColor: "#F5ECDC",
  },
  left: {
    right: "-7px",
    borderLeftColor: "transparent",
    borderTopColor: "transparent",
    borderRightColor: "#F5ECDC",
    borderBottomColor: "#F5ECDC",
  },

  arrowShadow: {
    position: "absolute",
    width: "8px",
    height: "10px",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    transform: "rotate(45deg)",
    top: "4px",
    zIndex: -2,
  },

  leftShadow: {
    left: "-7px",
    boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.3)", //TODO need to change the directions of the shadows.
  },

  rightShadow: {
    right: "-7px",
    boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.3)",
  },
}));

const Arrow = ({ position, shadowPosition }) => {
  const styles = useStyles();

  return (
    <div >
      <div className={`${styles.arrow} ${styles[position]}`} />
      <div className={`${styles.arrowShadow} ${styles[shadowPosition]}`} />
    </div>
  );
};

export default Arrow;
