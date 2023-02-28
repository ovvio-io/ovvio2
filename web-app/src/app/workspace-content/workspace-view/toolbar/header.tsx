import React from 'https://esm.sh/react@18.2.0';
import { useLocation, useNavigate } from 'https://esm.sh/react-router@6.7.0';
import { layout, styleguide } from '../../../../../../styles/index.ts';
import { Button } from '../../../../../../styles/components/buttons.tsx';
import { IconOverflow } from '../../../../../../styles/components/icons/index.ts';
import Menu, {
  MenuItem,
  MenuItemStyle,
} from '../../../../../../styles/components/menu.tsx';
import { useTypographyStyles } from '../../../../../../styles/components/typography.tsx';
import { cn, makeStyles } from '../../../../../../styles/css-objects/index.ts';
import { useSharedQuery } from '../../../../core/cfds/react/query.ts';
import { usePartialVertices } from '../../../../core/cfds/react/vertex.ts';
import { isWindowsOS } from '../../../../utils.ts';
import { useLogger } from '../../../../core/cfds/react/logger.tsx';

const useStyles = makeStyles((theme) => ({
  headerRoot: {
    basedOn: [layout.column],
  },
  headerContent: {
    height: styleguide.gridbase * 9,
    alignItems: 'center',
    basedOn: [layout.row],
  },
  headerText: {
    marginLeft: styleguide.gridbase * 2.5,
    fontSize: 18,
    lineHeight: `${styleguide.gridbase * 3}px`,
    letterSpacing: '1px',
    basedOn: [useTypographyStyles.bold],
  },
  menu: {
    maxHeight: MenuItemStyle.rules.height * 8,
    overflowY: 'auto',
  },
}));

const isWindows = isWindowsOS();
const OPEN_APP_ENABLED = false; //isWindows && !isElectron();

export interface ToolbarMenuProps {
  className?: string;
}

export function ToolbarMenu({ className }: ToolbarMenuProps) {
  const styles = useStyles();
  const logger = useLogger();

  return (
    <Menu
      onClick={() => {
        logger.log({
          severity: 'INFO',
          event: 'Click',
          source: 'toolbar:menu',
        });
      }}
      className={className}
      popupClassName={cn(styles.menu)}
      renderButton={() => <IconOverflow />}
    >
      <MenuItem onClick={() => {}}>Sign out of Ovvio</MenuItem>
      {/* {OPEN_APP_ENABLED && (
        <MenuItem onClick={downloadApp}>Download Desktop App</MenuItem>
      )}
      {OPEN_APP_ENABLED && (
        <MenuItem onClick={signInToApp}>Sign in to Desktop App</MenuItem>
      )} */}
    </Menu>
  );
}

export interface OvvioHeaderProps {
  className?: any;
}

export default function OvvioHeader({ className }: OvvioHeaderProps) {
  const styles = useStyles();
  const logger = useLogger();
  const location = useLocation();
  const navigate = useNavigate();
  const selectedWorkspacesQuery = useSharedQuery('selectedWorkspaces');
  const workspacesQuery = useSharedQuery('workspaces');
  const partialSelectedWorkspaces = usePartialVertices(
    selectedWorkspacesQuery.results,
    ['name']
  );

  const title = (function () {
    switch (selectedWorkspacesQuery.count) {
      case workspacesQuery.count: {
        return 'All Workspaces';
      }
      case 0: {
        return '';
      }
      case 1: {
        return partialSelectedWorkspaces[0].name;
      }
      default: {
        return 'Multiple Workspaces';
      }
    }
  })();

  const ovvioHeaderClicked = () => {
    //Route back to / if not there already
    logger.log({
      severity: 'INFO',
      event: 'Click',
      source: 'toolbar:header',
    });
    if (location.pathname !== '/') {
      navigate('/');
    }
  };

  return (
    <div className={cn(styles.headerRoot, className)}>
      <div className={cn(styles.headerContent)}>
        <Button className={cn(styles.headerText)} onClick={ovvioHeaderClicked}>
          {title}
        </Button>
      </div>
    </div>
  );
}
