import { layout, styleguide } from '@ovvio/styles/lib';
import Layer from '@ovvio/styles/lib/components/layer';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { MediaQueries } from '@ovvio/styles/lib/responsive';
import { isServerSide } from '@ovvio/styles/lib/utils/ssr';
import ReactDOM from 'react-dom';
import ChangesIndicator from './changes-indicator';
import { ToolbarMenu } from './header';

export const TOOLBAR_HEIGHT = styleguide.gridbase * 9;

const useStyles = makeStyles(theme => ({
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

interface ToolbarProps {
  children?: any;
}

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
          <div
            className={cn(styles.externalContainer)}
            id={TOOLBAR_RIGHT_ID}
          ></div>
          <ToolbarMenu className={cn(styles.menu)} />
        </div>
      )}
    </Layer>
  );
}

export const ToolbarRightItem: React.FC<{ className?: string }> = ({
  children,
  className,
}) => {
  return (
    <ExternalToolbarItem
      children={children}
      className={className}
      side="right"
    />
  );
};

export const ToolbarLeftItem: React.FC<{ className?: string }> = ({
  children,
  className,
}) => {
  return (
    <ExternalToolbarItem
      children={children}
      className={className}
      side="left"
    />
  );
};

export const ToolbarCenterItem: React.FC<{ className?: string }> = ({
  children,
  className,
}) => {
  return (
    <ExternalToolbarItem
      children={children}
      className={className}
      side="center"
    />
  );
};

type Side = 'left' | 'right' | 'center';
const SIDE_TO_ID: Record<Side, string> = {
  left: TOOLBAR_LEFT_ID,
  right: TOOLBAR_RIGHT_ID,
  center: TOOLBAR_CENTER_ID,
};

const ExternalToolbarItem: React.FC<{
  className?: string;
  side: Side;
}> = ({ children, side, className }) => {
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
};

export const ToolbarItem = ({ children }) => {
  const styles = useStyles();
  return <div className={cn(styles.item)}>{children}</div>;
};

export { useStyles };
