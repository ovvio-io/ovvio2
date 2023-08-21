import React, { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../../../../../styles/components/buttons.tsx';
import IconOverflow from '../../../../../../styles/components/icons/IconOverflow.tsx';
import Menu, {
  MenuItemStyle,
  MenuItem,
} from '../../../../../../styles/components/menu.tsx';
import { useTypographyStyles } from '../../../../../../styles/components/typography.tsx';
import { makeStyles, cn } from '../../../../../../styles/css-objects/index.ts';
import { layout } from '../../../../../../styles/layout.ts';
import { styleguide } from '../../../../../../styles/styleguide.ts';
import { useGraphManager } from '../../../../core/cfds/react/graph.tsx';
import { useExistingQuery } from '../../../../core/cfds/react/query.ts';
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
const OPEN_APP_ENABLED = isWindows; // && !isElectron();

export interface ToolbarMenuProps {
  className?: string;
}

export function ToolbarMenu({ className }: ToolbarMenuProps) {
  const styles = useStyles();
  const logger = useLogger();

  return (
    <>
    <Menu
      className={className}
      popupClassName={cn(styles.menu)}
      renderButton={() => <IconOverflow />}
    >

      
      <MenuItem>Sign out of Ovvio</MenuItem>
    </Menu>
    
      {console.log("className: ", className)}
      {console.log("style: ", styles.menu)}
      </>
  );
}

export interface OvvioHeaderProps {
  className?: any;
}

export default function OvvioHeader({ className }: OvvioHeaderProps) {
  const styles = useStyles();
  const graph = useGraphManager();
  const { results } = useExistingQuery(graph.sharedQueriesManager.workspaces);
  const navigate = useNavigate();
  const logger = useLogger();
  const workspaces = usePartialVertices(results, ['name', 'selected']);
  const selected = workspaces.filter((x) => x.selected);

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

  const ovvioHeaderClicked = useCallback(() => {
    logger.log({
      severity: 'INFO',
      event: 'Click',
      source: 'toolbar:logo',
    });
    navigate('/');
  }, [logger, navigate]);

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
