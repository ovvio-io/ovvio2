import React, { useState } from 'react';
import { NoteType } from '../../../../../../../cfds/client/graph/vertices/note.ts';
import { Button } from '../../../../../../../styles/components/buttons.tsx';
// import Menu, {
//   MenuItem,
// } from '../../../../../../../styles/components/menu.tsx';
import { IconCompose } from '../../../../../../../styles/components/new-icons/icon-compose.tsx';
import { useTypographyStyles } from '../../../../../../../styles/components/typography.tsx';
import {
  cn,
  makeStyles,
} from '../../../../../../../styles/css-objects/index.ts';
import { layout } from '../../../../../../../styles/layout.ts';
import { brandLightTheme as theme } from '../../../../../../../styles/theme.tsx';
import { MediaQueries } from '../../../../../../../styles/responsive.ts';
import { styleguide } from '../../../../../../../styles/styleguide.ts';
import {
  useGraphManager,
  usePartialGlobalView,
} from '../../../../../core/cfds/react/graph.tsx';
import { createUseStrings } from '../../../../../core/localization/index.tsx';
import { useDocumentRouter } from '../../../../../core/react-utils/index.ts';
// import { SelectWorkspaceMenu } from '../card-item/workspace-indicator.tsx';
import { useLogger } from '../../../../../core/cfds/react/logger.tsx';
import { createNewNote } from '../../../../../shared/card/create.ts';
import localization from '../cards-display.strings.json' assert { type: 'json' };
import Menu, {
  MenuItem,
} from '../../../../../../../styles/components/menu.tsx';
import {
  usePartialVertices,
  useVertices,
} from '../../../../../core/cfds/react/vertex.ts';
import { WorkspaceItem } from '../../../../new-workspace/workspaces-dropdown.tsx';
import { SelectWorkspaceMenu } from '../card-item/workspace-indicator.tsx';
import { Workspace } from '../../../../../../../cfds/client/graph/vertices/workspace.ts';
import { WorkspaceIndicator } from '../../../../../../../components/workspace-indicator.tsx';
import { coreValueCompare } from '../../../../../../../base/core-types/comparable.ts';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
// import { WorkspaceItem } from '../../../../new-workspace/workspaces-dropdown.tsx';

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
  colorIndicator: {
    marginRight: styleguide.gridbase,
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
  const graph = useGraphManager();
  const view = usePartialGlobalView('selectedWorkspaces');
  const workspaceKeys = Array.from(view.selectedWorkspaces).map((ws) => ws.key);
  const personalWsKey = `${graph.rootKey}-ws`;
  if (!workspaceKeys.includes(personalWsKey)) {
    workspaceKeys.push(personalWsKey);
  }
  const partialWorkspaces = usePartialVertices<Workspace>(workspaceKeys, [
    'name',
  ]).sort(coreValueCompare);
  const [container, setContainer] = useState<HTMLDivElement | null>();

  const createCard = (ws: VertexManager<Workspace>) => {
    const note = createNewNote(graph, ws, {
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

  // if (workspaces.length === 1) {
  // return (
  //   <Button onClick={() => createCard()}>
  //     <ComposeInternalButton />
  //   </Button>
  // );
  // }
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
      {partialWorkspaces.map((ws) => (
        <MenuItem onClick={() => createCard(ws.manager)}>
          <WorkspaceIndicator
            className={cn(styles.colorIndicator)}
            workspace={ws.manager as VertexManager<Workspace>}
            type="color"
          />
          {ws.name}
        </MenuItem>
      ))}
    </Menu>
  );
}
