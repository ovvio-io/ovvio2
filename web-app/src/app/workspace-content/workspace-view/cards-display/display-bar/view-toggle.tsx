import React, { useCallback } from 'react';
import { ViewType } from '../../../../../../../cfds/base/scheme-types.ts';
import { Button } from '../../../../../../../styles/components/buttons.tsx';
import { IconBoardView } from '../../../../../../../styles/components/new-icons/icon-board-view.tsx';
import { IconListView } from '../../../../../../../styles/components/new-icons/icon-list-view.tsx';
import Tooltip from '../../../../../../../styles/components/tooltip/index.tsx';
import {
  makeStyles,
  cn,
} from '../../../../../../../styles/css-objects/index.ts';
import { layout } from '../../../../../../../styles/layout.ts';
import { styleguide } from '../../../../../../../styles/styleguide.ts';
import { usePartialView } from '../../../../../core/cfds/react/graph.tsx';
import { createUseStrings } from '../../../../../core/localization/index.tsx';
import { useLogger } from '../../../../../core/cfds/react/logger.tsx';
import localization from '../cards-display.strings.json' assert { type: 'json' };
import { brandLightTheme as theme1 } from '../../../../../../../styles/theme.tsx';

const HEIGHT = styleguide.gridbase * 4;

const useStyles = makeStyles((theme) => ({
  container: {
    basedOn: [layout.row],
  },
  toggleButton: {
    height: HEIGHT,
    minWidth: styleguide.gridbase * 4,
    padding: [0, styleguide.gridbase * 1.5],
    boxSizing: 'border-box',
    backgroundColor: theme.background[400],
    color: theme.background[600],
    ':first-child': {
      borderTopLeftRadius: HEIGHT / 2,
      borderBottomLeftRadius: HEIGHT / 2,
    },
    ':last-child': {
      borderTopRightRadius: HEIGHT / 2,
      borderBottomRightRadius: HEIGHT / 2,
    },
    alignItems: 'center',
    basedOn: [layout.row],
  },
  text: {
    justifyContent: 'center',
    basedOn: [layout.flexSpacer, layout.row],
  },
  toggleButtonHover: {
    ':hover': {
      backgroundColor: theme1.secondary.s4,
    },
  },
  selected: {
    color: theme.background[0],
    backgroundColor: theme.background[600],
  },
}));

const useStrings = createUseStrings(localization);

export interface ViewToggleProps {
  className?: string;
}

export function ViewToggle({ className }: ViewToggleProps) {
  const styles = useStyles();
  const logger = useLogger();
  const strings = useStrings();
  const view = usePartialView('viewType');

  const setView = useCallback(
    (type: ViewType) => {
      logger.log({
        severity: 'EVENT',
        event: 'ViewChange',
        type: type,
        source: 'toolbar:viewType',
      });
      view.viewType = type;
    },
    [logger, view],
  );

  return (
    <div className={cn(className, styles.container)}>
      <Tooltip text={strings.list}>
        <Button
          className={cn(
            styles.toggleButton,
            view.viewType !== 'list' && styles.toggleButtonHover,
            view.viewType === 'list' && styles.selected,
          )}
          onClick={() => setView('list')}
        >
          <IconListView isToggled={view.viewType === 'list'} />
        </Button>
      </Tooltip>
      <Tooltip text={strings.board}>
        <Button
          className={cn(
            styles.toggleButton,
            view.viewType !== 'board' && styles.toggleButtonHover,
            view.viewType === 'board' && styles.selected,
          )}
          onClick={() => setView('board')}
        >
          <IconBoardView isToggled={view.viewType === 'board'} />
        </Button>
      </Tooltip>
    </div>
  );
}
