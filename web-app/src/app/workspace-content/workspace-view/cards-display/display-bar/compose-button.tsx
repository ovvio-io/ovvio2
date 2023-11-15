import React, { useState } from 'react';
import { NoteType } from '../../../../../../../cfds/client/graph/vertices/note.ts';
import { Workspace } from '../../../../../../../cfds/client/graph/vertices/workspace.ts';
import { Button } from '../../../../../../../styles/components/buttons.tsx';
import Menu, {
  MenuItem,
} from '../../../../../../../styles/components/menu.tsx';
import { IconCompose } from '../../../../../../../styles/components/new-icons/icon-compose.tsx';
import { useTypographyStyles } from '../../../../../../../styles/components/typography.tsx';
import {
  makeStyles,
  cn,
} from '../../../../../../../styles/css-objects/index.ts';
import { layout } from '../../../../../../../styles/layout.ts';
import { brandLightTheme as theme } from '../../../../../../../styles/theme.tsx';
import { MediaQueries } from '../../../../../../../styles/responsive.ts';
import { styleguide } from '../../../../../../../styles/styleguide.ts';
import {
  usePartialGlobalView,
  usePartialView,
} from '../../../../../core/cfds/react/graph.tsx';
import { useVertices } from '../../../../../core/cfds/react/vertex.ts';
import { createUseStrings } from '../../../../../core/localization/index.tsx';
import { useDocumentRouter } from '../../../../../core/react-utils/index.ts';
import { SelectWorkspaceMenu } from '../card-item/workspace-indicator.tsx';
import { useLogger } from '../../../../../core/cfds/react/logger.tsx';
import { createNewNote } from '../../../../../shared/card/create.ts';
import localization from '../cards-display.strings.json' assert { type: 'json' };
import { WorkspaceItem } from '../../../../new-workspace/workspaces-dropdown.tsx';

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
  const view = usePartialGlobalView('selectedWorkspaces');
  const workspaces = useVertices(view.selectedWorkspaces);
  const [container, setContainer] = useState<HTMLDivElement | null>();

  const createCard = (ws: Workspace) => {
    const note = createNewNote(ws.graph, ws, {
      type: NoteType.Note,
    });

    logger.log({
      severity: 'EVENT',
      event: 'Create',
      type: 'note',
      source: 'toolbar',
    });

    docRouter.goTo(note);
  };

  if (workspaces.length === 1) {
    return (
      <Button onClick={() => createCard(workspaces[0])}>
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
      <SelectWorkspaceMenu
        value={null}
        onChange={(ws) => createCard(ws.getVertexProxy())}
      />
      {workspaces.map((workspace) => (
        <MenuItem key={workspace.key} onClick={() => createCard(workspace)}>
          <WorkspaceItem workspace={workspace.manager} />
        </MenuItem>
      ))}
    </Menu>
  );
}
