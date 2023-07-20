import { layout, styleguide } from '@ovvio/styles/lib';
import { Button } from '@ovvio/styles/lib/components/buttons';
import { IconListView } from '@ovvio/styles/lib/components/new-icons/icon-list-view';
import { IconBoardView } from '@ovvio/styles/lib/components/new-icons/icon-board-view';
import Tooltip from '@ovvio/styles/lib/components/tooltip';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { useEventLogger } from 'core/analytics';
import { createUseStrings } from 'core/localization';
import localization from '../cards-display.strings.json';
import { usePartialView } from 'core/cfds/react/graph';
import { useCallback } from 'react';
import { ViewType } from '@ovvio/cfds/lib/base/scheme-types';

const HEIGHT = styleguide.gridbase * 4;

const useStyles = makeStyles(theme => ({
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
  const eventLogger = useEventLogger();
  const strings = useStrings();
  const view = usePartialView('viewType', 'showPinned');

  const setView = useCallback(
    (type: ViewType) => {
      eventLogger.action('SET_VIEW_TYPE', {
        data: {
          viewType: type,
        },
      });
      view.viewType = type;
      view.showPinned = view.viewType === 'board' ? 'all' : 'pinned-unpinned';
    },
    [eventLogger, view]
  );

  return (
    <div className={cn(className, styles.container)}>
      <Tooltip text={strings.list}>
        <Button
          className={cn(
            styles.toggleButton,
            view.viewType === 'list' && styles.selected
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
            view.viewType === 'board' && styles.selected
          )}
          onClick={() => setView('board')}
        >
          <IconBoardView isToggled={view.viewType === 'board'} />
        </Button>
      </Tooltip>
    </div>
  );
}
