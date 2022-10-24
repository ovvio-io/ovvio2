import { layout, styleguide } from '@ovvio/styles/lib';
import { Button } from '@ovvio/styles/lib/components/buttons';
import { IconListView } from '@ovvio/styles/lib/components/new-icons/icon-list-view';
import { IconBoardView } from '@ovvio/styles/lib/components/new-icons/icon-board-view';
import Tooltip from '@ovvio/styles/lib/components/tooltip';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { useEventLogger } from 'core/analytics';
import { createUseStrings } from 'core/localization';
import { useSyncUrlParam } from 'core/react-utils/history/use-sync-url-param';
import { ViewType } from '.';
import localization from '../cards-display.strings.json';

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
  viewType: ViewType;
  setViewType: (viewType: ViewType) => void;
  className?: string;
}

export function ViewToggle({
  viewType,
  setViewType,
  className,
}: ViewToggleProps) {
  const styles = useStyles();
  const eventLogger = useEventLogger();
  const strings = useStrings();
  useSyncUrlParam('viewType', false, viewType, val => {
    const v = val === ViewType.Board ? ViewType.Board : ViewType.List;
    setViewType(v);
  });

  const setView = (view: ViewType) => {
    eventLogger.action('SET_VIEW_TYPE', {
      data: {
        viewType: view,
      },
    });
    setViewType(view);
  };

  return (
    <div className={cn(className, styles.container)}>
      <Tooltip text={strings.list}>
        <Button
          className={cn(
            styles.toggleButton,
            viewType === ViewType.List && styles.selected
          )}
          onClick={() => setView(ViewType.List)}
        >
          <IconListView isToggled={viewType === ViewType.List} />
        </Button>
      </Tooltip>
      <Tooltip text={strings.board}>
        <Button
          className={cn(
            styles.toggleButton,
            viewType === ViewType.Board && styles.selected
          )}
          onClick={() => setView(ViewType.Board)}
        >
          <IconBoardView isToggled={viewType === ViewType.Board} />
        </Button>
      </Tooltip>
    </div>
  );
}
