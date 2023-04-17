import React, { useCallback, useState } from 'react';
import { Workspace } from '../../../../../../../cfds/client/graph/vertices/workspace.ts';
import {
  Note,
  NoteType,
} from '../../../../../../../cfds/client/graph/vertices/note.ts';
import { layout, styleguide } from '../../../../../../../styles/index.ts';
import { Button } from '../../../../../../../styles/components/buttons.tsx';
import Menu from '../../../../../../../styles/components/menu.tsx';
import { IconCompose } from '../../../../../../../styles/components/new-icons/icon-compose.tsx';
import { useTypographyStyles } from '../../../../../../../styles/components/typography.tsx';
import {
  cn,
  makeStyles,
} from '../../../../../../../styles/css-objects/index.ts';
import { MediaQueries } from '../../../../../../../styles/responsive.ts';
import { brandLightTheme as theme } from '../../../../../../../styles/theme.tsx';
import { createUseStrings } from '../../../../../core/localization/index.tsx';
import { useDocumentRouter } from '../../../../../core/react-utils/index.ts';
import { SelectWorkspaceMenu } from '../card-item/workspace-indicator.tsx';
import localization from '../cards-display.strings.json' assert { type: 'json' };
import { useLogger } from '../../../../../core/cfds/react/logger.tsx';
import { NS_NOTES } from '../../../../../../../cfds/base/scheme-types.ts';
import { createNewNote } from '../../../../../shared/card/create.ts';
import { useSharedQuery } from '../../../../../core/cfds/react/query.ts';
import { useGraphManager } from '../../../../../core/cfds/react/graph.tsx';
import { VertexId } from '../../../../../../../cfds/client/graph/vertex.ts';

const useStyles = makeStyles(() => ({
  compose: {
    background: theme.colors.primaryButton,
    height: styleguide.gridbase * 4,
    boxSizing: 'border-box',
    padding: [0, styleguide.gridbase],
    borderRadius: styleguide.gridbase * 2,
    ...styleguide.transition.short,
    transitionProperty: 'box-shadow',
    ':hover': {
      boxShadow: theme.shadows.z2,
    },
    alignItems: 'center',
    basedOn: [layout.row],
  },
  text: {
    color: theme.colors.primaryButtonText,
    padding: [0, styleguide.gridbase],
    basedOn: [useTypographyStyles.button],
    [MediaQueries.TabletAndMobile]: {
      display: 'none',
    },
  },
  workspacesList: {
    maxHeight: styleguide.gridbase * 30,
    overflowY: 'auto',
  },
}));

const useStrings = createUseStrings(localization);

const ComposeInternalButton = React.forwardRef(
  (
    { className }: { className?: string },
    ref: React.ForwardedRef<HTMLDivElement>
  ) => {
    const styles = useStyles();
    const strings = useStrings();

    return (
      <div className={cn(styles.compose, className)} ref={ref}>
        <IconCompose />
        <span className={cn(styles.text)}>{strings.compose}</span>
      </div>
    );
  }
);

export function ComposeButton() {
  const styles = useStyles();
  const logger = useLogger();
  const docRouter = useDocumentRouter();
  const selectedWorkspacesQuery = useSharedQuery('selectedWorkspaces');
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const graph = useGraphManager();

  const createCard = useCallback(
    (ws: VertexId<Workspace>) => {
      const note = createNewNote(graph, ws, {
        type: NoteType.Note,
      });

      logger.log({
        severity: 'INFO',
        event: 'Create',
        type: 'note',
        source: 'toolbar:compose',
        vertex: note.key,
      });

      docRouter.goTo(note);
    },
    [logger, graph, docRouter]
  );

  if (selectedWorkspacesQuery.count === 1) {
    return (
      <Button onClick={() => createCard(selectedWorkspacesQuery.results[0])}>
        <ComposeInternalButton ref={(div) => setContainer(div)} />
      </Button>
    );
  }
  return (
    <Menu
      renderButton={() => (
        <ComposeInternalButton ref={(div) => setContainer(div)} />
      )}
      position="right"
      align="center"
      direction="in"
      popupClassName={cn(styles.workspacesList)}
    >
      <SelectWorkspaceMenu value={null} onChange={(ws) => createCard(ws)} />
      {/* {selectedWorkspaces.map(workspace => (
        <MenuItem
          key={workspace.key}
          onClick={() => createCard(workspace.getVertexProxy())}
        >
          <WorkspaceItem workspace={workspace} />
        </MenuItem>
      ))} */}
    </Menu>
  );
}
