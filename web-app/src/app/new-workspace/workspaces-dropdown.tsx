import React from "react";
import { VertexManager } from "../../../../cfds/client/graph/vertex-manager.ts";
import { Workspace } from "../../../../cfds/client/graph/vertices/workspace.ts";
import { usePartialVertex } from "../../core/cfds/react/vertex.ts";
import { createUseStrings } from "../../core/localization/index.tsx";
import WorkspaceIcon from "../../shared/workspace-icon/index.tsx";

import { layout, styleguide } from "../../../../styles/index.ts";
import { IconDropDownArrow } from "../../../../styles/components/icons/index.ts";
import DropDown, {
  DropDownItem,
} from "../../../../styles/components/inputs/drop-down.tsx";
// import { Text } from '../../../../styles/components/texts.tsx';
import { Text } from "../../../../styles/components/typography.tsx";
import { makeStyles, cn } from "../../../../styles/css-objects/index.ts";
import localization from "./new-workspace.strings.json" assert { type: "json" };
import { useSharedQuery } from "../../core/cfds/react/query.ts";

const useStyles = makeStyles((theme) => ({
  workspaces: {
    minWidth: styleguide.gridbase * 24,
    border: `1px solid ${theme.background.placeholderText}`,
    borderRadius: 3,
  },
  workspacesList: {
    maxHeight: styleguide.gridbase * 30,
    overflowY: "auto",
  },
  iconClosed: {
    transform: "rotate(180deg)",
  },
  listItem: {
    borderBottom: `1px solid ${theme.background[300]}`,
    ":first-child": {
      borderTop: `1px solid ${theme.background[300]}`,
    },
  },
  workspaceItem: {
    alignItems: "center",
    basedOn: [layout.row],
  },
  workspaceIcon: {
    marginRight: styleguide.gridbase * 0.5,
  },
  selectedWorkspace: {
    height: styleguide.gridbase * 4,
    padding: styleguide.gridbase * 0.5,
    width: "100%",
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
  const { name } = usePartialVertex(workspace, ["name"]);

  return (
    <div className={cn(styles.workspaceItem, className)}>
      <WorkspaceIcon
        workspaceManager={workspace}
        className={cn(styles.workspaceIcon)}
        size={styleguide.gridbase * 3}
      />
      <Text>{name} </Text>
    </div>
  );
}

interface WorkspacesDropdownProps {
  allWorkspaces: readonly VertexManager<Workspace>[];
  setWorkspace: (ws: VertexManager<Workspace> | undefined) => void;
  workspace: VertexManager<Workspace> | undefined;
  className?: string;
  placeholder?: string;
}

export function WorkspacesDropdown({
  allWorkspaces,
  setWorkspace,
  workspace,
  className,
  placeholder,
}: WorkspacesDropdownProps) {
  const styles = useStyles();
  const { chooseWorkspace } = useStrings();
  const noSelection = placeholder || chooseWorkspace;
  const renderSelected = ({ isOpen }: { isOpen: boolean }) => {
    if (!workspace) {
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
          workspace={workspace!}
          className={cn(layout.flexSpacer)}
        />
        <IconDropDownArrow className={cn(!isOpen && styles.iconClosed)} />
      </div>
    );
  };
  return (
    <DropDown
      value={workspace}
      className={cn(styles.workspaces, className)}
      popupClassName={cn(styles.workspacesList)}
      position="top"
      align="end"
      direction="in"
      sizeByButton={true}
      onChange={(ws: VertexManager<Workspace>) => setWorkspace(ws)}
      renderSelected={renderSelected}
    >
      {allWorkspaces.map((ws) => (
        <DropDownItem
          key={`ws-dropdown/${ws.key}`}
          value={ws}
          className={cn(styles.listItem)}
        >
          <WorkspaceItem workspace={ws} />
        </DropDownItem>
      ))}
    </DropDown>
  );
}
