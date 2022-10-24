import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { NoteType } from '@ovvio/cfds/lib/client/graph/vertices/note';
import { layout, styleguide } from '@ovvio/styles/lib';
import { Button } from '@ovvio/styles/lib/components/buttons';
import Menu, { MenuItem } from '@ovvio/styles/lib/components/menu';
import { IconCompose } from '@ovvio/styles/lib/components/new-icons/icon-compose';
import { useTypographyStyles } from '@ovvio/styles/lib/components/typography';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { MediaQueries } from '@ovvio/styles/lib/responsive';
import { brandLightTheme as theme } from '@ovvio/styles/lib/theme';
import { EventCategory, useEventLogger } from 'core/analytics';
import { useVertices } from 'core/cfds/react/vertex';
import { createUseStrings } from 'core/localization';
import { useDocumentRouter } from 'core/react-utils';
import React, { useState } from 'react';
import { createNewCard } from 'shared/card/create';
import { WorkspaceItem } from 'shared/invite-form/workspaces-dropdown';
import { useTutorialStep } from 'shared/tutorial';
import { SelectWorkspaceMenu } from '../card-item/workspace-indicator';
import localization from '../cards-display.strings.json';
import { DisplayBarSteps } from './tutorial';
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

export interface ComposeButtonProps {
  selectedWorkspaces: VertexManager<Workspace>[];
}

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

export function ComposeButton({ selectedWorkspaces }: ComposeButtonProps) {
  const styles = useStyles();
  const eventLogger = useEventLogger();
  const docRouter = useDocumentRouter();
  const workspaces = useVertices(selectedWorkspaces);
  const [container, setContainer] = useState<HTMLDivElement>();
  const { className: composeStepClassName, next: nextStep } = useTutorialStep(
    DisplayBarSteps.CreateNote,
    container
  );

  const createCard = (ws: Workspace) => {
    nextStep();

    const note = createNewCard(ws.graph, ws, {
      type: NoteType.Note,
    });

    eventLogger.cardAction('CARD_CREATED', note, {
      category: EventCategory.FAB,
    });

    docRouter.goTo(note);
  };

  if (selectedWorkspaces.length === 1) {
    return (
      <Button onClick={() => createCard(workspaces[0])}>
        <ComposeInternalButton
          ref={div => setContainer(div)}
          className={composeStepClassName}
        />
      </Button>
    );
  }
  const onOpenMenu = () => {
    eventLogger.action('COMPOSE_BUTTON_MENU_OPENED', {
      category: EventCategory.GENERAL,
    });
    nextStep();
  };
  return (
    <Menu
      renderButton={() => (
        <ComposeInternalButton
          ref={div => setContainer(div)}
          className={composeStepClassName}
        />
      )}
      position="right"
      align="center"
      direction="in"
      onClick={onOpenMenu}
      popupClassName={cn(styles.workspacesList)}
    >
      <SelectWorkspaceMenu
        value={null}
        onChange={ws => createCard(ws.getVertexProxy())}
      />
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
