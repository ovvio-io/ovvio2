import React, { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import {
  Note,
  User,
  Workspace,
} from '../../../../../../../cfds/client/graph/vertices/index.ts';
import { layout, styleguide } from '../../../../../../../styles/index.ts';
import {
  Button,
  RaisedButton,
} from '../../../../../../../styles/components/buttons.tsx';
import {
  Dialog,
  DialogActions,
  DialogContent,
} from '../../../../../../../styles/components/dialog/index.tsx';
import { IconDropDownArrow } from '../../../../../../../styles/components/icons/index.ts';
import Menu, {
  MenuItem,
} from '../../../../../../../styles/components/menu.tsx';
import { H2, Text } from '../../../../../../../styles/components/texts.tsx';
import { useToastController } from '../../../../../../../styles/components/toast/index.tsx';
import {
  cn,
  keyframes,
  makeStyles,
} from '../../../../../../../styles/css-objects/index.ts';
import { useTheme } from '../../../../../../../styles/theme.tsx';
import {
  useGraphManager,
  useRootUser,
} from '../../../../../core/cfds/react/graph.tsx';
import {
  useCurrentUser,
  usePartialVertex,
  useVertices,
} from '../../../../../core/cfds/react/vertex.ts';
import { useAnimateWidth } from '../../../../../core/react-utils/animate.ts';
import { Scroller } from '../../../../../core/react-utils/scrolling.tsx';
import WorkspaceIcon from '../../../../../shared/workspace-icon/index.tsx';
import { UISource } from '../../../../../../../logging/client-events.ts';
import { useLogger } from '../../../../../core/cfds/react/logger.tsx';
import { coreValueCompare } from '../../../../../../../base/core-types/comparable.ts';
import { useSharedQuery } from '../../../../../core/cfds/react/query.ts';

const showAnim = keyframes({
  '0%': {
    opacity: 0,
  },
  '99%': {
    opacity: 0,
  },
  '100%': {
    opacity: 1,
  },
});

const useStyles = makeStyles((theme) => ({
  workspaceItem: {
    alignItems: 'center',
    basedOn: [layout.row],
  },
  indicatorButton: {
    ...styleguide.transition.short,
    transitionProperty: 'all',
  },
  wsName: {
    marginLeft: styleguide.gridbase,
    marginRight: styleguide.gridbase * 0.5,
    whiteSpace: 'nowrap',
    color: theme.background.placeholderText,
  },
  wsSeparator: {
    alignSelf: 'center',
    height: styleguide.gridbase * 2,
    width: 1,
    backgroundColor: theme.background.placeholderText,
    opacity: 0.7,
    marginRight: styleguide.gridbase,
    marginLeft: styleguide.gridbase * 0.5,
  },
  wsArrow: {
    position: 'relative',
    top: 1,
    animation: `${showAnim} ${styleguide.transition.duration.short}ms backwards linear`,
    cursor: 'pointer',
  },
  hide: {
    display: 'none',
  },
  dialogTitle: {
    marginBottom: styleguide.gridbase * 2,
  },
  move: {
    overflowY: 'auto',
    maxHeight: styleguide.gridbase * 32,
  },
  moveWsItem: {
    backgroundColor: theme.background[0],
    transition: `opacity linear ${styleguide.transition.duration.short}ms`,
    ':hover': {
      backgroundColor: theme.background[300],
    },
  },
  selectedWs: {
    backgroundColor: theme.background[400],
  },
}));

export type WorkspaceIndicatorButtonProps = Omit<
  WorkspaceIndicatorProps,
  'setWorkspace'
>;

function WorkspaceIndicatorButton({
  workspace,
  isExpanded,
  className,
  readOnly,
}: WorkspaceIndicatorButtonProps) {
  const styles = useStyles();
  const { name } = usePartialVertex<Workspace>(workspace, ['name']);
  const ref = useRef(null);
  const style = useAnimateWidth(ref, isExpanded);
  const theme = useTheme();

  return (
    <div
      className={cn(styles.workspaceItem, styles.indicatorButton, className)}
      ref={ref}
      style={style}
    >
      {workspace ? (
        <WorkspaceIcon
          workspaceManager={workspace}
          size={styleguide.gridbase * 2.75}
        />
      ) : null}
      <Text className={cn(styles.wsName)}>{name}</Text>
      {readOnly !== true && (
        <div className={cn(styles.wsArrow, !isExpanded && styles.hide)}>
          <IconDropDownArrow fill={theme.background.placeholderText} />
        </div>
      )}
      <div className={cn(styles.wsSeparator)} />
    </div>
  );
}

interface CardWorkspaceIndicatorProps {
  card: VertexManager<Note>;
  isExpanded: boolean;
  source: UISource;
  className?: string;
}

export function CardWorkspaceIndicator({
  card,
  isExpanded,
  source,
  className,
}: CardWorkspaceIndicatorProps) {
  const { workspace } = usePartialVertex(card, ['workspace']);
  const workspaceManager = workspace?.manager as VertexManager<Workspace>;
  const graph = useGraphManager();
  const toastController = useToastController();
  const logger = useLogger();
  const navigate = useNavigate();

  if (!workspaceManager) {
    return null;
  }

  const onMove = (ws: VertexManager<Workspace>) => {
    const newCard = undefined; // = moveCard(card, ws, graph, logger, source);
    if (!newCard) {
      toastController.displayToast({
        text: `Move failed. Try again later`,
        duration: 1500,
      });
      return;
    }
    toastController.displayToast({
      text: `Card moved to ${ws.getVertexProxy().name}`,
      duration: 1500,
    });

    if (source === 'title') {
      navigate(`/${newCard.workspace.key}/${newCard.key}`);
    }
  };

  return (
    <WorkspaceIndicator
      workspace={workspaceManager}
      setWorkspace={onMove}
      className={className}
      isExpanded={isExpanded}
      readOnly={false}
    />
  );
}

export interface WorkspaceIndicatorProps {
  workspace: undefined | VertexManager<Workspace>;
  setWorkspace: (workspace: VertexManager<Workspace>) => void;
  isExpanded: boolean;
  className?: string;
  readOnly?: boolean;
  menuClassName?: string;
  ButtonComponent?: React.ComponentType<WorkspaceIndicatorButtonProps>;
  validateMove?: boolean;
}

export function WorkspaceIndicator({
  workspace,
  setWorkspace,
  isExpanded,
  className,
  readOnly,
  menuClassName,
  ButtonComponent = WorkspaceIndicatorButton,
  validateMove = true,
}: WorkspaceIndicatorProps) {
  const renderButton = useCallback(
    () => (
      <ButtonComponent
        workspace={workspace}
        className={className}
        isExpanded={isExpanded}
        readOnly={readOnly}
      />
    ),
    [workspace, className, isExpanded, readOnly, ButtonComponent],
  );

  const [changeTo, setChangeTo] = useState<VertexManager<Workspace> | null>(
    null,
  );
  const onWsChanged = (ws: VertexManager<Workspace>) => {
    if (validateMove) {
      setChangeTo(ws);
    } else {
      setWorkspace(ws);
    }
  };

  const onMove = () => {
    setWorkspace(changeTo!);
    setChangeTo(null);
  };

  if (readOnly) {
    return renderButton();
  }

  return (
    <React.Fragment>
      <Menu
        className={menuClassName}
        renderButton={renderButton}
        align="start"
        position="bottom"
      >
        <SelectWorkspaceMenu value={workspace} onChange={onWsChanged} />
      </Menu>
      <MoveWorkspaceDialog
        isOpen={!!changeTo}
        close={() => setChangeTo(null)}
        onMove={onMove}
      />
    </React.Fragment>
  );
}

export function sortWorkspaces(
  ws1: Workspace,
  ws2: Workspace,
  pinnedWorkspaces: Set<string>,
  hiddenWorkspaces: Set<string>,
) {
  if (pinnedWorkspaces.has(ws1.key) && !pinnedWorkspaces.has(ws2.key)) {
    return -1;
  }
  if (!pinnedWorkspaces.has(ws1.key) && pinnedWorkspaces.has(ws2.key)) {
    return 1;
  }

  if (hiddenWorkspaces.has(ws1.key) && !hiddenWorkspaces.has(ws2.key)) {
    return 1;
  }
  if (!hiddenWorkspaces.has(ws1.key) && hiddenWorkspaces.has(ws2.key)) {
    return -1;
  }

  return coreValueCompare(ws1, ws2);
}

export interface SelectWorkspaceMenuProps {
  value: VertexManager<Workspace> | undefined;
  onChange: (wsMng: VertexManager<Workspace>) => void;
}
export function SelectWorkspaceMenu({
  value,
  onChange,
}: SelectWorkspaceMenuProps) {
  const styles = useStyles();
  const graph = useGraphManager();
  const user = useCurrentUser();
  const { hiddenWorkspaces, pinnedWorkspaces } = usePartialVertex(
    user.settings,
    ['hiddenWorkspaces', 'pinnedWorkspaces'],
  );
  const workspacesQuery = useSharedQuery('workspaces');
  const workspaces = useVertices(workspacesQuery.results);
  const sortedWorkspaces = Array.from(workspaces)
    .filter((x) => x.name?.length > 0 && !x.key.endsWith('-ws'))
    .sort((ws1, ws2) =>
      sortWorkspaces(ws1, ws2, pinnedWorkspaces, hiddenWorkspaces),
    );
  const onSelect = (wsMng: VertexManager<Workspace>) => {
    if (value && wsMng.key === value.key) {
      return;
    }
    onChange(wsMng);
  };
  return (
    <Scroller>
      {(ref) => (
        <div ref={ref} className={cn(styles.move)}>
          {sortedWorkspaces.map((ws) => (
            <MenuItem
              key={ws.key}
              className={cn(
                styles.workspaceItem,
                styles.moveWsItem,
                value?.key === ws.key && styles.selectedWs,
              )}
              onClick={() => onSelect(ws.manager as VertexManager<Workspace>)}
            >
              <WorkspaceIcon
                workspaceManager={ws.manager as VertexManager<Workspace>}
                size={styleguide.gridbase * 2.75}
              />
              <Text className={cn(styles.wsName)}>{ws.name}</Text>
            </MenuItem>
          ))}
        </div>
      )}
    </Scroller>
  );
}

interface MoveWorkspaceDialogProps {
  onMove: () => void;
  close: () => void;
  isOpen: boolean;
}
function MoveWorkspaceDialog({
  onMove,
  close,
  isOpen,
}: MoveWorkspaceDialogProps) {
  const styles = useStyles();
  return (
    <Dialog open={isOpen} onClose={close} onClickOutside={close}>
      <DialogContent>
        <H2 className={cn(styles.dialogTitle)}>Are you sure?</H2>
        <Text>
          Moving this card will move all of its children and will remove tags
          that don't exist in the destination workspace
        </Text>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Cancel</Button>
        <RaisedButton onClick={onMove}>Move</RaisedButton>
      </DialogActions>
    </Dialog>
  );
}
