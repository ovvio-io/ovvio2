import { Logger } from '@ovvio/base';
import { Vertex } from '@ovvio/cfds/lib/client/graph/vertex';
import { Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { layout, styleguide } from '@ovvio/styles/lib';
import { Button } from '@ovvio/styles/lib/components/buttons';
import { IconOverflow } from '@ovvio/styles/lib/components/icons';
import Menu, {
  MenuItem,
  MenuItemStyle,
} from '@ovvio/styles/lib/components/menu';
import { useTypographyStyles } from '@ovvio/styles/lib/components/typography';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { EventCategory, useEventLogger } from 'core/analytics';
import { useGraphManager } from 'core/cfds/react/graph';
import { isWorkspace, useExistingQuery, useQuery } from 'core/cfds/react/query';
import config from 'core/config';
import { LOGIN, useHistory } from 'core/react-utils/history';
import { useScopedObservable } from 'core/state';
import { isElectron } from 'electronUtils';
import React from 'react';
import { electronConstants } from 'shared/constants/electron-constants';
import UserStore from 'stores/user';
import { usePartialVertices } from '../../../../core/cfds/react/vertex';
import { isWindowsOS } from '../../../../utils';

const useStyles = makeStyles(theme => ({
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
const OPEN_APP_ENABLED = isWindows && !isElectron();

export interface ToolbarMenuProps {
  className?: string;
}

export function ToolbarMenu({ className }: ToolbarMenuProps) {
  const styles = useStyles();
  const userStore = useScopedObservable(UserStore);
  const eventLogger = useEventLogger();
  const history = useHistory();

  const downloadApp = () => {
    const installOS = isWindows ? 'windows' : 'mac';

    if (config.appInstallations && config.appInstallations[installOS]) {
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = config.appInstallations[installOS];
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
      eventLogger.action('DESKTOP_APP_DOWNLOAD_CLICKED', {
        category: EventCategory.MENU_ITEM,
      });
    } else {
      Logger.error(
        'App install failed',
        `config.appInstallations.${installOS} not configured`
      );
    }
  };
  const signInToApp = () => {
    userStore.getElectronSSOToken().then(token => {
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = `${electronConstants.PROTOCOL_NAME}://userId=${userStore.id};token=${token}`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();

      eventLogger.action('DESKTOP_APP_SIGNIN_CLICKED', {
        category: EventCategory.MENU_ITEM,
      });
    });
  };

  return (
    <Menu
      onClick={() => {
        eventLogger.action('TOOLBAR_MENU_OPENED', {
          category: EventCategory.MENU_ITEM,
        });
      }}
      className={className}
      popupClassName={cn(styles.menu)}
      renderButton={() => <IconOverflow />}
    >
      <MenuItem onClick={() => userStore.logout(history)}>
        Sign out of Ovvio
      </MenuItem>
      {OPEN_APP_ENABLED && (
        <MenuItem onClick={downloadApp}>Download Desktop App</MenuItem>
      )}
      {OPEN_APP_ENABLED && (
        <MenuItem onClick={signInToApp}>Sign in to Desktop App</MenuItem>
      )}
    </Menu>
  );
}

export interface OvvioHeaderProps {
  className?: any;
}

export default function OvvioHeader({ className }: OvvioHeaderProps) {
  const styles = useStyles();
  const history = useHistory();

  const eventLogger = useEventLogger();
  const graph = useGraphManager();
  const { results } = useExistingQuery(
    graph.sharedQueriesManager.workspacesQuery
  );

  const workspaces = usePartialVertices(results, ['name', 'selected']);
  const selected = workspaces.filter(x => x.selected);

  const title = (function () {
    switch (selected.length) {
      case workspaces.length: {
        return 'All Workspaces';
      }
      case 0: {
        return '';
      }
      case 1: {
        return selected[0].name;
      }
      default: {
        return 'Multiple Workspaces';
      }
    }
  })();

  const ovvioHeaderClicked = () => {
    //Route back to / if not there already
    const currentRoute = history.currentRoute;
    eventLogger.action('OVVIO_HEADER_CLICKED', {
      source: `${currentRoute.id}:${currentRoute.url}`,
    });
    if (!currentRoute || currentRoute.url !== '/') {
      history.push(LOGIN);
      return;
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
