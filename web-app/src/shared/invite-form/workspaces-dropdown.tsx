import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { usePartialVertex } from 'core/cfds/react/vertex';
import { createUseStrings } from 'core/localization';
import WorkspaceIcon from 'shared/workspace-icon';

import { layout, styleguide } from '@ovvio/styles/lib';
import { IconDropDownArrow } from '@ovvio/styles/lib/components/icons';
import DropDown, {
  DropDownItem,
} from '@ovvio/styles/lib/components/inputs/drop-down';
import { Text } from '@ovvio/styles/lib/components/texts';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import localization from './invite.strings.json';

const useStyles = makeStyles(theme => ({
  workspaces: {
    minWidth: styleguide.gridbase * 24,
    border: `1px solid ${theme.background.placeholderText}`,
    borderRadius: 3,
  },
  workspacesList: {
    maxHeight: styleguide.gridbase * 30,
    overflowY: 'auto',
  },
  iconClosed: {
    transform: 'rotate(180deg)',
  },
  listItem: {
    borderBottom: `1px solid ${theme.background[300]}`,
    ':first-child': {
      borderTop: `1px solid ${theme.background[300]}`,
    },
  },
  workspaceItem: {
    alignItems: 'center',
    basedOn: [layout.row],
  },
  workspaceIcon: {
    marginRight: styleguide.gridbase * 0.5,
  },
  selectedWorkspace: {
    height: styleguide.gridbase * 4,
    padding: styleguide.gridbase * 0.5,
    width: '100%',
    basedOn: [layout.row, layout.centerCenter],
  },
}));

const useStrings = createUseStrings(localization);

export function WorkspaceItem({
  workspace,
  className,
}: {
  workspace: VertexManager<Workspace>;
  className?: string;
}) {
  const styles = useStyles();
  const { name } = usePartialVertex(workspace, ['name']);

  return (
    <div className={cn(styles.workspaceItem, className)}>
      <WorkspaceIcon
        workspaceManager={workspace}
        className={cn(styles.workspaceIcon)}
        size={styleguide.gridbase * 3}
      />
      <Text>{name}</Text>
    </div>
  );
}

interface WorkspacesDropdownProps {
  workspaces: VertexManager<Workspace>[];
  selectedWorkspace: VertexManager<Workspace>;
  setSelectedWorkspace: (ws: VertexManager<Workspace>) => void;
  className?: string;
  placeholder?: string;
}

export function WorkspacesDropdown({
  workspaces,
  selectedWorkspace,
  setSelectedWorkspace,
  className,
  placeholder,
}: WorkspacesDropdownProps) {
  const styles = useStyles();
  const { chooseWorkspace } = useStrings();
  const noSelection = placeholder || chooseWorkspace;
  const renderSelected = ({ isOpen }: { isOpen: boolean }) => {
    if (!selectedWorkspace) {
      return (
        <div className={cn(styles.selectedWorkspace)}>
          <div className={cn(styles.workspaceItem, layout.flexSpacer)}>
            <Text>{noSelection}</Text>
          </div>
          <IconDropDownArrow className={cn(!isOpen && styles.iconClosed)} />
        </div>
      );
    }
    return (
      <div className={cn(styles.selectedWorkspace)}>
        <WorkspaceItem
          workspace={selectedWorkspace}
          className={cn(layout.flexSpacer)}
        />
        <IconDropDownArrow className={cn(!isOpen && styles.iconClosed)} />
      </div>
    );
  };
  return (
    <DropDown
      value={selectedWorkspace}
      className={cn(styles.workspaces, className)}
      popupClassName={cn(styles.workspacesList)}
      position="top"
      align="end"
      direction="in"
      sizeByButton={true}
      onChange={(ws: VertexManager<Workspace>) => setSelectedWorkspace(ws)}
      renderSelected={renderSelected}
    >
      {workspaces.map(ws => (
        <DropDownItem key={ws.key} value={ws} className={cn(styles.listItem)}>
          <WorkspaceItem workspace={ws} />
        </DropDownItem>
      ))}
    </DropDown>
  );
}
