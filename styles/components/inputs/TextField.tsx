import React from 'react';
import { FontFamily } from '../typography.tsx';
import { makeStyles, cn } from '../../css-objects/index.ts';
import { styleguide } from '../../styleguide.ts';
import { brandLightTheme as theme } from '../../theme.tsx';

const useStyles = makeStyles(() => ({
  textField: {
    height: styleguide.gridbase * 4,
    boxSizing: 'border-box',
    borderRadius: 20,
    fontSize: 13,
    // lineHeight: 16,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: theme.primary.p5,
    outline: 'none',
    fontFamily: FontFamily,
    padding: [styleguide.gridbase, styleguide.gridbase * 2],
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    '::placeholder': {
      color: theme.colors.placeholderText,
      opacity: 1,
    },
  },
}));

export { useStyles as useTextfieldStyles };

export default React.forwardRef(function TextField(
  props: React.HTMLProps<HTMLInputElement>,
  ref: any
) {
  const styles = useStyles();
  const { className, ...rest } = props;
  return (
    <input ref={ref} className={cn(styles.textField, className)} {...rest} />
  );
});

// import React from "react";
// import { FontFamily } from "../typography.tsx";
// import { makeStyles, cn } from "../../css-objects/index.ts";
// import { styleguide } from "../../styleguide.ts";
// import { brandLightTheme as theme } from "../../theme.tsx";
// import { IconSearch } from "../new-icons/icon-search.tsx";

// const useStyles = makeStyles(
//   () => ({
//     textField: {
//       height: styleguide.gridbase * 5,
//       boxSizing: "border-box",
//       borderRadius: 4,
//       padding: "6px 8px 6px 10px",
//       // lineHeight: "16px",
//       outline: "none",
//       // fontFamily: FontFamily,
//       color: theme.colors.text,
//       "::placeholder": {
//         color: theme.colors.placeholderText,
//         opacity: 1,
//       },
//       alignItems: "center",
//       gap: "8px",
//       flexShrink: 0,
//       border: "1px solid #F5ECDC",
//       background: "#FFFBF5",
//       width: "88px",
//       flexDirection: "column",
//       justifyContent: "center",

//       overflow: "hidden",
//       fontFeatureSettings: "'clig' off, 'liga' off",
//       textOverflow: "ellipsis",
//       whiteSpace: "nowrap",
//       fontFamily: "Poppins",
//       fontSize: "13px",
//       fontStyle: "normal",
//       fontWeight: 400,
//       lineHeight: "normal",
//       letterSpacing: "0.075px",
//     },
//   }),
//   "TextField_9e7133"
// );

// export { useStyles as useTextfieldStyles };

// export default React.forwardRef(function TextField(
//   props: React.HTMLProps<HTMLInputElement>,
//   ref: any
// ) {
//   const styles = useStyles();
//   const { className, ...rest } = props;
//   return (
//     <div>
//       <IconSearch className={cn(styles.textField, className)} />
//       <input ref={ref} {...rest} />
//     </div>
//   );
// });
