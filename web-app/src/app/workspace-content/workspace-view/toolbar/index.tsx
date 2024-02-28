import React from 'react';
import ReactDOM from 'react-dom';
import { layout, styleguide } from '../../../../../../styles/index.ts';
import Layer from '../../../../../../styles/components/layer.tsx';
import { cn, makeStyles } from '../../../../../../styles/css-objects/index.ts';
import { MediaQueries } from '../../../../../../styles/responsive.ts';
import { isServerSide } from '../../../../../../styles/utils/ssr.ts';
import ChangesIndicator from './changes-indicator/index.tsx';
import { ToolbarMenu } from './header.tsx';
import { IconNotification } from '../../../../../../styles/components/new-icons/icon-notification.tsx';

export const TOOLBAR_HEIGHT = styleguide.gridbase * 10;

const useStyles = makeStyles((theme) => ({
  toolbar: {
    height: TOOLBAR_HEIGHT,
    backgroundColor: theme.background[0],
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: [0, styleguide.gridbase * 2],
    paddingLeft: 0,
    flexShrink: 0,
    borderBottom: `1px solid #d7e3f1`,
    boxShadow: theme.shadows.z1,
    basedOn: [layout.row],
  },
  logo: {
    width: styleguide.gridbase * 32,
    flexShrink: 0,
  },
  searchContainer: {
    [MediaQueries.Computer]: {
      width: styleguide.gridbase * 38,
    },
    [MediaQueries.TabletAndMobile]: {
      flex: '1 1 auto',
    },
  },
  item: {
    marginRight: styleguide.gridbase * 2,
    ':last-child': {
      marginRight: 0,
    },
  },
  externalContainer: {
    alignItems: 'center',
    basedOn: [layout.row],
  },
  shareBtn: {
    margin: [0, styleguide.gridbase],
  },
  iconBtn: {
    marginRight: styleguide.gridbase,
  },
  menu: {
    marginRight: styleguide.gridbase,
  },
}));

type ToolbarProps = React.PropsWithChildren<{ className?: string }>;

const TOOLBAR_RIGHT_ID = 'toolbar_00827f';
const TOOLBAR_LEFT_ID = 'toolbar_fe702c';
const TOOLBAR_CENTER_ID = 'toolbar_a86e6b';

export default function Toolbar({ children }: ToolbarProps) {
  const styles = useStyles();
  return (
    <Layer>
      {({ zIndex }) => (
        <div className={cn(styles.toolbar)} style={{ zIndex }}>
          <div
            className={cn(styles.externalContainer)}
            id={TOOLBAR_LEFT_ID}
          ></div>
          <div
            className={cn(styles.searchContainer, styles.externalContainer)}
            id={TOOLBAR_CENTER_ID}
          />
          {children}
          <div className={cn(layout.flexSpacer)} />
          <ChangesIndicator />
          <div className={cn(styles.externalContainer)} id={TOOLBAR_RIGHT_ID} />
          {/* <IconNotification /> */}
          <div style={{ width: '20px' }}></div>
          <ToolbarMenu className={cn(styles.menu)} />
        </div>
      )}
    </Layer>
  );
}

export function ToolbarRightItem({ className, children }: ToolbarProps) {
  return (
    <ExternalToolbarItem
      children={children}
      className={className}
      side="right"
    />
  );
}

export function ToolbarLeftItem({ className, children }: ToolbarProps) {
  return (
    <ExternalToolbarItem
      children={children}
      className={className}
      side="left"
    />
  );
}

export type ToolbarCenterItemProps = React.PropsWithChildren<{
  className?: string;
}>;

export function ToolbarCenterItem({
  children,
  className,
}: ToolbarCenterItemProps) {
  return (
    <ExternalToolbarItem
      children={children}
      className={className}
      side="center"
    />
  );
}

type Side = 'left' | 'right' | 'center';
const SIDE_TO_ID: Record<Side, string> = {
  left: TOOLBAR_LEFT_ID,
  right: TOOLBAR_RIGHT_ID,
  center: TOOLBAR_CENTER_ID,
};

function ExternalToolbarItem({
  className,
  side,
  children,
}: React.PropsWithChildren<{
  className?: string;
  side: Side;
}>) {
  const styles = useStyles();
  if (isServerSide) {
    return null;
  }
  const id = SIDE_TO_ID[side];
  const el = document.getElementById(id);
  if (!el) {
    return null;
  }
  return ReactDOM.createPortal(
    <div className={cn(className, styles.item)}>{children}</div>,
    el
  );
}

export const ToolbarItem = ({ children }: React.PropsWithChildren<{}>) => {
  const styles = useStyles();
  return <div className={cn(styles.item)}>{children}</div>;
};

export { useStyles };
