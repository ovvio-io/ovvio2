import React, { useCallback } from 'https://esm.sh/react@18.2.0';
import { layout, styleguide } from '../../../../../../../styles/index.ts';
import { Button } from '../../../../../../../styles/components/buttons.tsx';
import { IconListView } from '../../../../../../../styles/components/new-icons/icon-list-view.tsx';
import { IconBoardView } from '../../../../../../../styles/components/new-icons/icon-board-view.tsx';
import Tooltip from '../../../../../../../styles/components/tooltip/index.tsx';
import {
  cn,
  makeStyles,
} from '../../../../../../../styles/css-objects/index.ts';
import { createUseStrings } from '../../../../../core/localization/index.tsx';
import { ViewType } from './index.tsx';
import localization from '../cards-display.strings.json' assert { type: 'json' };
import { useLogger } from '../../../../../core/cfds/react/logger.tsx';
import {
  FilterKeyNotes,
  FilterKeyTasks,
  useFilterContext,
  usePartialFilter,
} from '../../../../index.tsx';
import { NoteType } from '../../../../../../../cfds/client/graph/vertices/note.ts';

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
  const partialFilter = usePartialFilter(['viewType']);

  const setView = useCallback(
    (type: ViewType) => {
      logger.log({
        severity: 'INFO',
        event: 'Navigation',
        type: type,
        source: 'toolbar',
      });
      partialFilter.viewType = type;
    },
    [logger, partialFilter]
  );

  return (
    <div className={cn(className, styles.container)}>
      <Tooltip text={strings.list}>
        <Button
          className={cn(
            styles.toggleButton,
            partialFilter.viewType === ViewType.List && styles.selected
          )}
          onClick={() => setView(ViewType.List)}
        >
          <IconListView isToggled={partialFilter.viewType === ViewType.List} />
        </Button>
      </Tooltip>
      <Tooltip text={strings.board}>
        <Button
          className={cn(
            styles.toggleButton,
            partialFilter.viewType === ViewType.Board && styles.selected
          )}
          onClick={() => setView(ViewType.Board)}
        >
          <IconBoardView
            isToggled={partialFilter.viewType === ViewType.Board}
          />
        </Button>
      </Tooltip>
    </div>
  );
}
