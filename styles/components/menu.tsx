import React, {
  useState,
  useRef,
  useLayoutEffect,
  useMemo,
  useCallback,
  useContext,
  MouseEvent,
} from "react";
import ReactDOM from "react-dom";
import { makeStyles, cn } from "../css-objects/index.ts";
import { styleguide } from "../styleguide.ts";
import { layout } from "../layout.ts";
import { Button } from "./buttons.tsx";
import Popper from "./popper.tsx";
import { Text } from "./typography.tsx";
import { Tooltip } from "./tooltip/index.tsx";
import Layer from "./layer.tsx";
import { IconExpander } from "./icons/index.ts";

// const zoom = keyframes({
//   from: {
//     transform: 'scaleY(0)',
//     opacity: 0,
//   },
//   to: {
//     transform: 'scaleY(1)',
//     opacity: 1,
//   },
// });

export const LineSeparator = () => (
  <div style={{ height: "1px", backgroundColor: "#F5ECDC", width: "100%" }} />
);

const useStyles = makeStyles((theme) => ({
  arrowContainer: {
    display: "flex",
    alignItems: "center",
    position: "relative", 
    zIndex: -1,

  },

  arrow: {
    position: "absolute",
    content: "''",
    width: "8px",
    height: "8px",
    backgroundColor: "white",
    transform: "rotate(45deg)",
    top: "4px",
    left: "-7px", 
    borderRight: "2px solid transparent",
    borderTop: "2x solid transparent",
    borderLeft: "2px solid #F5ECDC",
    borderBottom: "2px solid #F5ECDC",
  },

  arrowShadow: {
    content: "''",
    position: "absolute",
    width: "8px",
    height: "8px",
    backgroundColor: "rgba(0, 0, 0, 0.3)", 
    transform: "rotate(45deg)",
    top: "4px", 
    left: "-7px",
    boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.3)", 
    zIndex: -2,

  },

  item: {
    height: styleguide.gridbase * 6,
    flexShrink: 0,
    boxSizing: "border-box",
    minWidth: styleguide.gridbase * 20,
    padding: styleguide.gridbase,
    color: theme.background.text,
    transition: "background-color 0.15s linear",
    cursor: "pointer",
    ":hover": {
      backgroundColor: theme.background[100],
    },
    alignItems: "center",
    basedOn: [layout.row],
  },

  dropDownItem: {
    boxSizing: "border-box",
    height: styleguide.gridbase * 4, // changed from 6
    minWidth: styleguide.gridbase * 12, //changed from 20
    maxWidth: styleguide.gridbase * 27, //added
    padding: styleguide.gridbase,
    color: theme.background.text,
    cursor: "pointer",
    ":hover": {
      backgroundColor: theme.background[100],
    },
    fontSize: styleguide.gridbase * 1.5, // added
  },
  actionIcon: {
    marginRight: styleguide.gridbase,
  },
  actionText: {
    flexGrow: 1,
  },
  menuButton: {
    userSelect: "none",
  },

  dropDown: {
    basedOn: [layout.column],
    transformOrigin: "top",
    whitespace: "nowrap",
    display: "flex",
    boxShadow: "0px -1px 3px 0px #00000040",
    borderRadius: "2px", // Corner radius
    justifyContent: "center",
    border: "2px solid #F5ECDC",
    font: "Poppins",
    backgroundColor: "white",
    position: "relative",
    // basedOn: [layout.column],
    // transformOrigin: "top",
    // whitespace: "nowrap",
    // display: "flex",
    // boxShadow: "0px -1px 3px 0px #00000040",
    // borderRadius: "2px", // Corner radius
    // justifyContent: "center",
    // border: "2px solid #F5ECDC",
    // font: "Poppins",
    // backgroundColor: "white",

    // ------------------------ dropdown
    // alignItems: "stretch",
    // padding: [styleguide.gridbase, 0],
    // backgroundColor: theme.background[0],
    // boxShadow: theme.shadows.z2,

    // animation: `${zoom} ${
    //   styleguide.transition.duration.short
    // }ms ${styleguide.transition.timing.standard} backwards`,
  },

  iconMenu: {
    ...layout.row.rules,
    boxSizing: "border-box",
    padding: [styleguide.gridbase * 2, styleguide.gridbase * 1.5],
    alignItems: "center",
  },
  iconItem: {
    padding: 0,
    height: styleguide.gridbase * 3,
    width: styleguide.gridbase * 3,
    minWidth: styleguide.gridbase * 3,
    margin: [0, styleguide.gridbase * 0.5],
    basedOn: [layout.row, layout.centerCenter],
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "none",
    userSelect: "none",
    "&backdropVisible": {
      display: "block",
    },
  },
  tooltip: {
    marginBottom: styleguide.gridbase * 3,
  },
  backdropVisible: {},
  secondaryIcon: {
    transform: "rotate(270deg)",
    transformOrigin: "center center",
  },
}));

const MenuContext = React.createContext({
  close() {},
  hasParent: false,
});

type DivProps = React.ComponentPropsWithoutRef<"div">;

export type SecondaryMenuItemProps = React.PropsWithChildren<{
  className?: string;
  text: string;
}>;

export const SecondaryMenuItem: React.FC<SecondaryMenuItemProps> = ({
  children,
  text,
  className,
}) => {
  const styles = useStyles();
  const renderButton = useCallback(() => {
    return (
      <div className={cn(className, styles.item)}>
        <Text>{text}</Text>
        <div className={cn(layout.flexSpacer)} />
        <IconExpander className={cn(styles.secondaryIcon)} />
      </div>
    );
  }, [text, className, styles]);

  return (
    <Menu
      renderButton={renderButton}
      position="right"
      direction="out"
      align="start"
    >
      {children}
    </Menu>
  );
};

interface MenuItemProps {
  onClick?: () => any;
  className?: string;
  children?: React.ReactNode;
  selected?: boolean;
}

export function useMenuClose() {
  const ctx = useContext(MenuContext);
  return ctx.close;
}

export const MenuItem = React.forwardRef<
  HTMLDivElement,
  DivProps & MenuItemProps
>(function MenuItem(
  { selected, children, className, onClick = () => true, ...props },
  ref
) {
  const styles = useStyles();
  const ctx = useContext(MenuContext);

  const invoke = (e: MouseEvent) => {
    e.stopPropagation();
    Promise.resolve(onClick()).then((r) => {
      if (typeof r === "undefined" || r) {
        ctx.close();
      }
    });
  };
  return (
    <div
      className={cn(className, styles.dropDownItem)} // modify (className, styles.item)
      {...props}
      onClick={invoke}
      ref={ref}
    >
      {children}
    </div>
  );
});

export const MenuItemStyle = useStyles.item;
interface MenuActionProps {
  IconComponent: any;
  text: string;
  iconWidth?: string;
  iconHeight?: string;
}

export const MenuAction = React.forwardRef<
  HTMLDivElement,
  MenuActionProps & DivProps & MenuItemProps
>(function MenuAction(
  { IconComponent, text, iconWidth, iconHeight, ...props },
  ref
) {
  const styles = useStyles();
  return (
    <MenuItem {...props} ref={ref}>
      <IconComponent
        className={cn(styles.actionIcon)}
        width={iconWidth}
        height={iconHeight}
      />
      <Text className={cn(styles.actionText)}>{text}</Text>
    </MenuItem>
  );
});

interface BackdropProps {
  className?: string;
  visible: boolean;
  children: React.ReactNode;
}

export const Backdrop = React.forwardRef<
  HTMLDivElement,
  BackdropProps & DivProps
>(({ visible, children, className, ...rest }, ref) => {
  const styles = useStyles();
  return ReactDOM.createPortal(
    <Layer>
      {({ zIndex }) => (
        <div
          ref={ref}
          className={cn(
            className,
            styles.backdrop,
            visible && styles.backdropVisible
          )}
          style={{ zIndex }}
          {...rest}
        >
          {children}
        </div>
      )}
    </Layer>,
    document.getElementById("root")!
  );
});

export type MenuRenderButton = (props: {
  close: (e: React.MouseEvent) => void;
  isOpen: boolean;
}) => React.ReactNode;

interface MenuProps {
  children: React.ReactNode;
  renderButton: MenuRenderButton;
  popupClassName?: string;
  backdropClassName?: string;
  className?: string;
  align?: "start" | "center" | "end";
  position?: "top" | "bottom" | "left" | "right";
  direction?: "in" | "out";
  onClick?: () => void;
  sizeByButton?: boolean;
  style?: {};
}

// export function IconMenu({ popupClassName, ...props }: MenuProps) {
//   const styles = useStyles();
//   return (
//     <Menu {...props} popupClassName={cn(styles.iconMenu, popupClassName)} />
//   );
// }

// export interface IconMenuItemProps {
//   IconComponent: React.ComponentType;
// }

// export function IconMenuItem({
//   IconComponent,
//   className,
//   tooltip,
//   fill,
//   ...props
// }: IconMenuItemProps) {
//   const styles = useStyles();
//   return (
//     <Tooltip className={cn(styles.tooltip)} text={tooltip} position="top">
//       <MenuItem {...props} className={cn(styles.iconItem, className)}>
//         <IconComponent fill={fill} />
//       </MenuItem>
//     </Tooltip>
//   );
// }

function isElement(x: HTMLElement | null | undefined): x is HTMLElement {
  return !!x;
}

export default function Menu({
  children,
  renderButton,
  popupClassName,
  backdropClassName,
  className,
  align = "center",
  position = "top",
  direction = "in",
  onClick = () => {},
  sizeByButton = false,
  style = {},
}: MenuProps) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const anchor = useRef(null);
  const backdrop = useRef(null);
  const [minWidthStyle, setMinWidthStyle] = useState({});
  const menuCtx = useContext(MenuContext);

  const close = useCallback(
    (e?: MouseEvent) => {
      setOpen(false);
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      menuCtx.close();
    },
    [menuCtx]
  );

  const newContext = useMemo(
    () => ({
      close() {
        close();
      },
      hasParent: true,
    }),
    [close]
  );

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setOpen((x) => !x);
    onClick();
  };
  useLayoutEffect(() => {
    if (isElement(anchor.current) && sizeByButton) {
      const width = (anchor.current as any).getBoundingClientRect().width;
      setMinWidthStyle({ width: `${width}px` });
    } else {
      setMinWidthStyle({});
    }
  }, [children, sizeByButton]);

  const content = (
    <Popper
      className={undefined}
      anchor={anchor.current!}
      open={open}
      position={position}
      align={align}
      direction={direction}
    >
      <div className={styles.arrowContainer}>
        <div
          className={cn(styles.dropDown, popupClassName)}
          style={minWidthStyle}
        >
          {children}
          <div className={styles.arrow} />
          <div className={styles.arrowShadow} />
        </div>
      </div>
    </Popper>
  );

  return (
    <Button
      className={cn(styles.menuButton, className)}
      ref={anchor}
      onClick={openMenu}
      contentEditable={false}
      style={style}
    >
      {renderButton({ close, isOpen: open })}
      {open && (
        <MenuContext.Provider value={newContext}>
          {menuCtx.hasParent ? (
            content
          ) : (
            <Backdrop
              visible={open}
              ref={backdrop}
              className={cn(backdropClassName)}
              onClick={close}
            >
              {content}
            </Backdrop>
          )}
        </MenuContext.Provider>
      )}
    </Button>
  );
}
