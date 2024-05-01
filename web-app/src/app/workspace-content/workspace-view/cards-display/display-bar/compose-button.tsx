import React, { useState } from 'react';
import { NoteType } from '../../../../../../../cfds/client/graph/vertices/note.ts';
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
import { BlueActionButton } from '../../../../settings/components/settings-buttons.tsx';
import { SearchBar } from '../../../../../../../components/search-bar.tsx';
import { suggestResults } from '../../../../../../../cfds/client/suggestions.ts';
// import { WorkspaceItem } from '../../../../new-workspace/workspaces-dropdown.tsx';

const useStyles = makeStyles(() => ({
  workspacesList: {
    maxHeight: styleguide.gridbase * 30,
    overflowY: 'auto',
    overflowX: 'clip',
  },
  colorIndicator: {
    marginRight: styleguide.gridbase,
  },
  blue: {
    background: '#3184DD',
    border: 'none',
    ':hover': {
      boxShadow: theme.shadows.z2,
      background: theme.primary.p10,
    },
  },
  wsItem: {
    maxWidth: '400px',
    width: '400px',
  },
}));

const useStrings = createUseStrings(localization);

export function ComposeButton() {
  const styles = useStyles();
  const logger = useLogger();
  const docRouter = useDocumentRouter();
  const graph = useGraphManager();
  const view = usePartialGlobalView('selectedWorkspaces');
  const strings = useStrings();
  const workspaceKeys = Array.from(view.selectedWorkspaces).map((ws) => ws.key);
  const personalWsKey = `${graph.rootKey}-ws`;
  if (!workspaceKeys.includes(personalWsKey)) {
    workspaceKeys.push(personalWsKey);
  }
  const partialWorkspaces = usePartialVertices<Workspace>(workspaceKeys, [
    'name',
  ]).sort(coreValueCompare);
  const [container, setContainer] = useState<HTMLDivElement | null>();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const filtered = suggestResults(
    searchTerm,
    partialWorkspaces,
    (t) => t.name,
    Number.MAX_SAFE_INTEGER
  );

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
        <BlueActionButton
          disable={false}
          buttonText={strings.compose}
          imgSrc={'/icons/settings/Compose-white.svg'}
        />
      )}
      position="left"
      align="end"
      direction="out"
      popupClassName={cn(styles.workspacesList)}
    >
      <SearchBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        isSearching={true}
        isPicker={true}
      ></SearchBar>
      {filtered.map((ws) => (
        <MenuItem
          className={styles.wsItem}
          onClick={() => createCard(ws.manager)}
        >
          <WorkspaceIndicator
            className={cn(styles.colorIndicator)}
            workspace={ws.manager as VertexManager<Workspace>}
            type="color"
            ofSettings={false}
          />
          {ws.name}
        </MenuItem>
      ))}
    </Menu>
  );
}
