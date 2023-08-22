import React from "react";
import { makeStyles } from "../../css-objects/index.ts";


//left means that the Arrow is on the left side of the button (so the Arrow should point to the right).
const useStyles = makeStyles((theme) => ({
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
    right: "6px", // TODO: need to modify to -6px but first to fix zIndex to signOut.
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

  arrowShadow: { //TODO: need to set the shadow only to the arrow's direction.
    position: "absolute",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    transform: "rotate(45deg)",
    top: "7px",
    zIndex: -2,
  },

  leftShadow: {
    width: "10px",
    height: "11px",
    right: "-6px",
    boxShadow: "-1px 0px 3px 0px rgba(0, 0, 0, 0.25)",
  },

  rightShadow: {
    width: "10px",
    height: "11px",
    left: "-6px",
    boxShadow: "-1px 0px 3px 0px rgba(0, 0, 0, 0.25)",
  },

  bottomShadow:{
    width: "11px",
    height: "14px",
    right: "7px",
    top: "-6px",
    boxShadow: "-1px 0px 3px 0px rgba(0, 0, 0, 0.25)",
  }
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
