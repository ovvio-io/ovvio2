import React, {
  useState,
  useRef,
  useLayoutEffect,
  useMemo,
  useCallback,
  useContext,
  MouseEvent,
  Children,
} from 'react';
import ReactDOM from 'react-dom';
import { makeStyles, cn } from '../css-objects/index.ts';
import { styleguide } from '../styleguide.ts';
import { layout } from '../layout.ts';
import { Button } from './buttons.tsx';
import Popper from './popper.tsx';
import { Text } from './typography.tsx';
import Layer from './layer.tsx';
import Arrow from './arrow.tsx';
import { brandLightTheme as theme1 } from '../theme.tsx';

interface LineSeparatorProps {
  height?: number;
}

export const LineSeparator: React.FC<LineSeparatorProps> = ({ height = 2 }) => (
  <div
    style={{
      height: `${height}px`,
      backgroundColor: theme1.secondary.s2,
      width: '100%',
      display: 'flex',
    }}
  />
);

const useStyles = makeStyles((theme) => ({
  backdropHovered: {
    backgroundColor: theme1.secondary.s3,
  },
  // item: {
  //   ...styleguide.textStyles.text,
  //   backgroundColor: 'white',
  //   boxSizing: 'border-box',
  //   height: styleguide.gridbase * 4,
  //   minWidth: styleguide.gridbase * 15,
  //   maxWidth: styleguide.gridbase * 27,
  //   padding: '8px 16px 8px 8px',
  //   color: theme.background.text,
  //   cursor: 'pointer',
  //   ':hover': {
  //     backgroundColor: theme1.secondary.s3,
  //   },
  //   flexShrink: 0,
  //   transition: 'background-color 0.15s linear',
  //   alignItems: 'center',
  //   basedOn: [layout.row],
  //   display: 'flex',
  //   width: 'auto',
  // },
  item: {
    ...styleguide.textStyles.text,
    backgroundColor: 'white',
    boxSizing: 'border-box',
    height: styleguide.gridbase * 4,
    minWidth: styleguide.gridbase * 16,
    // maxWidth: styleguide.gridbase * 27,
    padding: '8px 16px 8px 8px',
    color: theme.background.text,
    cursor: 'pointer',
    ':hover': {
      backgroundColor: theme1.secondary.s3,
    },
    flexShrink: 0,
    transition: 'background-color 0.15s linear',
    alignItems: 'center',
    basedOn: [layout.row],
    display: 'flex',
    // width: 'auto',
    borderBottom: `2px solid ${theme1.secondary.s2}`,

    width: '100%',
    // gap: styleguide.gridbase,
    // ':last-child': {
    //   borderBottom: 'none',
    // },
  },
  icon: {
    padding: 0,
    height: styleguide.gridbase * 2,
    width: styleguide.gridbase * 2,
    minWidth: styleguide.gridbase * 2,
    margin: '0 styleguide.gridbase * 0.5',
    basedOn: [layout.row, layout.centerCenter],
  },
  actionIcon: {
    marginRight: styleguide.gridbase,
  },
  actionText: {
    // flexGrow: 1,
    marginLeft: styleguide.gridbase,
  },
  menuButton: {
    userSelect: 'none',
  },

  MenuContainer: {
    zIndex: 1,
  },

  dropDown: {
    position: 'relative',
    basedOn: [layout.column],
    transformOrigin: 'top',
    whitespace: 'nowrap',
    display: 'flex',
    boxShadow: '0px -1px 3px rgba(0, 0, 0, 0.25)',
    borderRadius: '2px',
    // justifyContent: 'center',
    border: '2px solid #F5ECDC',
    font: 'Poppins',
    backgroundColor: 'white',
  },

  iconMenu: {
    ...layout.row.rules,
    boxSizing: 'border-box',
    padding: `${styleguide.gridbase * 2}px ${styleguide.gridbase * 1.5}px`,
    alignItems: 'center',
  },

  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'none',
    userSelect: 'none',
    '&backdropVisible': {
      display: 'block',
    },
  },
  tooltip: {
    marginBottom: styleguide.gridbase * 3,
  },
  backdropVisible: {},
  secondaryIcon: {
    transform: 'rotate(270deg)',
    transformOrigin: 'center center',
  },
  workspacesList: {
    maxHeight: styleguide.gridbase * 30,
    overflowY: 'auto',
    overflowX: 'clip',
  },
  secondaryBox: {},
}));

const MenuContext = React.createContext({
  close() {},
  hasParent: false,
});

export function useMenuContext() {
  return useContext(MenuContext);
}

type DivProps = React.ComponentPropsWithoutRef<'div'>;

export type SecondaryMenuItemProps = React.PropsWithChildren<{
  className?: string;
  text: string;
  IconComponent?: any;
  isWsList?: boolean;
}>;

export function SecondaryMenuItem({
  children,
  text,
  className,
  IconComponent,
  isWsList,
}: SecondaryMenuItemProps) {
  const styles = useStyles();
  const renderButton = useCallback(() => {
    return (
      <div className={cn(className, styles.item, styles.secondaryBox)}>
        {IconComponent && <IconComponent className={cn(styles.actionIcon)} />}
        <Text className={cn(isWsList && styles.actionText)}>{text}</Text>
        <div className={cn(layout.flexSpacer)} />
        <img
          key="iconExpender"
          src="/icons/list/icon-expender.svg"
          style={{
            transform: 'rotate(0deg)',
            position: 'relative',
            left: '8px',
          }}
          className={cn(styles.secondaryIcon)}
        />
      </div>
    );
  }, [text, className, styles]);

  return (
    <Menu
      renderButton={renderButton}
      position="right"
      direction="out"
      align="start"
      withoutArrow={true}
      popupClassName={isWsList ? cn(styles.workspacesList) : 'none'}
      className={className}
    >
      {children}
    </Menu>
  );
}

interface MenuItemProps {
  onClick?: () => any;
  className?: string;
  children?: React.ReactNode;
  selected?: boolean;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

export function useMenuClose() {
  const ctx = useContext(MenuContext);
  return ctx.close;
}

export const MenuItem = React.forwardRef<
  HTMLDivElement,
  DivProps & MenuItemProps
>(function MenuItem(
  {
    selected,
    children,
    className,
    onClick = () => true,
    icon: IconItem = null,
    ...props
  },
  ref
) {
  const styles = useStyles();
  const ctx = useContext(MenuContext);
  const [isHovered, setIsHovered] = useState(false);

  const invoke = (e: MouseEvent) => {
    e.stopPropagation();
    Promise.resolve(onClick()).then((r) => {
      if (typeof r === 'undefined' || r) {
        ctx.close();
      }
    });
  };

  return (
    <div
      className={cn(className, styles.item)}
      {...props}
      onClick={invoke}
      ref={ref}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {IconItem && <IconItem className={cn(styles.icon)} />}
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
    //ReactDOM.createPortal is used to create a portal for rendering content outside the normal React component tree. Portals are often used for modal dialogs or overlays.
    <Layer>
      {({ zIndex }) => (
        <div
          ref={ref}
          className={cn(
            className,
            styles.backdrop,
            visible && styles.backdropVisible
          )}
          style={{ zIndex, marginBottom: '8px' }}
          {...rest}
        >
          {children}
        </div>
      )}
    </Layer>,
    document.getElementById('root')!
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
  oneCellMenu?: boolean;
  backdropClassName?: string;
  className?: string;
  align?: 'start' | 'center' | 'end';
  position?: 'top' | 'bottom' | 'left' | 'right';
  direction?: 'in' | 'out';
  onClick?: () => void;
  sizeByButton?: boolean;
  style?: {};
  openImmediately?: boolean;
  withoutArrow?: boolean;

  isOpen?: boolean;
  toggleMenu?: () => void;
}

function isElement(x: HTMLElement | null | undefined): x is HTMLElement {
  return !!x;
}

export default function Menu({
  children,
  renderButton,
  popupClassName,
  backdropClassName,
  className,
  oneCellMenu,
  align,
  position,
  direction,
  onClick = () => {},
  sizeByButton = false,
  style,
  openImmediately,
  withoutArrow,
  isOpen,
  toggleMenu,
}: MenuProps) {
  const styles = useStyles();
  // const [open, setOpen] = useState(openImmediately ? true : false);
  const anchor = useRef(null);
  const backdrop = useRef(null);
  const [minWidthStyle, setMinWidthStyle] = useState({});
  const menuCtx = useMenuContext();

  const [internalOpen, setInternalOpen] = useState(
    openImmediately ? true : false
  );
  const open = isOpen !== undefined ? isOpen : internalOpen;

  const close = useCallback(
    (e?: MouseEvent) => {
      if (toggleMenu) {
        toggleMenu();
      } else {
        setInternalOpen(false);
      }
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      menuCtx.close();
    },
    [menuCtx, toggleMenu]
  );

  // const close = useCallback(
  //   (e?: MouseEvent) => {
  //     setOpen(false);
  //     if (e) {
  //       e.preventDefault();
  //       e.stopPropagation();
  //     }
  //     menuCtx.close();
  //   },
  //   [menuCtx]
  // );

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
    if (toggleMenu) {
      toggleMenu();
    } else {
      setInternalOpen((x) => !x);
    }
    onClick();
  };

  // const openMenu = (e: React.MouseEvent) => {
  //   e.stopPropagation();
  //   e.preventDefault();
  //   setOpen((x) => !x);
  //   onClick();
  // };

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
      position={position!}
      align={align}
      direction={direction}
    >
      <div
        className={cn(popupClassName, styles.dropDown)}
        style={minWidthStyle}
      >
        <div className={styles.MenuContainer}>{Children.toArray(children)}</div>
        {!withoutArrow && (
          <Arrow
            containerPosition={`${position!}ArrowContainer`}
            position={position!}
            shadowPosition={`${position!}Shadow`}
            oneCellMenu={oneCellMenu}
          />
        )}
      </div>
    </Popper>

    // <Popper
    //   className={undefined}
    //   anchor={anchor.current!}
    //   open={open}
    //   position={position!}
    //   align={align}
    //   direction={direction}
    // >
    //   <div
    //     className={cn(popupClassName, styles.dropDown)}
    //     style={minWidthStyle}
    //   >
    //     <div className={styles.MenuContainer}>
    //       {Children.toArray(children).map((child, index) => (
    //         <React.Fragment key={index}>
    //           {index > 0 && <LineSeparator />}
    //           {child}
    //         </React.Fragment>
    //       ))}
    //     </div>
    //     {!withoutArrow && (
    //       <Arrow
    //         containerPosition={`${position!}ArrowContainer`}
    //         position={position!}
    //         shadowPosition={`${position!}Shadow`}
    //         oneCellMenu={oneCellMenu}
    //       />
    //     )}
    //   </div>
    // </Popper>
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
            <>{content}</>
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
